import { Module } from "@nestjs/common";
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./modules/auth/auth.module";
import { PromptsModule } from "./modules/prompts/prompts.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { FilesModule } from "./modules/files/files.module";
import { HealthModule } from "./modules/health/health.module";
import { MailModule } from "./modules/mail/mail.module";
import { MailQueueModule } from "./queues/mail-queue.module";
import { envValidationSchema } from './config/env.validation';

import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60, limit: 100 }, // 100 req/min per IP (override per-route if needed)
    ]),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60, limit: 100 }, // 100 req/min per IP (override per-route if needed)
    ]),ConfigModule],
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
    UsersModule,
    AuthModule,
    PromptsModule,
    FilesModule,
    MailModule,
    HealthModule,
    MailQueueModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
