// src/modules/payments/dto/payment.dto.ts

import { ApiProperty } from "@nestjs/swagger";
import { IntersectionType } from "@nestjs/swagger";
import { BaseDto } from "src/common/base/base.dto";
import { IPayment, IPaymentBase } from "../types/payments.interface";
import { PaymentStatus } from "../types/payments.enum";
import {
  ICreatePayment,
  ICreateTokensPayment,
} from "../types/payments-mutations.interface";
import { TokensPackId } from "src/modules/pricing/configs/token-packs.config";

// =============================
// Base DTO
// =============================

export class PaymentBaseDto implements IPaymentBase {
  @ApiProperty({
    type: String,
    format: "uuid",
    nullable: true,
    description: "ID пользователя, который оплатил (или null)",
  })
  userId!: string | null;

  @ApiProperty({
    type: String,
    example: "199.00",
    description: "Сумма платежа (numeric хранится как строка)",
  })
  amount!: string;

  @ApiProperty({
    type: String,
    example: "RUB",
    description: "Валюта платежа",
  })
  currency!: string;

  @ApiProperty({
    type: String,
    example: "yookassa",
    description: "Платёжный провайдер",
  })
  provider!: string;

  @ApiProperty({
    type: String,
    example: "2fbb9a6b-000f-5000-8000-1e4b4c4d01e2",
    nullable: true,
    description: "ID платежа в YooKassa",
  })
  providerPaymentId!: string | null;

  @ApiProperty({
    enum: PaymentStatus,
    enumName: "PaymentStatus",
    description: "Текущий статус платежа",
  })
  status!: PaymentStatus;

  @ApiProperty({
    type: String,
    example: "https://yookassa.ru/checkout/...",
    nullable: true,
    description: "Ссылка на страницу оплаты в YooKassa",
  })
  confirmationUrl!: string | null;

  @ApiProperty({
    type: String,
    example: "Пакет 20 генераций",
    nullable: true,
    description: "Описание платежа",
  })
  description!: string | null;

  @ApiProperty({
    type: Object,
    nullable: true,
    description: "Сырой объект платежа от YooKassa",
  })
  providerPayload!: any | null;

  @ApiProperty({
    type: Object,
    nullable: true,
    description: "Наши внутренние данные (пакет токенов и др.)",
  })
  meta!: any | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    nullable: true,
    description: "Когда платеж был захвачен (capture)",
  })
  capturedAt!: Date | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    nullable: true,
  })
  canceledAt!: Date | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    nullable: true,
  })
  refundedAt!: Date | null;

  @ApiProperty({
    type: String,
    example: "199.00",
    nullable: true,
    description: "Сумма возврата",
  })
  refundedAmount!: string | null;

  @ApiProperty({
    type: String,
    example: "canceled_by_user",
    nullable: true,
    description: "Код ошибки от YooKassa",
  })
  errorCode!: string | null;

  @ApiProperty({
    type: String,
    example: "Отменено пользователем",
    nullable: true,
    description: "Текст ошибки",
  })
  errorMessage!: string | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    nullable: true,
    description: "Когда бизнес-логика была успешно выполнена",
  })
  processedAt!: Date | null;
}

// =============================
// Webhook Response DTO
// =============================

export class YookassaWebhookResponseDto {
  @ApiProperty({
    type: Boolean,
    example: true,
    description: "Webhook успешно принят",
  })
  accepted!: boolean;
}

// =============================
// Short DTO
// =============================

export class PaymentShortDto {
  @ApiProperty({
    type: String,
    example: "c6a6a9ff-5d9c-4a0f-9c35-6f6d1d9f7a23",
    description: "ID платежа в системе Gennio",
  })
  id!: string;

  @ApiProperty({
    enum: PaymentStatus,
    enumName: "PaymentStatus",
    example: PaymentStatus.PENDING,
    description: "Текущий статус платежа",
  })
  status!: PaymentStatus;

  @ApiProperty({
    type: String,
    example: "https://yookassa.ru/checkout/...",
    nullable: true,
    description: "URL для перехода в YooKassa",
  })
  confirmationUrl!: string | null;
}

// =============================
// Full DTO
// =============================

export class PaymentDto
  extends IntersectionType(PaymentBaseDto, BaseDto)
  implements IPayment {}
