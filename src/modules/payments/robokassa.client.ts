// src/modules/payments/robokassa.client.ts
import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "crypto";
import { XMLParser } from "fast-xml-parser";

type RoboKassaMode = "gateway" | "direct";

export type RobokassaReceipt = {
  sno?: string;
  items: Array<{
    name: string;
    quantity: number;
    sum?: number;
    cost?: number;
    payment_method?: string;
    payment_object?: string;
    tax: string;
    nomenclature_code?: string;
  }>;
};

/**
 * Параметры создания платежа (мы редиректим юзера на RoboKassa).
 */
export type RobokassaCreatePaymentParams = {
  amount: number; // RUB
  invId: number; // InvoiceID (целое)
  description: string;

  // куда возвращаем юзера после оплаты
  successUrl: string;
  failUrl?: string;

  // доп. поля заказа (Shp_*), например { paymentId, kind, packId }
  shp?: Record<string, string | number | boolean | null | undefined>;
  email?: string;

  receipt?: RobokassaReceipt;
};

/**
 * Ответ создания платежа
 */
export type RobokassaCreatePaymentResponse = {
  invId: number;
  paymentUrl: string; // куда редиректить
};

export type RobokassaOpState = {
  invId: number;
  stateCode: number; // 5/10/20/50/60/80/100
  outSum?: number; // сумма списания (RUB)
  opKey?: string; // нужен для refund API v2
  raw: unknown;
};

export type RobokassaRefundParams = {
  opKey: string;
  refundSum?: number; // RUB (если нет — полный)
  // опционально: comment/extra meta (зависит от реализации gateway)
  comment?: string;
  metadata?: Record<string, unknown>;
};

export type RobokassaResult2Payload = {
  header: {
    type: string; // PaymentStateNotification
    version: string;
    timestamp: string;
  };
  data: {
    shop: string;
    opKey: string;
    invId: string;
    paymentMethod?: string;
    incSum: string;
    state: string; // OK / ...
  };
};

function base64UrlToUtf8(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64").toString("utf8");
}

@Injectable()
export class RobokassaClient {
  private readonly logger = new Logger(RobokassaClient.name);

  private readonly mode: RoboKassaMode;
  private readonly http: AxiosInstance;
  private readonly pathPrefix: string; // "" или "/robokassa"

  private readonly merchantLogin: string;
  private readonly password1: string;
  private readonly password2: string;

  // direct-эндпоинты
  private readonly payBase = "https://auth.robokassa.ru/Merchant/Index.aspx";
  private readonly opStateExtBase =
    "https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt";

