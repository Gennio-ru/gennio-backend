import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { ConfigService } from "@nestjs/config";
import { YookassaWebhookResponseDto } from "./dto/payments.dto";

@ApiTags("payments-internal")
@Controller("internal/yookassa")
export class InternalYookassaController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService
  ) {}

  @Post("webhook")
  @ApiOperation({
    summary: "Внутренний вебхук от платежного шлюза (проксирующего YooKassa)",
    description:
      "Используется только нашим RU-шлюзом. Защищён секретным заголовком.",
  })
  async handleInternalWebhook(
    @Headers("x-internal-webhook-key") key: string | undefined,
    @Body() body: unknown
  ): Promise<YookassaWebhookResponseDto> {
    const expected =
      this.configService.get<string>("INTERNAL_WEBHOOK_KEY") ?? null;

    if (!expected || key !== expected) {
      throw new UnauthorizedException("Invalid internal webhook key");
    }

    await this.paymentsService.handleYookassaWebhook(
      body as Record<string, unknown>
    );

    return { accepted: true };
  }
}
