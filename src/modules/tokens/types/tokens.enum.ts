export enum TokenTransactionReason {
  JobCharge = "JOB_CHARGE", // списание за задачу
  JobRefund = "JOB_REFUND", // возврат за упавшую задачу
  ManualAdd = "MANUAL_ADD", // ручное начисление / бонус
  ManualSubtract = "MANUAL_SUBTRACT", // ручное списание админом
  PaymentPurchase = "PAYMENT_PURCHASE", // покупка пакета
  PaymentRefund = "PAYMENT_REFUND", // возврат платежа
  Promo = "PROMO", // промокод и т.п.
}
