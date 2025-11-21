// src/modules/payments/payments.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import {
  PaymentDto,
  PaymentFullDto,
  PaymentShortDto,
  YookassaWebhookResponseDto,
} from "./dto/payments.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserId } from "src/common/decorators/user-id.decorator";
import { ErrorResponseDto } from "src/common/errors/error-response.dto";
import { CreateTokensPaymentDto } from "./dto/create-payment.dto";
import { ApiPaginatedResponse } from "src/common/swagger/api-paginated-response.decorator";
import { FindPaymentsDto } from "./dto/find-payments.dto";
import { ReqUser } from "src/common/decorators/req-user.decorator";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import {
  paginatePlainToInstance,
  plainModelToInstance,
} from "src/common/helpers/entity.helper";
import { RolesGuard } from "../users/user-roles.guard";
import { Roles } from "../users/user-roles.decorator";
import { UserRole } from "../users/types/user-role.enum";
import { PaymentStatus } from "./types/payments.enum";

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

  // Список платежей с фильтрами и пагинацией
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: "Получить список платежей с фильтрами и пагинацией",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: PaymentStatus })
  @ApiQuery({ name: "createdFrom", required: false, type: String })
  @ApiQuery({ name: "createdTo", required: false, type: String })
  @ApiPaginatedResponse(PaymentFullDto, { key: "items" })
  async findMany(
    @Query() query: FindPaymentsDto
  ): Promise<PaginationResult<PaymentFullDto>> {
    const page = await this.paymentsService.findMany(query);

    return paginatePlainToInstance(PaymentFullDto, page);
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

    return plainModelToInstance(PaymentDto, payment);
  }

  // Информация о платеже для админа
  @Get("full/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: "Получить полную информацию о платеже",
  })
  @ApiParam({
    name: "id",
    description: "ID платежа в системе Gennio",
    example: "c6a6a9ff-5d9c-4a0f-9c35-6f6d1d9f7a23",
  })
  @ApiOkResponse({
    type: PaymentFullDto,
  })
  async getFullPayment(@Param("id") id: string): Promise<PaymentFullDto> {
    const payment = await this.paymentsService.getFullPaymentById(id);

    return plainModelToInstance(PaymentFullDto, payment);
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
