import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  // ==== Node / App ====
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().port().default(3000),
  FRONTEND_URL: Joi.string().uri().required(),

  // ==== PostgreSQL ====
  DATABASE_URL: Joi.string().uri().optional(),
  DB_HOST: Joi.string().hostname().when("DATABASE_URL", {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().default("postgres"),
  DB_PASS: Joi.string().allow("").default("postgres"),
  DB_NAME: Joi.string().default("ai_platform"),

  // ==== Redis ====
  REDIS_URL: Joi.string().uri().default("redis://127.0.0.1:6379/0"),
  REDIS_BULL_URL: Joi.string().uri().default("redis://127.0.0.1:6379/1"),

  // ==== RabbitMQ ====
  RABBIT_USER: Joi.string().required(),
  RABBIT_PASS: Joi.string().required(),
  RABBIT_HOST: Joi.string().hostname().default("localhost"),

  // ==== JWT ====
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default("15m"),
  JWT_REFRESH_TTL: Joi.string().default("7d"),

  // ==== Email confirmation ====
  EMAIL_CONFIRM_TTL: Joi.string().default("24h"),
  EMAIL_CONFIRM_BASE_URL: Joi.string().uri().required(),
  EMAIL_CONFIRM_SECRET: Joi.string().min(32).required(),
  REQUIRE_EMAIL_CONFIRM_BEFORE_LOGIN: Joi.boolean()
    .truthy("true")
    .falsy("false")
    .default(false),

  // ==== Password reset ====
  PASSWORD_RESET_TTL: Joi.string().default("1h"),
  PASSWORD_RESET_SECRET: Joi.string().min(32).required(),

  // ==== CORS / Cookies ====
  CORS_ORIGIN: Joi.string().optional(),
  COOKIE_SECURE: Joi.boolean().truthy("true").falsy("false").default(false),
  COOKIE_DOMAIN: Joi.string().optional(),

  // ==== S3 (Yandex Object Storage / AWS S3 compatible) ====
  YANDEX_S3_REGION: Joi.string().required(),
  YANDEX_S3_ENDPOINT: Joi.string().uri().required(),
  YANDEX_S3_BUCKET: Joi.string().required(),
  YANDEX_S3_KEY: Joi.string().required(),
  YANDEX_S3_SECRET: Joi.string().required(),

  // ==== SMTP ====
  SMTP_HOST: Joi.string().hostname().required(),
  SMTP_PORT: Joi.number().port().default(465),
  SMTP_SECURE: Joi.boolean().truthy("true").falsy("false").default(false),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  MAIL_FROM: Joi.string().required(),

  // ==== Yandex OAuth ====
  YANDEX_CLIENT_ID: Joi.string().required(),
  YANDEX_CLIENT_SECRET: Joi.string().required(),
  YANDEX_REDIRECT_URI: Joi.string().uri().required(),

  // ==== OpenAI ====
  OPEN_AI_API_SECRET: Joi.string()
    .pattern(/^sk-[\w-]+/)
    .required(),

  // ==== Alerts / Telegram ====
  TG_TOKEN: Joi.string()
    .pattern(/^\d+:[\w-]+$/)
    .required(),
  TG_CHAT_ID: Joi.string().required(),
  POLL_SEC: Joi.number().integer().min(5).default(30),

  // ==== Logging ====
  LOG_LEVEL: Joi.string()
    .valid("fatal", "error", "warn", "info", "debug", "trace")
    .default("info"),

  // ==== YooKassa ====
  YOOKASSA_SHOP_ID: Joi.string().required(),
  YOOKASSA_SECRET_KEY: Joi.string().required(),

  // ==== Cleanup / File TTL ====
  MODEL_JOB_RESULTS_TTL_HOURS: Joi.number().integer().min(1).default(24),
  FILE_ORPHAN_TTL_HOURS: Joi.number().integer().min(1).default(24),
  CLEANUP_BATCH_SIZE: Joi.number().integer().min(10).default(200),
});