  constructor(private readonly configService: ConfigService) {
    const rawMode = (this.configService.get<string>("ROBOKASSA_MODE") ??
      "gateway") as string;

    this.mode =
      rawMode === "direct" || rawMode === "gateway" ? rawMode : "gateway";

    // merchant + пароли
    this.merchantLogin =
      this.configService.getOrThrow<string>("ROBOKASSA_SHOP_ID");
    this.password1 = this.configService.getOrThrow<string>(
      "ROBOKASSA_PASSWORD1"
    );
    this.password2 = this.configService.getOrThrow<string>(
      "ROBOKASSA_PASSWORD2"
    );

    if (this.mode === "gateway") {
      const baseUrl = this.configService.getOrThrow<string>(
        "PAYMENTS_GATEWAY_URL"
      );
      const apiKey =
        this.configService.get<string>("PAYMENTS_GATEWAY_API_KEY") ?? null;

      this.http = axios.create({
        baseURL: baseUrl.replace(/\/+$/, ""),
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-Internal-Api-Key": apiKey } : {}),
        },
        timeout: 15000,
      });

      this.pathPrefix = "/robokassa";

      this.logger.log(
        `RobokassaClient: режим GATEWAY, baseURL=${this.http.defaults.baseURL}`
      );
    } else {
      // DIRECT: часть операций — формирование URL, часть — XML webservice (OpStateExt)
      this.http = axios.create({
        timeout: 15000,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      this.pathPrefix = "";

      this.logger.log(
        `RobokassaClient: режим DIRECT, merchantLogin=${this.merchantLogin}`
      );
    }
  }

  private paymentsPath(path: string) {
    return `${this.pathPrefix}${path}`;
  }

  private md5Hex(str: string): string {
    return createHash("md5").update(str, "utf8").digest("hex");
  }

  /**
   * RoboKassa: подпись учитывает Shp_* параметры в виде key=value,
   * отсортированных по ключу и добавленных через ':'.
   */
  private buildShpPairs(shp?: Record<string, unknown>): {
    pairs: string[];
    params: Record<string, string>;
  } {
    const raw: Record<string, string> = {};
    if (!shp) return { pairs: [], params: {} };

    for (const [k, v] of Object.entries(shp)) {
      if (v === undefined || v === null) continue;
      raw[`Shp_${k}`] = String(v);
    }

    const keys = Object.keys(raw).sort((a, b) => a.localeCompare(b));
    const pairs = keys.map((k) => `${k}=${raw[k]}`);

    // ✅ ВАЖНО: возвращаем params уже в сортированном порядке вставки
    const params: Record<string, string> = {};
    for (const k of keys) params[k] = raw[k];

    return { pairs, params };
  }

  private calcPaymentSignature(opts: {
    outSum: string;
    invId: number;
    shp?: Record<string, unknown>;

    successUrl2?: string;
    successUrl2Method?: "GET" | "POST";
    failUrl2?: string;
    failUrl2Method?: "GET" | "POST";

    receipt?: string;
    stepByStep?: string;
    resultUrl2?: string;
  }) {
    const { pairs } = this.buildShpPairs(opts.shp);

    const pushIf = (arr: string[], v?: string) => {
      if (v != null && v !== "") arr.push(v);
    };

    const parts: string[] = [
      this.merchantLogin,
      opts.outSum,
      String(opts.invId),
    ];

    pushIf(parts, opts.receipt);
    pushIf(parts, opts.stepByStep);
    pushIf(parts, opts.resultUrl2);

    // SuccessUrl2 + Method (method только если есть url)
    pushIf(parts, opts.successUrl2);
    if (opts.successUrl2) {
      parts.push(((opts.successUrl2Method ?? "GET") as string).toUpperCase());
    }

    // FailUrl2 + Method (method только если есть url)
    pushIf(parts, opts.failUrl2);
    if (opts.failUrl2) {
      parts.push(((opts.failUrl2Method ?? "GET") as string).toUpperCase());
    }

    parts.push(this.password1, ...pairs);

    const base = parts.join(":");

    return this.md5Hex(base);
  }

  /**
   * Проверка подписи ResultURL:
   * MD5(OutSum:InvId:Password#2[:Shp_k=v...])
   * SignatureValue приходит как SignatureValue/SignatureValue (регистронезависимо)
   */
  verifyResultSignature(payload: Record<string, any>): boolean {
    const outSum = String(payload.OutSum ?? payload.out_sum ?? "");
    const invIdStr = String(payload.InvId ?? payload.inv_id ?? "");
    const signature = String(payload.SignatureValue ?? payload.Signature ?? "")
      .toLowerCase()
      .trim();

    const invId = Number(invIdStr);
    if (!outSum || !Number.isFinite(invId) || !signature) return false;

    const shp: Record<string, string> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (k.startsWith("Shp_")) shp[k] = String(v);
    }

    const keys = Object.keys(shp).sort((a, b) => a.localeCompare(b));
    const pairs = keys.map((k) => `${k}=${shp[k]}`);

    const base = [outSum, String(invId), this.password2, ...pairs].join(":");
    const expected = this.md5Hex(base).toLowerCase();

    return expected === signature;
  }

  /**
   * Создать платёж.
   *
   * DIRECT:
   *   формируем URL редиректа на https://auth.robokassa.ru/Merchant/Index.aspx
   *
   * GATEWAY:
   *   POST {PAYMENTS_GATEWAY_URL}/robokassa/payments
   */
  async createPayment(
    params: RobokassaCreatePaymentParams
  ): Promise<RobokassaCreatePaymentResponse> {
    if (this.mode === "gateway") {
      const idempotenceKey = randomUUID();

      const resp = await this.http.post<any>(
        this.paymentsPath("/payments"),
        {
          amount: params.amount,
          invId: params.invId,
          description: params.description,
          successUrl: params.successUrl,
          failUrl: params.failUrl,
          shp: params.shp ?? {},
        },
        { headers: { "Idempotence-Key": idempotenceKey } }
      );

      return {
        invId: resp.data.invId ?? params.invId,
        paymentUrl: resp.data.paymentUrl ?? resp.data.url,
      };
    }

    // DIRECT
    const outSum = params.amount.toFixed(2);
    const shp = params.shp ?? {};
    const { params: shpParams } = this.buildShpPairs(shp);

    const resultUrl2 = this.configService.get<string>("ROBOKASSA_RESULT_URL");

    const receiptJson = params.receipt
      ? JSON.stringify(params.receipt)
      : undefined;
    const receiptForSignature = receiptJson
      ? encodeURIComponent(receiptJson)
      : undefined;

    const signatureValue = this.calcPaymentSignature({
      outSum,
      invId: params.invId,
      shp: params.shp,
      receipt: receiptForSignature,
      resultUrl2,
      successUrl2: params.successUrl,
      successUrl2Method: "GET",
      failUrl2: params.failUrl ?? params.successUrl,
      failUrl2Method: "GET",
    });

    const qs = new URLSearchParams({
      MerchantLogin: this.merchantLogin,
      OutSum: outSum,
      InvId: String(params.invId),
      Description: params.description,
      SignatureValue: signatureValue,
      ...(resultUrl2 ? { ResultUrl2: resultUrl2 } : {}),
      SuccessUrl2: params.successUrl,
      SuccessUrl2Method: "GET",
      FailUrl2: params.failUrl ?? params.successUrl,
      FailUrl2Method: "GET",
      ...(params.email ? { Email: params.email } : {}),
      ...shpParams,
      ...(receiptJson ? { Receipt: receiptJson } : {}),
    });

    return {
      invId: params.invId,
      paymentUrl: `${this.payBase}?${qs.toString()}`,
    };
  }

