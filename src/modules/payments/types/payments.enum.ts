export enum PaymentStatus {
  PENDING = "PENDING", // создан у нас, ещё не оплачен
  WAITING_FOR_CAPTURE = "WAITING_FOR_CAPTURE",
  SUCCEEDED = "SUCCEEDED",
  CANCELED = "CANCELED",
  REFUNDED = "REFUNDED",
  ERROR = "ERROR",
}

export type TokensPackPaymentMeta = {
  kind: "TOKENS_PACK";
  packId: string;
  tokens: number;
  priceRub: number;
};
