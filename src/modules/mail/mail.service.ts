import { Injectable, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { Address } from "nodemailer/lib/mailer";
import { ConfigService } from "@nestjs/config";

export type Recipient = string | Address | (string | Address)[];

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService
  ) {}

  /** Проверка соединения (полезно дернуть при старте/healthcheck) */
  async verify(): Promise<boolean> {
    try {
      // @ts-ignore — у MailerService есть внутренний transporter (nodemailer)
      const ok = await this.mailer.transporter.verify();
      this.logger.log(`SMTP verify: ${ok ? "ok" : "failed"}`);
      return !!ok;
    } catch (e: any) {
      this.logger.error(`SMTP verify failed: ${e?.message ?? e}`);
      return false;
    }
  }

  /** Базовая отправка plain/html */
  async send({
    to,
    subject,
    text,
    html,
    from,
    replyTo,
  }: {
    to: Recipient;
    subject: string;
    text?: string;
    html?: string;
    from?: string | Address;
    replyTo?: string | Address;
  }) {
    try {
      const info = await this.mailer.sendMail({
        to,
        subject,
        text,
        html,
        from,
        replyTo,
      });
      this.logger.log(`Email sent: ${info?.messageId ?? "ok"}`);
      return info;
    } catch (e: any) {
      this.handleSmtpError(e);
    }
  }

  /** Отправка по шаблону handlebars */
  async sendTemplate<T extends Record<string, any>>({
    to,
    subject,
    template,
    context,
    from,
    replyTo,
  }: {
    to: Recipient;
    subject: string;
    template: string; // имя файла без .hbs
    context: T;
    from?: string | Address;
    replyTo?: string | Address;
  }) {
    try {
      const info = await this.mailer.sendMail({
        to,
        subject,
        template: `${template}`,
        context,
        from,
        replyTo,
      });
      this.logger.log(
        `Email(template:${template}) sent: ${info?.messageId ?? "ok"}`
      );
      return info;
    } catch (e: any) {
      this.handleSmtpError(e);
    }
  }

  async sendEmailConfirmLink({
    to,
    link,
    project = "Gennio",
    expireHours = 24,
    supportEmail = "support@gennio.ru",
    subject = "Подтверждение email",
    replyTo,
    template = "email-confirm",
  }: {
    to: Recipient;
    link: string;
    project?: string;
    expireHours?: number;
    supportEmail?: string;
    subject?: string;
    replyTo?: string | Address;
    template?: string; // имя файла без .hbs
  }) {
    return this.sendTemplate({
      to,
      subject,
      template, // ==> src/mail/templates/email-confirm.hbs
      context: { link, project, expireHours, supportEmail },
      from: this.config.get<string>("MAIL_FROM"),
      replyTo,
    });
  }

  async sendPasswordResetLink({
    to,
    link,
    project = "Gennio",
    expireHours = 1,
    supportEmail = "support@gennio.ru",
    subject = "Восстановление пароля",
    replyTo,
    template = "password-reset",
  }: {
    to: Recipient;
    link: string;
    project?: string;
    expireHours?: number;
    supportEmail?: string;
    subject?: string;
    replyTo?: string | Address;
    template?: string; // имя файла без .hbs
  }) {
    return this.sendTemplate({
      to,
      subject,
      template, // src/mail/templates/password-reset.hbs
      context: { link, project, expireHours, supportEmail },
      from: this.config.get<string>("MAIL_FROM"),
      replyTo,
    });
  }

  async sendOtpEmail({
    to,
    code,
    project = "Gennio",
    expireMinutes = 10,
    supportEmail = "support@gennio.ru",
    subject = `Код подтверждения: ${code}`,
    replyTo,
    template = "otp",
  }: {
    to: Recipient;
    code: string;
    project?: string;
    expireMinutes?: number;
    supportEmail?: string;
    subject?: string;
    replyTo?: string | Address;
    template?: string;
  }) {
    return this.sendTemplate({
      to,
      subject,
      template,
      context: { code, project, expireMinutes, supportEmail },
      from: this.config.get<string>("MAIL_FROM"),
      replyTo,
    });
  }

  private handleSmtpError(e: any): never {
    const code = e?.code || e?.responseCode;
    const msg = e?.response?.toString?.() || e?.message || String(e);

    if (code === "EAUTH" || /Invalid login|AUTH/.test(msg)) {
      this.logger.error(
        "SMTP auth failed: проверь SMTP_USER/SMTP_PASS или пароль приложения в Яндекс 360."
      );
    } else if (
      code === "ECONNECTION" ||
      /TLS|certificate|self signed/.test(msg)
    ) {
      this.logger.error(
        "SMTP connection/TLS error: проверь порт/secure (465=true, 587=false) и доступ извне."
      );
    } else if (/Daily sending limit|rate|too many/.test(msg)) {
      this.logger.warn(
        "SMTP rate limit: Яндекс ограничивает отправку ~500 писем/сутки на ящик."
      );
    } else {
      this.logger.error(`SMTP error: ${msg}`);
    }
    throw e;
  }
}