  /**
   * Получить статус операции (OpStateExt).
   *
   * DIRECT:
   *   GET https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt?MerchantLogin=...&InvoiceID=...&Signature=...
   *   Signature = MD5(MerchantLogin:InvoiceID:Password#2)
   *
   * GATEWAY:
   *   GET {PAYMENTS_GATEWAY_URL}/robokassa/payments/{invId}
   */
  async getPayment(invId: number): Promise<RobokassaOpState> {
    if (this.mode === "gateway") {
      const resp = await this.http.get<any>(
        this.paymentsPath(`/payments/${invId}`)
      );
      return {
        invId,
        stateCode: Number(
          resp.data.stateCode ?? resp.data.state ?? resp.data.code
        ),
        outSum: resp.data.outSum != null ? Number(resp.data.outSum) : undefined,
        opKey: resp.data.opKey ?? undefined,
        raw: resp.data,
      };
    }

    // DIRECT (XML)
    const signatureBase = `${this.merchantLogin}:${invId}:${this.password2}`;
    const signature = this.md5Hex(signatureBase);

    const url = `${this.opStateExtBase}?MerchantLogin=${encodeURIComponent(
      this.merchantLogin
    )}&InvoiceID=${encodeURIComponent(
      String(invId)
    )}&Signature=${encodeURIComponent(signature)}`;

    const resp = await this.http.get<string>(url, { responseType: "text" });

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      removeNSPrefix: true,
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
    });

    const parsed = parser.parse(resp.data);

    // структура: OperationStateResponse -> Result/State/Info
    const root = parsed?.OperationStateResponse ?? parsed;
    const resultCode = Number(root?.Result?.Code ?? NaN);
    if (!Number.isFinite(resultCode) || resultCode !== 0) {
      return { invId, stateCode: 0, raw: parsed }; // 0 как "непонятно", сервис сам решит что делать
    }

    const stateCode = Number(root?.State?.Code ?? NaN);
    const outSumRaw = root?.Info?.OutSum;
    const opKeyRaw = root?.Info?.OpKey;

    return {
      invId,
      stateCode: Number.isFinite(stateCode) ? stateCode : 0,
      outSum: outSumRaw != null ? Number(outSumRaw) : undefined,
      opKey: opKeyRaw != null ? String(opKeyRaw) : undefined,
      raw: parsed,
    };
  }

  /**
   * Возврат денег.
   *
   * ⚠️ ВАЖНО:
   * - В DIRECT режиме официальная дока по Refund API у Robokassa у них часто отдается картинкой/через редиректы,
   *   поэтому я оставляю DIRECT-рефанд НЕреализованным (а у тебя и так есть GATEWAY режим через RU-прокси).
   * - В GATEWAY режиме — просто дергаем твой RU-шлюз.
   */
  async refundPayment(params: RobokassaRefundParams): Promise<any> {
    const idempotenceKey = randomUUID();

    if (this.mode !== "gateway") {
      throw new Error(
        "Robokassa refund in DIRECT mode is not implemented in this project. Use ROBOKASSA_MODE=gateway for refunds."
      );
    }

    const resp = await this.http.post<any>(
      this.paymentsPath("/refunds"),
      {
        opKey: params.opKey,
        refundSum: params.refundSum,
        comment: params.comment,
        metadata: params.metadata,
      },
      { headers: { "Idempotence-Key": idempotenceKey } }
    );

    return resp.data;
  }

  decodeResult2Jws(jws: string): RobokassaResult2Payload {
    const parts = jws.split(".");
    if (parts.length < 2) throw new Error("Invalid JWS");

    const payloadJson = base64UrlToUtf8(parts[1]);
    return JSON.parse(payloadJson) as RobokassaResult2Payload;
  }
}
