import { ISchema } from "src/common/base/base.interface";
import { PaymentStatus } from "./payments.enum";

export interface IPaymentBase {
  userId: string | null;
  amount: string;
  currency: string;
  provider: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  confirmationUrl: string | null;
  description: string | null;
  providerPayload: any | null;
  meta: any | null;

  tokensPurchased: number | null;
  tokensRefunded: number | null;

  capturedAt: Date | null;
  canceledAt: Date | null;
  refundedAt: Date | null;
  refundedAmount: string | null;

  errorCode: string | null;
  errorMessage: string | null;

  processedAt: Date | null;
}

export interface IPayment extends ISchema, IPaymentBase {}
