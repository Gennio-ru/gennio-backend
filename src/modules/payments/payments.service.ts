// src/modules/payments/payments.service.ts
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

import { RobokassaClient } from "./robokassa.client";

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
    private readonly robokassa: RobokassaClient,
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
  private mapRobokassaStateCode(code: number): PaymentStatus {
    // по документации Robokassa (OpStateExt):
    // 5 - операция только инициализирована
    // 10 - операция отменена
    // 20 - операция находится в стадии HOLD
    // 50 - операция обрабатывается
    // 60 - платеж подтвержден, но средства не зачислены (возвращены)
    // 80 - операция приостановлена
    // 100 - операция выполнена успешно
    switch (code) {
      case 5:
      case 50:
        return PaymentStatus.PENDING;
      case 20:
        return PaymentStatus.WAITING_FOR_CAPTURE;
      case 10:
        return PaymentStatus.CANCELED;
      case 100:
        return PaymentStatus.SUCCEEDED;
      case 60:
      case 80:
        return PaymentStatus.ERROR;
      default:
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Robokassa InvId должен быть целым.
   * Делаем простой генератор на базе epoch seconds + проверка коллизий.
   * (2025 год — epoch seconds < 2_147_483_647, так что влезает в int32)
   */
  private async allocateRobokassaInvId(): Promise<number> {
    const maxInt32 = 2_147_483_647;
    let invId = Math.floor(Date.now() / 1000);

    if (invId > maxInt32) invId = invId % maxInt32;

    for (let i = 0; i < 50; i++) {
      const candidate = invId + i;
      if (candidate > maxInt32) break;

      const exists = await this.paymentsRepo.exist({
        where: { provider: "robokassa", providerPaymentId: String(candidate) },
      });

      if (!exists) return candidate;
    }

    throw new Error("Failed to allocate unique RoboKassa InvId");
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
          qb.andWhere("payment.status = :status", { status: query.status });
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
  // Создание платежа (пакет токенов)
  //
  async createTokensPackPayment(opts: {
    userId: string;
    packId: TokensPackId;
    returnPath?: string;
  }) {
    const pack = TOKEN_PACKS[opts.packId];
    if (!pack)
      throw new NotFoundException(`Unknown tokens pack id: ${opts.packId}`);

    const user = await this.usersService.findById(opts.userId);
    if (!user) throw new NotFoundException(`User not found: ${opts.userId}`);

    const invId = await this.allocateRobokassaInvId();
    const amountValue = pack.priceRub.toFixed(2);

    const meta: TokensPackPaymentMeta = {
      kind: "TOKENS_PACK",
      packId: pack.id,
      tokens: pack.tokens,
      priceRub: pack.priceRub,
    };

    const payment = this.paymentsRepo.create({
      userId: opts.userId,
      amount: amountValue,
      currency: "RUB",
      provider: "robokassa",
      providerPaymentId: String(invId), // ← InvId RoboKassa
      status: PaymentStatus.PENDING,
      description: pack.name,
      meta,
    });

    await this.paymentsRepo.save(payment);

    const safeReturnPath =
      opts.returnPath && opts.returnPath.startsWith("/")
        ? opts.returnPath
        : "/";

    const successUrl = `${this.frontendUrl}${safeReturnPath}?modal=payment-result&paymentId=${payment.id}`;
    const failUrl = `${this.frontendUrl}${safeReturnPath}?modal=payment-result&paymentId=${payment.id}&fail=1`;

    let rkPayment;
    try {
      rkPayment = await this.robokassa.createPayment({
        amount: pack.priceRub,
        invId,
        description: pack.name,
        successUrl,
        failUrl,
        email: user.email || undefined,
        shp: {
          paymentId: payment.id,
          kind: "TOKENS_PACK",
          packId: pack.id,
        },
      });
    } catch (err: any) {
      this.logger.error(
        `RoboKassa createPayment failed: ${err?.message ?? err}`
      );

      throw new InternalServerErrorException({
        handled: false,
        code: ErrorCode.PAYMENT_FAILED,
        message: err?.message ?? "Robokassa createPayment failed",
      });
    }

    payment.confirmationUrl = rkPayment.paymentUrl;
    payment.providerPayload = rkPayment;

    await this.paymentsRepo.save(payment);
    return payment;
  }

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

  //
  // ✅ ВЕБХУК RoboKassa (ResultURL)
  //
  // payload обычно application/x-www-form-urlencoded:
  // OutSum=...&InvId=...&SignatureValue=...&Shp_paymentId=...&...
  //
  // Ответ должен быть: "OK{InvId}"
  //
  async handleRobokassaResult(payload: Record<string, any>): Promise<string> {
    // --- 0) определяем тип входа ---
    // ResultURL (старый): есть SignatureValue и OutSum/InvId
    // ResultUrl2 (JWS): у тебя прилетает уже нормализованный объект
    // { invId, incSum, state, opKey, rawJws, rawPayload } из контроллера
    const isJws = !!payload.rawJws || (!!payload.incSum && !!payload.invId);

    // --- 1) проверка подписи / целостности ---
    if (!isJws) {
      // это обычный ResultURL → MD5 обязателен
      const okSig = this.robokassa.verifyResultSignature(payload);
      if (!okSig) {
        this.logger.warn(
          `Robokassa webhook: invalid signature, payload=${JSON.stringify(
            payload
          )}`
        );
        // ВАЖНО: если хочешь, чтобы они НЕ ретраили при невалидной подписи,
        // можно вернуть OK, но это дырка. Обычно оставляют 400.
        throw new BadRequestException("Invalid Robokassa signature");
      }
    } else {
      // это ResultUrl2 (JWS)
      // По доке: проверка JWS сертификатом НЕ обязательна.
      // Поэтому здесь минимум: state == OK + дальше amount check + processedAt.
      const state = String(payload.state ?? "OK").toUpperCase();
      if (state !== "OK") {
        this.logger.warn(
          `Robokassa result2: state is not OK, invId=${payload.invId}, state=${state}`
        );
        return `OK${payload.invId ?? ""}`;
      }
    }

    // --- 2) нормализуем invId/outSum ---
    const invId = Number(payload.InvId ?? payload.invId);
    const outSumNum = Number(
      payload.OutSum ?? payload.outSum ?? payload.incSum
    );

    if (!Number.isFinite(invId) || !Number.isFinite(outSumNum)) {
      throw new BadRequestException("Invalid OutSum/InvId");
    }

    // --- 3) ищем платеж: сперва по Shp_paymentId (если есть), иначе по invId ---
    const paymentIdFromShp =
      payload.Shp_paymentId ??
      payload.Shp_paymentID ??
      payload.Shp_PaymentId ??
      payload.shp?.paymentId ?? // если ты прокинул nested
      null;

    let payment: PaymentEntity | null = null;

    if (paymentIdFromShp) {
      payment = await this.paymentsRepo.findOne({
        where: { id: String(paymentIdFromShp) },
      });
    }

    if (!payment) {
      payment = await this.paymentsRepo.findOne({
        where: { provider: "robokassa", providerPaymentId: String(invId) },
      });
    }

    if (!payment) {
      this.logger.warn(
        `Robokassa webhook: payment not found for InvId=${invId}`
      );
      // ✅ лучше всегда OK, иначе ретраи бесконечные
      return `OK${invId}`;
    }

    // --- 4) обновляем providerPayload/статус ---
    payment.providerPayload = payload;
    payment.status = PaymentStatus.SUCCEEDED;
    payment.capturedAt = new Date();

    // --- 5) начисление токенов (как у тебя) ---
    const meta = payment.meta as TokensPackPaymentMeta | null;

    if (!meta || meta.kind !== "TOKENS_PACK") {
      this.logger.warn(
        `Payment ${payment.id} succeeded (robokassa) but has no TOKENS_PACK meta`
      );
    } else {
      if (payment.processedAt) {
        this.logger.log(
          `Payment ${payment.id} already processed at ${payment.processedAt}, skipping`
        );
      } else {
        const expectedAmount = Number(meta.priceRub);
        const actualAmount = Number(outSumNum);

        if (Math.abs(expectedAmount - actualAmount) > 0.001) {
          this.logger.error(
            `Payment ${payment.id}: amount mismatch, expected=${expectedAmount}, actual=${actualAmount}`
          );
          payment.status = PaymentStatus.ERROR;
          payment.errorCode = "AMOUNT_MISMATCH";
          payment.errorMessage = `Expected ${expectedAmount}, got ${actualAmount}`;
        } else if (!payment.userId) {
          this.logger.error(
            `Payment ${payment.id} has no userId, cannot credit tokens`
          );
        } else {
          await this.userTokenTransactionService.addTokens({
            userId: payment.userId,
            tokens: meta.tokens,
            reason: TokenTransactionReason.PaymentPurchase,
            meta: {
              paymentId: payment.id,
              packId: meta.packId,
              invId,
            },
          });

          payment.tokensPurchased = meta.tokens;
          payment.tokensRefunded = payment.tokensRefunded ?? 0;
          payment.processedAt = new Date();
        }
      }
    }

    await this.paymentsRepo.save(payment);
    this.paymentsGateway.sendPaymentUpdate(payment);

    return `OK${invId}`;
  }

  //
  // Отмена платежа (локально)
  //
  async cancelPayment(paymentId: string) {
    const payment = await this.getPaymentById(paymentId);

    if (payment.status === PaymentStatus.SUCCEEDED) {
      throw new BadRequestException("Cannot cancel succeeded payment");
    }

    payment.status = PaymentStatus.CANCELED;
    payment.canceledAt = new Date();
    await this.paymentsRepo.save(payment);

    this.paymentsGateway.sendPaymentUpdate(payment);
    return payment;
  }

  //
  // РЕФАНДЫ (денежные) — через gateway (см robokassa.client.ts)
  //
  async requestRefund(opts: {
    paymentId: string;
    amount?: number;
    description?: string;
  }) {
    const payment = await this.getPaymentById(opts.paymentId);

    if (payment.provider !== "robokassa") {
      throw new Error(`Unsupported provider: ${payment.provider}`);
    }

    const invId = Number(payment.providerPaymentId);
    if (!Number.isFinite(invId))
      throw new Error("Invalid providerPaymentId(invId)");

    // получаем opKey из OpStateExt
    const op = await this.robokassa.getPayment(invId);
    if (!op.opKey)
      throw new Error("Robokassa opKey not found (need OpStateExt)");

    const fullAmount = Number(payment.amount);
    const amountToRefund =
      typeof opts.amount === "number" ? opts.amount : fullAmount;

    if (amountToRefund <= 0) throw new Error("Refund amount must be positive");

    const refund = await this.robokassa.refundPayment({
      opKey: op.opKey,
      refundSum: amountToRefund,
      comment: opts.description,
      metadata: {
        paymentId: payment.id,
        kind: (payment.meta as any)?.kind ?? "UNKNOWN",
      },
    });

    this.logger.log(
      `Refund requested for payment ${payment.id}, invId=${invId}, amount=${amountToRefund}`
    );

    return refund;
  }

  //
  // Кастомный частичный рефанд по токенам (деньгами + последующее списание токенов по webhook/логике)
  //
  async requestTokensRefund(opts: {
    paymentId: string;
    tokens: number;
    description?: string;
  }) {
    const preview = await this.getTokensRefundPreview(opts.paymentId);

    if (preview.maxTokensToRefund <= 0)
      throw new Error("Nothing left to refund for this payment");
    if (opts.tokens <= 0) throw new Error("Refund tokens must be positive");
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

    const invId = Number(payment.providerPaymentId);
    if (!Number.isFinite(invId))
      throw new Error("Invalid providerPaymentId(invId)");

    const op = await this.robokassa.getPayment(invId);
    if (!op.opKey)
      throw new Error("Robokassa opKey not found (need OpStateExt)");

    const refund = await this.robokassa.refundPayment({
      opKey: op.opKey,
      refundSum: amountToRefund,
      comment: opts.description,
      metadata: {
        paymentId: payment.id,
        kind: (payment.meta as any)?.kind ?? "TOKENS_PACK",
        tokensToRefund,
      },
    });

    this.logger.log(
      `Refund requested (tokens) for payment ${payment.id}, invId=${invId}, tokens=${tokensToRefund}, amount=${amountToRefund}`
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
