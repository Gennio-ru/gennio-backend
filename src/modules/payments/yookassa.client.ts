// src/modules/payments/yookassa.client.ts
import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";

export type YookassaVatCode = 1;
// 1 — без НДС, 2 — 0%, 3 — 10%, 4 — 20%, 5 — 10/110, 6 — 20/120

export type YookassaReceiptItem = {
  description: string;
  quantity: string; // "1.00"
  amount: {
    value: string; // "350.00"
    currency: "RUB";
  };
  vat_code: YookassaVatCode;
  payment_mode?:
    | "full_prepayment"
    | "full_payment"
    | "advance"
    | "partial_prepayment";
  payment_subject?: "service" | "commodity" | "payment" | "another";
};

export type YookassaReceiptCustomer = {
  email?: string;
  phone?: string;
};

export type YookassaReceipt = {
  customer?: YookassaReceiptCustomer;
  items: YookassaReceiptItem[];
};

export type YookassaCreatePaymentParams = {
  amount: number;
  description?: string;
  returnUrl: string;
  failUrl?: string;
  metadata?: Record<string, unknown>;
  capture?: boolean;
  receipt?: YookassaReceipt;
};

export type YookassaRefundParams = {
  paymentId: string; // providerPaymentId (id платежа в YooKassa)
  amount: number; // рубли
  description?: string;
  metadata?: Record<string, unknown>;
};

type YooKassaMode = "gateway" | "direct";

type DirectCreatePaymentBody = {
  amount: {
    value: string;
    currency: "RUB";
  };
  confirmation: {
    type: "redirect";
    return_url: string;
  };
  description?: string;
  metadata?: Record<string, unknown>;
  capture: boolean;
  receipt?: YookassaReceipt;
};

type DirectRefundBody = {
  payment_id: string;
  amount: {
    value: string;
    currency: "RUB";
  };
  description?: string;
  metadata?: Record<string, unknown>;
};

type GatewayCreatePaymentBody = YookassaCreatePaymentParams;
type GatewayRefundBody = YookassaRefundParams;

@Injectable()
export class YookassaClient {
  private readonly logger = new Logger(YookassaClient.name);
  private readonly http: AxiosInstance;
  private readonly mode: YooKassaMode;
  private readonly pathPrefix: string; // "" или "/yookassa"

