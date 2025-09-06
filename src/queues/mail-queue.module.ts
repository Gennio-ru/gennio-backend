// src/queues/mail-queue.module.ts
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MailQueue } from "./mail.queue";
import { MailProcessor } from "./mail.processor";
import { MailModule } from "src/modules/mail/mail.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: cfg.get<string>("REDIS_BULL_URL", "redis://127.0.0.1:6379/1"),
        prefix: cfg.get<string>("BULL_PREFIX", "queue"),
      }),
    }),
    BullModule.registerQueue({
      name: "mail",
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 }, // 2s, 4s, 8s, 16s...
        removeOnComplete: true,
        removeOnFail: 500,
      },
      // лимит скорости, чтобы не ловить антиспам у SMTP
      limiter: { max: 20, duration: 1000 }, // ≤20 писем/сек
    }),
    MailModule, // твой MailService
  ],
  providers: [MailQueue, MailProcessor],
  exports: [MailQueue],
})
export class MailQueueModule {}
