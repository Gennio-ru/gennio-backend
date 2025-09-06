import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { join } from "path";
import { MailService } from "./mail.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>("SMTP_HOST", "smtp.yandex.ru"),
          port: Number(config.get<string>("SMTP_PORT", "465")),
          secure: config.get<string>("SMTP_SECURE", "true") === "true",
          auth: {
            user: config.get<string>("SMTP_USER"),
            pass: config.get<string>("SMTP_PASS"),
          },
        },
        defaults: {
          from: config.get<string>("MAIL_FROM"),
        },
        template: {
          dir: join(process.cwd(), "src", "mail", "templates"),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
