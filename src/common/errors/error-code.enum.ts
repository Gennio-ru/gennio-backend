export enum ErrorCode {
  // биллинг / токены
  TOKENS_NOT_ENOUGH = "TOKENS_NOT_ENOUGH",

  // платежи
  PAYMENT_FAILED = "PAYMENT_FAILED", // не удалось создать/обработать платёж в провайдере
  PAYMENT_PROVIDER_ERROR = "PAYMENT_PROVIDER_ERROR", // валидная 4xx ошибка от провайдера (receipt, amount и т.п.)

  // модель / джобы
  MODEJ_JOB_TYPE_NOT_FOUND = "MODEJ_JOB_TYPE_NOT_FOUND",
  MODEL_JOB_NOT_FOUND = "MODEL_JOB_NOT_FOUND",
  MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE",

  // генерация
  JOB_STALLED = "JOB_STALLED", // превышено время ожидания в очереди
  PROCESSING_TIMEOUT = "PROCESSING_TIMEOUT", // превышено время генерации

  // нейросети
  MODERATION_BLOCKED = "MODERATION_BLOCKED",

  // доступ
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  UNAUTHORIZED = "UNAUTHORIZED",
  EMAIL_NOT_CONFIRMED = "EMAIL_NOT_CONFIRMED",
  ACCOUNT_IS_BLOCKED = "ACCOUNT_IS_BLOCKED",
  FORBIDDEN = "FORBIDDEN",

  // регистрация
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  PHONE_ALREADY_EXISTS = "PHONE_ALREADY_EXISTS",

  // валидация
  VALIDATION_FAILED = "VALIDATION_FAILED",

  // дефолт для необработанных
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}
