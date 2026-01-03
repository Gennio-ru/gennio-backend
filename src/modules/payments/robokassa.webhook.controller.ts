import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RobokassaClient } from "./robokassa.client";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("payments/robokassa")
export class RobokassaWebhookController {
  constructor(
    private readonly robokassa: RobokassaClient,
    private readonly paymentsService: PaymentsService
  ) {}

  private extractShp(body: any): Record<string, any> {
    const shp: Record<string, any> = {};
    for (const [k, v] of Object.entries(body ?? {})) {
      if (k.startsWith("Shp_")) shp[k] = v;
    }
    return shp;
  }

  @Post("result")
  @ApiOperation({
    summary: "ResultURL от Robokassa",
    description: "MD5 callback. В ответ обязаны вернуть OK{InvId}.",
  })
  async result(@Body() body: any): Promise<string> {
    const outSum = String(body.OutSum ?? "");
    const invIdRaw = body.InvId ?? body.InvoiceID;
    const signatureValue = String(body.SignatureValue ?? "");
    const invId = Number(invIdRaw);

    if (!outSum || !Number.isFinite(invId) || !signatureValue) {
      return Number.isFinite(invId) ? `OK${invId}` : "OK";
    }

    const shp = this.extractShp(body);

    const ok = this.robokassa.verifyResultSignature({
      OutSum: outSum,
      InvId: invId,
      SignatureValue: signatureValue,
      ...shp,
    });

    if (!ok) {
      return `OK${invId}`;
    }

    await this.paymentsService.handleRobokassaResult({
      OutSum: outSum,
      InvId: invId,
      SignatureValue: signatureValue,
      ...shp,
      raw: body,
    });

    return `OK${invId}`;
  }

  @Post("result2")
  @ApiOperation({
    summary: "ResultUrl2 (JWS) от Robokassa",
    description: "Тело запроса — JWS строка (НЕ JSON).",
  })
  async result2(@Body() body: any): Promise<string> {
    try {
      const jws =
        typeof body === "string" ? body.trim() : String(body ?? "").trim();
      if (!jws || jws.split(".").length < 2) return "OK";

      const decoded = this.robokassa.decodeResult2Jws(jws);

      const invId = Number(decoded?.data?.invId);
      const incSum = String(decoded?.data?.incSum ?? "");
      const state = String(decoded?.data?.state ?? "").toUpperCase();

      if (!Number.isFinite(invId) || !incSum) return "OK";

      await this.paymentsService.handleRobokassaResult({
        invId,
        incSum,
        state,
        opKey: String(decoded?.data?.opKey ?? ""),
        paymentMethod: String(decoded?.data?.paymentMethod ?? ""),
        shop: String(decoded?.data?.shop ?? ""),
        rawJws: jws,
        rawPayload: decoded,
      });

      return "OK";
    } catch (e) {
      return "OK";
    }
  }
}
