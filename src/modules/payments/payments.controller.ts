// src/modules/payments/payments.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import {
  PaymentDto,
  PaymentShortDto,
  YookassaWebhookResponseDto,
} from "./dto/payments.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserId } from "src/common/decorators/user-id.decorator";
import { ErrorResponseDto } from "src/common/errors/error-response.dto";
import {
  CreatePaymentDto,
  CreateTokensPaymentDto,
} from "./dto/create-payment.dto";

@ApiTags("payments")
@ApiBearerAuth()
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("tokens")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Создать платёж за пакет токенов" })
  @ApiBody({ type: CreateTokensPaymentDto })
  @ApiOkResponse({
    type: PaymentShortDto,
    description:
      "Краткая информация о платеже, включая ссылку на оплату в YooKassa.",
  })
  @ApiBadRequestResponse({
    description: "Ошибка валидации или бизнес-ошибка",
    type: ErrorResponseDto,
  })
  async createTokensPayment(
    @Body() body: CreateTokensPaymentDto,
    @UserId() userId: string
  ): Promise<PaymentShortDto> {
    const payment = await this.paymentsService.createTokensPackPayment({
      userId,
      ...body,
    });

    return {
      id: payment.id,
      status: payment.status,
      confirmationUrl: payment.confirmationUrl,
    };
  }

  // Список платежей текущего пользователя
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Список платежей текущего пользователя",
  })
  @ApiOkResponse({
    type: PaymentDto,
    isArray: true,
  })
  async listMyPayments(@UserId() userId: string): Promise<PaymentDto[]> {
    const payments = await this.paymentsService.getUserPayments(userId);
    return payments as any;
  }

  // Информация о платеже (наша)
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Получить информацию о платеже",
  })
  @ApiParam({
    name: "id",
    description: "ID платежа в системе Gennio",
    example: "c6a6a9ff-5d9c-4a0f-9c35-6f6d1d9f7a23",
  })
  @ApiOkResponse({
    type: PaymentDto,
  })
  async getPayment(@Param("id") id: string): Promise<PaymentDto> {
    const payment = await this.paymentsService.getPaymentById(id);
    return payment as any;
  }

  // Отмена платежа
  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Отменить платеж",
  })
  @ApiParam({
    name: "id",
    description: "ID платежа в системе Gennio",
  })
  @ApiOkResponse({
    type: PaymentDto,
  })
  async cancel(@Param("id") id: string): Promise<PaymentDto> {
    const payment = await this.paymentsService.cancelPayment(id);
    return payment as any;
  }

  // Вебхук от YooKassa — БЕЗ guard'а
  @Post("yookassa/webhook")
  @ApiOperation({
    summary: "Вебхук от YooKassa",
    description:
      "Обрабатывает события YooKassa (payment.succeeded, payment.canceled и т.д.). " +
      "Вызывается YooKassa, а не фронтом.",
  })
  @ApiOkResponse({
    type: YookassaWebhookResponseDto,
  })
  async yookassaWebhook(
    @Body() body: any
  ): Promise<YookassaWebhookResponseDto> {
    await this.paymentsService.handleYookassaWebhook(body);
    return { accepted: true };
  }

  @Post(":id/refund")
  @UseGuards(JwtAuthGuard) // или админ-гвард
  @ApiOperation({ summary: "Запросить возврат платежа" })
  async refundPayment(
    @Param("id") id: string,
    @Body("amount") amount?: number
  ) {
    const refund = await this.paymentsService.requestRefund({
      paymentId: id,
      amount,
    });
    return refund;
  }
}
