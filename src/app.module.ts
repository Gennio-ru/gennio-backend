import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./modules/auth/auth.module";
import { PromptsModule } from "./modules/prompts/prompts.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { FilesModule } from "./modules/files/files.module";
import { HealthModule } from "./modules/health/health.module";
import { MailModule } from "./modules/mail/mail.module";
import { MailQueueModule } from "./queues/mail-queue.module";
import { envValidationSchema } from "./config/env.validation";

import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import { ModelJobModule } from "./modules/model-job/model-job.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { LoggerModule } from "nestjs-pino";
import { UserTokenTransactionsModule } from "./modules/tokens/user-token-transactions.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { PaymentsModule } from "./modules/payments/payments.module";

const rawLevel = process.env.LOG_LEVEL || "info";
const level = rawLevel.toLowerCase();
const isPretty = level === "debug";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: "global", ttl: 60, limit: 100 }, // 100 req/min per IP (override per-route if needed)
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        return {
          type: "postgres",
          host: config.get<string>("DB_HOST", "localhost"),
          port: parseInt(config.get<string>("DB_PORT", "5432"), 10),
          username: config.get<string>("DB_USER", "postgres"),
          password: config.get<string>("DB_PASS", "postgres"),
          database: config.get<string>("DB_NAME", "ai_platform"),
          autoLoadEntities: true,
          synchronize: false,
        };
      },
      inject: [ConfigService],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level,
        transport: isPretty ? { target: "pino-pretty" } : undefined,
        customLogLevel(req, res, err) {
          if (res.statusCode >= 500 || err) return "error";
          if (res.statusCode >= 400) return "warn";
          return "info";
        },
        formatters: { level: (label) => ({ level: label }) },
        customProps: (req) => ({
          service: "backend",
          requestId: req.headers["x-request-id"],
        }),
      },
    }),
    UsersModule,
    AuthModule,
    PromptsModule,
    FilesModule,
    MailModule,
    HealthModule,
    MailQueueModule,
    ModelJobModule,
    CategoriesModule,
    UserTokenTransactionsModule,
    PricingModule,
    PaymentsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
