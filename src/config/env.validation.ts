import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Server
  PORT: Joi.number().port().default(3000),

  // Database
  DATABASE_URL: Joi.string().uri().optional(),
  DB_HOST: Joi.string().hostname().when('DATABASE_URL', { is: Joi.exist(), then: Joi.optional(), otherwise: Joi.required() }),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().default('postgres'),
  DB_PASS: Joi.string().allow('').default('postgres'),
  DB_NAME: Joi.string().default('ai_platform'),

  // Redis
  REDIS_URL: Joi.string().uri().default('redis://127.0.0.1:6379/0'),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  // CORS / Cookies
  CORS_ORIGIN: Joi.string().optional(),
  COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  COOKIE_DOMAIN: Joi.string().optional(),

  // S3 (Yandex or AWS compatible)
  YANDEX_S3_REGION: Joi.string().optional(),
  YANDEX_S3_ENDPOINT: Joi.string().uri().optional(),
  YANDEX_S3_BUCKET: Joi.string().optional(),
  YANDEX_S3_KEY: Joi.string().optional(),
  YANDEX_S3_SECRET: Joi.string().optional(),

  // SMTP
  SMTP_HOST: Joi.string().hostname().required(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  MAIL_FROM: Joi.string().required(),
});