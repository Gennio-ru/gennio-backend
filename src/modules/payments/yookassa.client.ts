// src/modules/payments/yookassa.client.ts
import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { v4 as uuidv4 } from "uuid";

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
  metadata?: Record<string, any>;
  capture?: boolean;
  receipt?: YookassaReceipt;
};

export type YookassaRefundParams = {
  paymentId: string; // providerPaymentId (id платежа в YooKassa)
  amount: number; // рубли
  description?: string;
  metadata?: Record<string, any>;
};

@Injectable()
export class YookassaClient {
  private readonly logger = new Logger(YookassaClient.name);
  private readonly http: AxiosInstance;
  private readonly shopId: string | undefined;
  private readonly secretKey: string | undefined;

  constructor() {
    this.shopId = process.env.YOOKASSA_SHOP_ID;
    this.secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!this.shopId || !this.secretKey) {
      this.logger.warn(
        "YOOKASSA_SHOP_ID or YOOKASSA_SECRET_KEY not set — YooKassaClient will not work correctly"
      );
    }

    this.http = axios.create({
      baseURL: "https://api.yookassa.ru/v3",
      // то же самое, что `curl -u shopId:secretKey`
      auth:
        this.shopId && this.secretKey
          ? {
              username: this.shopId,
              password: this.secretKey,
            }
          : undefined,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
  }

  private ensureCredentials() {
    if (!this.shopId || !this.secretKey) {
      throw new Error(
        "YOOKASSA_SHOP_ID or YOOKASSA_SECRET_KEY is not configured"
      );
    }
  }

  /**
   * Создать платёж
   * POST /v3/payments
   */
  async createPayment(params: YookassaCreatePaymentParams): Promise<any> {
    this.ensureCredentials();

    const idempotenceKey = uuidv4();

    const body: any = {
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
    };

    if (params.receipt) {
      body.receipt = params.receipt;
    }

    // failUrl отдельно Юкасса не поддерживает — можно положить в metadata,
    // если хочешь на фронте этим управлять
    if (params.failUrl) {
      body.metadata = {
        ...(body.metadata ?? {}),
        failUrl: params.failUrl,
      };
    }

    try {
      const { data } = await this.http.post("/payments", body, {
        headers: {
          "Idempotence-Key": idempotenceKey,
        },
      });

      return data;
    } catch (err: any) {
      const status = err?.response?.status;
      const respData = err?.response?.data;

      console.error("YooKassa createPayment failed RAW", {
        status,
        data: respData,
      });

      this.logger.error(
        `YooKassa createPayment failed: ${status} ${JSON.stringify(respData)}`
      );

      throw err;
    }
  }

  /**
   * Получить платёж
   * GET /v3/payments/{payment_id}
   */
  async getPayment(paymentId: string): Promise<any> {
    this.ensureCredentials();

    const { data } = await this.http.get(`/payments/${paymentId}`);
    return data;
  }

  /**
   * Захват (capture) платежа
   * POST /v3/payments/{payment_id}/capture
   */
  async capturePayment(paymentId: string): Promise<any> {
    this.ensureCredentials();

    const idempotenceKey = uuidv4();

    const { data } = await this.http.post(
      `/payments/${paymentId}/capture`,
      {},
      {
        headers: {
          "Idempotence-Key": idempotenceKey,
        },
      }
    );

    return data;
  }

  /**
   * Отмена платежа
   * POST /v3/payments/{payment_id}/cancel
   */
  async cancelPayment(paymentId: string): Promise<any> {
    this.ensureCredentials();

    const idempotenceKey = uuidv4();

    const { data } = await this.http.post(
      `/payments/${paymentId}/cancel`,
      {},
      {
        headers: {
          "Idempotence-Key": idempotenceKey,
        },
      }
    );

    return data;
  }

  /**
   * 💸 Рефанд
   * POST /v3/refunds
   */
  async refundPayment(params: YookassaRefundParams): Promise<any> {
    this.ensureCredentials();

    const idempotenceKey = uuidv4();

    const body = {
      payment_id: params.paymentId,
      amount: {
        value: params.amount.toFixed(2),
        currency: "RUB",
      },
      description: params.description,
      metadata: params.metadata,
    };

    const { data } = await this.http.post("/refunds", body, {
      headers: {
        "Idempotence-Key": idempotenceKey,
      },
    });

    return data;
  }
}
