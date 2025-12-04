import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentEntity } from "./payments.entity";
import { PaymentStatus } from "./types/payments.enum";
import { YookassaClient, YookassaReceipt } from "./yookassa.client";
import {
  TOKEN_PACKS,
  TokensPackId,
} from "../pricing/configs/token-packs.config";
import { TokensPackPaymentMeta } from "./types/payments.enum";
import { UserTokenTransactionService } from "../tokens/user-token-transactions.service";
import { TokenTransactionReason } from "../tokens/types/user-token-transactions.enum";
import { ConfigService } from "@nestjs/config";
import { PaymentsGateway } from "./payments.gateway";
import { FindPaymentsDto } from "./dto/find-payments.dto";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import { paginate } from "src/common/pagination/pagination.util";
import { PaymentFullDto } from "./dto/payments.dto";
import { UsersService } from "../users/users.service";
import { ErrorCode } from "src/common/errors/error-code.enum";

@Injectable()
export class PaymentsService {
  private readonly frontendUrl: string;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepo: Repository<PaymentEntity>,
    private readonly yookassa: YookassaClient,
    private readonly userTokenTransactionService: UserTokenTransactionService,
    private readonly configService: ConfigService,
    private readonly paymentsGateway: PaymentsGateway,
    private readonly usersService: UsersService
  ) {
    this.frontendUrl = this.configService.get<string>("FRONTEND_URL")!;
  }

  //
  // Вспомогательное
  //
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

  //
  // Поиск / список
  //
  async findMany(
    query: FindPaymentsDto
  ): Promise<PaginationResult<PaymentFullDto>> {
    return paginate<PaymentEntity>(
      this.paymentsRepo,
      query,
      "payment",
      (qb) => {
        qb.leftJoinAndSelect("payment.user", "user");

        if (query.search) {
          const s = `%${query.search.toLowerCase()}%`;

          qb.andWhere(
            `(LOWER(payment.providerPaymentId) LIKE :s
              OR LOWER(payment.description) LIKE :s
              OR LOWER(user.email) LIKE :s)`,
            { s }
          );
        }

        if (query.status) {
          qb.andWhere("payment.status = :status", {
            status: query.status,
          });
        }

        if (query.createdFrom) {
          qb.andWhere(
            `(payment.createdAt AT TIME ZONE 'Europe/Moscow')::date >= :fromDate`,
            { fromDate: query.createdFrom }
          );
        }

        if (query.createdTo) {
          qb.andWhere(
            `(payment.createdAt AT TIME ZONE 'Europe/Moscow')::date <= :toDate`,
            { toDate: query.createdTo }
          );
        }

        qb.orderBy("payment.createdAt", "DESC");
      }
    );
  }

  //
  // Создание платежей
  //
  async createTokensPackPayment(opts: {
    userId: string;
    packId: TokensPackId;
    returnPath?: string;
  }) {
    const pack = TOKEN_PACKS[opts.packId];
    if (!pack) {
      throw new NotFoundException(`Unknown tokens pack id: ${opts.packId}`);
    }

    const user = await this.usersService.findById(opts.userId);

    if (!user) {
      throw new NotFoundException(`User not found: ${opts.userId}`);
    }

    const amountValue = pack.priceRub.toFixed(2);

    const meta: TokensPackPaymentMeta = {
      kind: "TOKENS_PACK",
      packId: pack.id,
      tokens: pack.tokens,
      priceRub: pack.priceRub,
      generations: pack.generations,
    };

    const payment = this.paymentsRepo.create({
      userId: opts.userId,
      amount: amountValue, // строка "350.00"
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

    // Собираем чек под YooKassa
    const receipt: YookassaReceipt = {
      customer: {},
      items: [
        {
          description: pack.name, // "Пакет 50 токенов"
          quantity: "1.00",
          amount: {
            value: amountValue,
            currency: "RUB",
          },
          vat_code: 1,
          payment_mode: "full_prepayment",
          payment_subject: "service",
        },
      ],
    };

    if (user.email) {
      receipt.customer!.email = user.email;
    }
    if (user.phone) {
      receipt.customer!.phone = user.phone;
    }
    // Если ни email, ни phone нет — убираем customer, чтобы не слать пустой объект
    if (!receipt.customer!.email && !receipt.customer!.phone) {
      delete receipt.customer;
    }

    let yoPayment;

    try {
      yoPayment = await this.yookassa.createPayment({
        amount: pack.priceRub,
        description: pack.name,
        returnUrl,
        metadata: {
          paymentId: payment.id,
          kind: "TOKENS_PACK",
          packId: pack.id,
        },
        capture: true,
        receipt,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      this.logger.error(
        `YooKassa createPayment failed: ${status} ${JSON.stringify(data)}`
      );

      if (status && status >= 400 && status < 500) {
        throw new BadRequestException({
          handled: true,
          code: ErrorCode.PAYMENT_PROVIDER_ERROR,
          providerCode: data?.code,
          providerMessage: data?.description,
          providerParameter: data?.parameter,
        });
      }

      throw new InternalServerErrorException({
        handled: false,
        code: ErrorCode.PAYMENT_FAILED,
        message: err.message,
      });
    }

    payment.providerPaymentId = yoPayment.id;
    payment.confirmationUrl = yoPayment.confirmation?.confirmation_url ?? null;
    payment.providerPayload = yoPayment;
    payment.status = this.mapYookassaStatus(yoPayment.status);

    await this.paymentsRepo.save(payment);

    return payment;
  }

  // async createPayment(opts: {
  //   userId: string;
  //   amount: number;
  //   description?: string;
  //   meta?: any;
  //   returnPath?: string;
  // }) {
  //   const payment = this.paymentsRepo.create({
  //     userId: opts.userId,
  //     amount: opts.amount.toFixed(2),
  //     currency: "RUB",
  //     provider: "yookassa",
  //     status: PaymentStatus.PENDING,
  //     description: opts.description ?? "Оплата в Gennio",
  //     meta: opts.meta ?? null,
  //   });

  //   await this.paymentsRepo.save(payment);

  //   const safeReturnPath =
  //     opts.returnPath && opts.returnPath.startsWith("/")
  //       ? opts.returnPath
  //       : "/";

  //   const returnUrl = `${this.frontendUrl}${safeReturnPath}?modal=payment-result&paymentId=${payment.id}`;

  //   const yoPayment = await this.yookassa.createPayment({
  //     amount: opts.amount,
  //     description: payment.description ?? undefined,
  //     returnUrl,
  //     metadata: {
  //       paymentId: payment.id,
  //     },
  //     capture: true,
  //   });

  //   payment.providerPaymentId = yoPayment.id;
  //   payment.confirmationUrl = yoPayment.confirmation?.confirmation_url ?? null;
  //   payment.providerPayload = yoPayment;
  //   payment.status = this.mapYookassaStatus(yoPayment.status);

  //   await this.paymentsRepo.save(payment);

  //   return payment;
  // }

  //
  // Геттеры
  //
  async getPaymentById(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentsRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException("Payment not found");
    return payment;
  }

  async getFullPaymentById(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentsRepo.findOne({
      where: { id },
      relations: ["user"],
    });
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

  //
  // Вебхук от YooKassa
  //
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

        // 🔒 защита от повторной доменной обработки (но не полная, см. TokensService)
        if (payment.processedAt) {
          this.logger.log(
            `Payment ${payment.id} already processed at ${payment.processedAt}, skipping`
          );
          break;
        }

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

        // начисляем токены (идемпотентность закрываем в TokensService)
        await this.userTokenTransactionService.addTokens({
          userId: payment.userId,
          tokens: meta.tokens,
          reason: TokenTransactionReason.PaymentPurchase,
          meta: {
            paymentId: payment.id,
            packId: meta.packId,
          },
        });

        payment.tokensPurchased = meta.tokens;
        payment.tokensRefunded = payment.tokensRefunded ?? 0;
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
        const refundMeta = obj.metadata || {};
        const meta = payment.meta as TokensPackPaymentMeta | null;

        // базовые поля рефанда
        payment.refundedAmount = obj.amount?.value ?? null;
        payment.refundedAt = new Date(obj.created_at ?? new Date());
        payment.status = PaymentStatus.REFUNDED;

        // если это не пакет токенов — просто сохраняем стейт
        if (!meta || meta.kind !== "TOKENS_PACK" || !payment.userId) {
          break;
        }

        // 🔒 защита от повторного списания по одному и тому же refundId
        const alreadyProcessed =
          refundId &&
          (await this.userTokenTransactionService.isRefundAlreadyProcessed(
            refundId
          ));

        if (alreadyProcessed) {
          this.logger.log(
            `Refund ${refundId} for payment ${payment.id} already processed in tokens, skipping`
          );
          break;
        }

        // считаем, сколько токенов надо вернуть
        const tokensPurchased = payment.tokensPurchased ?? meta.tokens;
        const tokensRefunded = payment.tokensRefunded ?? 0;
        const remainingByPayment = Math.max(
          0,
          tokensPurchased - tokensRefunded
        );

        let tokensToRefund: number | null = null;

        // 1) наш кастомный рефанд из админки
        if (typeof refundMeta.tokensToRefund === "number") {
          tokensToRefund = refundMeta.tokensToRefund;
        } else {
          // 2) рефанд напрямую из YooKassa (без metadata.tokensToRefund)
          const fullAmount = Number(payment.amount);
          const refundedAmount = Number(obj.amount?.value ?? 0);

          if (fullAmount > 0 && refundedAmount > 0 && tokensPurchased > 0) {
            const pricePerToken = fullAmount / tokensPurchased;
            tokensToRefund = Math.round(refundedAmount / pricePerToken);
          }
        }

        if (!tokensToRefund || tokensToRefund <= 0) {
          this.logger.log(
            `Refund ${refundId} for payment ${payment.id}: no positive tokensToRefund, skipping tokens logic`
          );
          break;
        }

        // не даём вернуть больше, чем осталось по этому платежу
        const cappedTokens = Math.max(
          0,
          Math.min(tokensToRefund, remainingByPayment)
        );

        if (cappedTokens <= 0) {
          this.logger.log(
            `Refund ${refundId} for payment ${payment.id}: nothing left to refund in tokens (remainingByPayment=${remainingByPayment})`
          );
          break;
        }

        try {
          await this.userTokenTransactionService.chargeForJob({
            userId: payment.userId,
            tokens: cappedTokens,
            reason: TokenTransactionReason.PaymentRefund,
            meta: {
              paymentId: payment.id,
              packId: meta.packId,
              refundId,
            },
          });

          payment.tokensRefunded = (payment.tokensRefunded ?? 0) + cappedTokens;
        } catch (e) {
          this.logger.error(
            `Failed to subtract tokens for refund ${refundId} payment=${
              payment.id
            }: ${(e as Error).message}`
          );
        }

        break;
      }
    }

    await this.paymentsRepo.save(payment);
    return payment;
  }

  //
  // capture/cancel
  //
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

  //
  // Рефанды по деньгам
  //
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

  //
  // Кастомный (частичный) рефанд по токенам
  //
  async requestTokensRefund(opts: {
    paymentId: string;
    tokens: number;
    description?: string;
  }) {
    const preview = await this.getTokensRefundPreview(opts.paymentId);

    if (preview.maxTokensToRefund <= 0) {
      throw new Error("Nothing left to refund for this payment");
    }

    if (opts.tokens <= 0) {
      throw new Error("Refund tokens must be positive");
    }

    if (opts.tokens > preview.maxTokensToRefund) {
      throw new Error(
        `Cannot refund more than ${preview.maxTokensToRefund} tokens`
      );
    }

    const tokensToRefund = opts.tokens;
    const amountToRefund = Number(
      (preview.pricePerToken * tokensToRefund).toFixed(2)
    );

    const payment = await this.getPaymentById(opts.paymentId);

    if (!payment.providerPaymentId) {
      throw new Error("No providerPaymentId to refund");
    }

    const refund = await this.yookassa.refundPayment({
      paymentId: payment.providerPaymentId,
      amount: amountToRefund,
      description: opts.description,
      metadata: {
        paymentId: payment.id,
        kind: (payment.meta as any)?.kind ?? "TOKENS_PACK",
        tokensToRefund,
      },
    });

    this.logger.log(
      `Refund requested (tokens) for payment ${payment.id}, refundId=${refund.id}, tokens=${tokensToRefund}, amount=${amountToRefund}`
    );

    return refund;
  }

  //
  // Превью рефанда токенов
  //
  async getTokensRefundPreview(paymentId: string) {
    const payment = await this.getFullPaymentById(paymentId);

    const meta = payment.meta as TokensPackPaymentMeta | null;
    if (!meta || meta.kind !== "TOKENS_PACK") {
      throw new Error("This payment is not a TOKENS_PACK");
    }

    if (!payment.userId || !payment.user) {
      throw new Error("Payment has no user");
    }

    const tokensPurchased = payment.tokensPurchased ?? meta.tokens;
    const tokensRefunded = payment.tokensRefunded ?? 0;
    const remainingByPayment = Math.max(0, tokensPurchased - tokensRefunded);

    const userBalance = Math.max(0, payment.user.tokens);

    const maxTokensToRefund = Math.max(
      0,
      Math.min(remainingByPayment, userBalance)
    );

    const fullAmount = Number(payment.amount);
    const pricePerToken =
      tokensPurchased > 0 ? fullAmount / tokensPurchased : 0;
    const maxAmountRub = Number((maxTokensToRefund * pricePerToken).toFixed(2));

    return {
      paymentId: payment.id,
      userId: payment.userId,
      tokensPurchased,
      tokensRefunded,
      remainingByPayment,
      userBalance,
      maxTokensToRefund,
      pricePerToken,
      maxAmountRub,
      currency: payment.currency,
    };
  }
}
