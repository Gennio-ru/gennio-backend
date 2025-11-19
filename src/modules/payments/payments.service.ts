import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentEntity } from "./payments.entity";
import { PaymentStatus } from "./types/payments.enum";
import { YookassaClient } from "./yookassa.client";
import {
  TOKEN_PACKS,
  TokensPackId,
} from "../pricing/configs/token-packs.config";
import { TokensPackPaymentMeta } from "./types/payments.enum";
import { TokensService } from "../tokens/tokens.service";
import { TokenTransactionReason } from "../tokens/types/tokens.enum";
import { ConfigService } from "@nestjs/config";
import { PaymentsGateway } from "./payments.gateway";

@Injectable()
export class PaymentsService {
  private readonly frontendUrl: string;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepo: Repository<PaymentEntity>,
    private readonly yookassa: YookassaClient,
    private readonly tokensService: TokensService,
    private readonly configService: ConfigService,
    private readonly paymentsGateway: PaymentsGateway
  ) {
    this.frontendUrl = this.configService.get<string>("FRONTEND_URL")!;
  }

  private mapYookassaStatus(status: string): PaymentStatus {
    switch (status) {
      case "pending":
        return PaymentStatus.PENDING;
      case "waiting_for_capture":
        return PaymentStatus.WAITING_FOR_CAPTURE;
      case "succeeded":
        return PaymentStatus.SUCCEEDED;
      case "canceled":
        return PaymentStatus.CANCELED;
      case "refunded":
        return PaymentStatus.REFUNDED;
      default:
        return PaymentStatus.ERROR;
    }
  }

  /**
   * Создать платёж за пакет токенов по packId (одностадийный, capture: true)
   */
  async createTokensPackPayment(opts: {
    userId: string;
    packId: TokensPackId;
    returnPath?: string;
  }) {
    const pack = TOKEN_PACKS[opts.packId];
    if (!pack) {
      throw new NotFoundException(`Unknown tokens pack id: ${opts.packId}`);
    }

    const meta: TokensPackPaymentMeta = {
      kind: "TOKENS_PACK",
      packId: pack.id,
      tokens: pack.tokens,
      priceRub: pack.priceRub,
      generations: pack.generations,
      discountPercent: pack.discountPercent,
    };

    const payment = this.paymentsRepo.create({
      userId: opts.userId,
      amount: pack.priceRub.toFixed(2),
      currency: "RUB",
      provider: "yookassa",
      status: PaymentStatus.PENDING,
      description: pack.name,
      meta,
    });

    await this.paymentsRepo.save(payment);

    const safeReturnPath =
      opts.returnPath && opts.returnPath.startsWith("/")
        ? opts.returnPath
        : "/";

    const returnUrl = `${this.frontendUrl}${safeReturnPath}?modal=payment-result&paymentId=${payment.id}`;

    const yoPayment = await this.yookassa.createPayment({
      amount: pack.priceRub,
      description: pack.name,
      returnUrl,
      metadata: {
        paymentId: payment.id,
        kind: "TOKENS_PACK",
        packId: pack.id,
      },
      capture: true,
    });

    payment.providerPaymentId = yoPayment.id;
    payment.confirmationUrl = yoPayment.confirmation?.confirmation_url ?? null;
    payment.providerPayload = yoPayment;
    payment.status = this.mapYookassaStatus(yoPayment.status);

    await this.paymentsRepo.save(payment);

    return payment;
  }

  /**
   * Универсальный произвольный платёж (также capture: true)
   */
  async createPayment(opts: {
    userId: string | null;
    amount: number;
    description?: string;
    meta?: any;
    returnPath?: string;
  }) {
    const payment = this.paymentsRepo.create({
      userId: opts.userId,
      amount: opts.amount.toFixed(2),
      currency: "RUB",
      provider: "yookassa",
      status: PaymentStatus.PENDING,
      description: opts.description ?? "Оплата в Gennio",
      meta: opts.meta ?? null,
    });

    await this.paymentsRepo.save(payment);

    const safeReturnPath =
      opts.returnPath && opts.returnPath.startsWith("/")
        ? opts.returnPath
        : "/";

    const returnUrl = `${this.frontendUrl}${safeReturnPath}?modal=payment-result&paymentId=${payment.id}`;

    const yoPayment = await this.yookassa.createPayment({
      amount: opts.amount,
      description: payment.description ?? undefined,
      returnUrl,
      metadata: {
        paymentId: payment.id,
      },
      capture: true,
    });

    payment.providerPaymentId = yoPayment.id;
    payment.confirmationUrl = yoPayment.confirmation?.confirmation_url ?? null;
    payment.providerPayload = yoPayment;
    payment.status = this.mapYookassaStatus(yoPayment.status);

    await this.paymentsRepo.save(payment);

    return payment;
  }

  async getPaymentById(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentsRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException("Payment not found");
    return payment;
  }

  async getUserPayments(userId: string, limit = 20): Promise<PaymentEntity[]> {
    return this.paymentsRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * Главный вход для вебхука YooKassa
   */
  async handleYookassaWebhook(body: any) {
    const event = body.event as string;
    const obj = body.object;

    if (event.startsWith("payment.")) {
      return this.handlePaymentEvent(event, obj);
    }

    if (event.startsWith("refund.")) {
      return this.handleRefundEvent(event, obj);
    }

    this.logger.warn(`Unknown YooKassa event: ${event}`);
    return;
  }

  /**
   * Обработка payment.* событий
   * При capture: true основное событие — payment.succeeded
   */
  private async handlePaymentEvent(event: string, obj: any) {
    const yoPaymentId: string = obj.id;
    const yoStatus: string = obj.status;

    let payment: PaymentEntity | null = null;

    if (obj.metadata?.paymentId) {
      payment = await this.paymentsRepo.findOne({
        where: { id: obj.metadata.paymentId },
      });
    }

    if (!payment) {
      payment = await this.paymentsRepo.findOne({
        where: { providerPaymentId: yoPaymentId },
      });
    }

    if (!payment) {
      this.logger.warn(
        `Payment for YooKassa id=${yoPaymentId} not found, event=${event}`
      );
      return;
    }

    payment.providerPayload = obj;
    payment.status = this.mapYookassaStatus(yoStatus);

    switch (event) {
      case "payment.waiting_for_capture":
        // Для capture: true по идее сюда не попадём, но оставим на всякий случай
        this.logger.log(
          `Payment ${payment.id} in waiting_for_capture, but we use capture=true`
        );
        break;

      case "payment.succeeded": {
        payment.capturedAt = new Date(obj.captured_at ?? new Date());

        const meta = payment.meta as TokensPackPaymentMeta | null;

        if (!meta || meta.kind !== "TOKENS_PACK") {
          this.logger.warn(
            `Payment ${payment.id} succeeded but has no TOKENS_PACK meta`
          );
          break;
        }

        // уже обработали доменную логику — ничего не делаем
        if (payment.processedAt) {
          this.logger.log(
            `Payment ${payment.id} already processed at ${payment.processedAt}, skipping`
          );
          break;
        }

        // проверяем сумму
        const expectedAmount = Number(meta.priceRub);
        const actualAmount = Number(obj.amount?.value ?? 0);

        if (Math.abs(expectedAmount - actualAmount) > 0.001) {
          this.logger.error(
            `Payment ${payment.id}: amount mismatch, expected=${expectedAmount}, actual=${actualAmount}`
          );
          payment.status = PaymentStatus.ERROR;
          payment.errorCode = "AMOUNT_MISMATCH";
          payment.errorMessage = `Expected ${expectedAmount}, got ${actualAmount}`;
          break;
        }

        if (!payment.userId) {
          this.logger.error(
            `Payment ${payment.id} has no userId, cannot credit tokens`
          );
          break;
        }

        await this.tokensService.addTokens({
          userId: payment.userId,
          tokens: meta.tokens,
          reason: TokenTransactionReason.Purchase,
          meta: {
            paymentId: payment.id,
            packId: meta.packId,
          },
        });

        payment.processedAt = new Date();
        break;
      }

      case "payment.canceled":
        payment.canceledAt = new Date(obj.canceled_at ?? new Date());
        payment.errorCode = obj.cancellation_details?.reason ?? null;
        payment.errorMessage =
          obj.cancellation_details?.party ??
          obj.cancellation_details?.reason ??
          null;
        break;
    }

    await this.paymentsRepo.save(payment);

    this.paymentsGateway.sendPaymentUpdate(payment);

    return payment;
  }

  /**
   * Обработка refund.* событий
   */
  private async handleRefundEvent(event: string, obj: any) {
    const refundId: string = obj.id;
    const paymentIdFromYoo: string = obj.payment_id;

    const payment = await this.paymentsRepo.findOne({
      where: { providerPaymentId: paymentIdFromYoo },
    });

    if (!payment) {
      this.logger.warn(
        `Refund ${refundId}: payment with providerPaymentId=${paymentIdFromYoo} not found`
      );
      return;
    }

    switch (event) {
      case "refund.succeeded": {
        if (payment.refundedAt) {
          this.logger.log(
            `Refund ${refundId} for payment ${payment.id} already processed at ${payment.refundedAt}, skipping`
          );
          break;
        }

        payment.refundedAt = new Date(obj.created_at ?? new Date());
        payment.status = PaymentStatus.REFUNDED;
        payment.refundedAmount = obj.amount?.value ?? null;

        const meta = payment.meta as TokensPackPaymentMeta | null;

        if (meta?.kind === "TOKENS_PACK" && payment.userId) {
          try {
            await this.tokensService.chargeForJob({
              userId: payment.userId,
              tokens: meta.tokens,
              reason: TokenTransactionReason.ManualSubtract,
              meta: {
                paymentId: payment.id,
                packId: meta.packId,
                refundId,
              },
            });
          } catch (e) {
            this.logger.error(
              `Failed to subtract tokens for refund ${refundId} payment=${
                payment.id
              }: ${(e as Error).message}`
            );
          }
        }

        break;
      }
    }

    await this.paymentsRepo.save(payment);
    return payment;
  }

  /**
   * capturePayment по сути нужен только для старых/двухстадийных платежей.
   * Для новых (capture: true) не используется, но пусть живёт для совместимости.
   */
  async capturePayment(paymentId: string) {
    const payment = await this.getPaymentById(paymentId);
    if (!payment.providerPaymentId) {
      throw new Error("No providerPaymentId");
    }

    const yoPayment = await this.yookassa.capturePayment(
      payment.providerPaymentId
    );

    payment.providerPayload = yoPayment;
    payment.status = this.mapYookassaStatus(yoPayment.status);
    if (yoPayment.status === "succeeded") {
      payment.capturedAt = new Date(yoPayment.captured_at ?? new Date());
    }

    await this.paymentsRepo.save(payment);
    return payment;
  }

  async cancelPayment(paymentId: string) {
    const payment = await this.getPaymentById(paymentId);
    if (!payment.providerPaymentId) {
      throw new Error("No providerPaymentId");
    }

    const yoPayment = await this.yookassa.cancelPayment(
      payment.providerPaymentId
    );

    payment.providerPayload = yoPayment;
    payment.status = this.mapYookassaStatus(yoPayment.status);
    payment.canceledAt = new Date(yoPayment.canceled_at ?? new Date());

    await this.paymentsRepo.save(payment);
    return payment;
  }

  /**
   * Запрос рефанда. Статус REFUNDED и списание токенов будут обработаны
   * вебхуком refund.succeeded.
   */
  async requestRefund(opts: {
    paymentId: string;
    amount?: number;
    description?: string;
  }) {
    const payment = await this.getPaymentById(opts.paymentId);

    if (!payment.providerPaymentId) {
      throw new Error("No providerPaymentId to refund");
    }

    const fullAmount = Number(payment.amount);
    const amountToRefund =
      typeof opts.amount === "number" ? opts.amount : fullAmount;

    if (amountToRefund <= 0) {
      throw new Error("Refund amount must be positive");
    }

    const refund = await this.yookassa.refundPayment({
      paymentId: payment.providerPaymentId,
      amount: amountToRefund,
      description: opts.description,
      metadata: {
        paymentId: payment.id,
        kind: (payment.meta as any)?.kind ?? "UNKNOWN",
      },
    });

    this.logger.log(
      `Refund requested for payment ${payment.id}, refundId=${refund.id}, amount=${amountToRefund}`
    );

    return refund;
  }
}
