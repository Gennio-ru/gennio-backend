import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { PaymentsService } from "./payments.service";

@ApiTags("payments-internal")
@Controller("internal/robokassa")
export class InternalRobokassaController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService
  ) {}

  @Post("webhook")
  @ApiOperation({
    summary: "Внутренний вебхук от RU-шлюза (проксирующего Robokassa)",
    description:
      "Вызывается только вашим прокси. Защищён секретным заголовком.",
  })
  async handleInternalWebhook(
    @Headers("x-internal-webhook-key") key: string | undefined,
    @Body() body: any
  ): Promise<{ accepted: true }> {
    const expected =
      this.configService.get<string>("INTERNAL_WEBHOOK_KEY") ?? null;
    if (!expected || key !== expected) {
      throw new UnauthorizedException("Invalid internal webhook key");
    }

    // body должен содержать outSum/invId/shp/raw (или просто raw, но лучше единый контракт)
    await this.paymentsService.handleRobokassaResult(body);

    return { accepted: true };
  }
}
