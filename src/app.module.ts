import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./modules/auth/auth.module";
import { PromptsModule } from "./modules/prompts/prompts.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { FilesModule } from "./modules/files/files.module";
import { HealthModule } from "./modules/health/health.module";
import { MailModule } from "./modules/mail/mail.module";
import { MailQueueModule } from "./queues/mail-queue.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    UsersModule,
    AuthModule,
    PromptsModule,
    FilesModule,
    MailModule,
    HealthModule,
    MailQueueModule,
  ],
})
export class AppModule {}