  constructor(private readonly configService: ConfigService) {
    const rawMode =
      this.configService.get<string>("YOOKASSA_MODE") ?? "gateway";
    this.mode =
      rawMode === "direct" || rawMode === "gateway" ? rawMode : "gateway";

    if (this.mode === "gateway") {
      const baseUrl = this.configService.getOrThrow<string>(
        "PAYMENTS_GATEWAY_URL"
      );
      const apiKey =
        this.configService.get<string>("PAYMENTS_GATEWAY_API_KEY") ?? null;

      this.http = axios.create({
        // пример: https://pay.gennio.ru/prod/api
        baseURL: baseUrl.replace(/\/+$/, ""),
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-Internal-Api-Key": apiKey } : {}),
        },
        timeout: 15000,
      });

      this.pathPrefix = "/yookassa";

      this.logger.log(
        `YooKassaClient: режим GATEWAY, baseURL=${this.http.defaults.baseURL}`
      );
    } else {
      // DIRECT
      const shopId = this.configService.getOrThrow<string>("YOOKASSA_SHOP_ID");
      const secretKey = this.configService.getOrThrow<string>(
        "YOOKASSA_SECRET_KEY"
      );

      this.http = axios.create({
        baseURL: "https://api.yookassa.ru/v3",
        // то же самое, что `curl -u shopId:secretKey`
        auth: {
          username: shopId,
          password: secretKey,
        },
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      this.pathPrefix = "";
      this.logger.log(
        `YooKassaClient: режим DIRECT, shopId=${shopId}, baseURL=${this.http.defaults.baseURL}`
      );
    }
  }

  private paymentsPath(path: string): string {
    return `${this.pathPrefix}${path}`;
  }

  private refundsPath(path: string): string {
    return `${this.pathPrefix}${path}`;
  }

  /**
   * Создать платёж
   *
   * DIRECT:
   *   POST https://api.yookassa.ru/v3/payments
   *
   * GATEWAY:
   *   POST {PAYMENTS_GATEWAY_URL}/yookassa/payments
   *   (далее RU-шлюз сам ходит в YooKassa)
   */
  async createPayment(params: YookassaCreatePaymentParams): Promise<any> {
    const idempotenceKey = randomUUID();

    if (this.mode === "gateway") {
      const body: GatewayCreatePaymentBody = {
        amount: params.amount,
        description: params.description,
        returnUrl: params.returnUrl,
        failUrl: params.failUrl,
        metadata: params.metadata,
        capture: params.capture,
        receipt: params.receipt,
      };

      try {
        const response = await this.http.post<any>(
          this.paymentsPath("/payments"),
          body,
          {
            headers: {
              "Idempotence-Key": idempotenceKey,
            },
          }
        );

        return response.data;
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          const respData = err.response?.data;

          this.logger.error(
            `YooKassa (gateway) createPayment failed: ${status} ${JSON.stringify(
              respData
            )}`
          );
        }

        throw err;
      }
    }

    // DIRECT режим
    const body: DirectCreatePaymentBody = {
      amount: {
        value: params.amount.toFixed(2), // "350.00"
        currency: "RUB",
      },
      confirmation: {
        type: "redirect",
        return_url: params.returnUrl,
      },
      description: params.description,
      metadata: params.metadata,
      capture: params.capture ?? false,
      receipt: params.receipt,
    };

    if (params.failUrl) {
      body.metadata = {
        ...(body.metadata ?? {}),
        failUrl: params.failUrl,
      };
    }

    try {
      const response = await this.http.post<unknown>("/payments", body, {
        headers: {
          "Idempotence-Key": idempotenceKey,
        },
      });

      return response.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const respData = err.response?.data;

        console.error("YooKassa createPayment failed RAW", {
          status,
          data: respData,
        });

        this.logger.error(
          `YooKassa createPayment failed: ${status} ${JSON.stringify(respData)}`
        );
      }

      throw err;
    }
  }

  /**
   * Получить платёж
   *
   * DIRECT:  GET /v3/payments/{payment_id}
   * GATEWAY: GET {GATEWAY_URL}/yookassa/payments/{payment_id}
   */
  async getPayment(paymentId: string): Promise<unknown> {
    const response = await this.http.get<unknown>(
      this.paymentsPath(`/payments/${paymentId}`)
    );
    return response.data;
  }

  /**
   * Захват (capture) платежа
   *
   * DIRECT:  POST /v3/payments/{payment_id}/capture
   * GATEWAY: POST {GATEWAY_URL}/yookassa/payments/{payment_id}/capture
   */
  async capturePayment(paymentId: string): Promise<any> {
    const idempotenceKey = randomUUID();

    const response = await this.http.post<any>(
      this.paymentsPath(`/payments/${paymentId}/capture`),
      {},
      {
        headers: {
          "Idempotence-Key": idempotenceKey,
        },
      }
    );

    return response.data;
  }

  /**
   * Отмена платежа
   *
   * DIRECT:  POST /v3/payments/{payment_id}/cancel
   * GATEWAY: POST {GATEWAY_URL}/yookassa/payments/{payment_id}/cancel
   */
  async cancelPayment(paymentId: string): Promise<any> {
    const idempotenceKey = randomUUID();

    const response = await this.http.post<any>(
      this.paymentsPath(`/payments/${paymentId}/cancel`),
      {},
      {
        headers: {
          "Idempotence-Key": idempotenceKey,
        },
      }
    );

    return response.data;
  }

  /**
   * 💸 Рефанд
   *
   * DIRECT:  POST /v3/refunds
   * GATEWAY: POST {GATEWAY_URL}/yookassa/refunds
   */
  async refundPayment(params: YookassaRefundParams): Promise<any> {
    const idempotenceKey = randomUUID();

    if (this.mode === "gateway") {
      const body: GatewayRefundBody = {
        paymentId: params.paymentId,
        amount: params.amount,
        description: params.description,
        metadata: params.metadata,
      };

      const response = await this.http.post<any>(
        this.refundsPath("/refunds"),
        body,
        {
          headers: {
            "Idempotence-Key": idempotenceKey,
          },
        }
      );

      return response.data;
    }

    const body: DirectRefundBody = {
      payment_id: params.paymentId,
      amount: {
        value: params.amount.toFixed(2),
        currency: "RUB",
      },
      description: params.description,
      metadata: params.metadata,
    };

    const response = await this.http.post<unknown>("/refunds", body, {
      headers: {
        "Idempotence-Key": idempotenceKey,
      },
    });

    return response.data;
  }
}
