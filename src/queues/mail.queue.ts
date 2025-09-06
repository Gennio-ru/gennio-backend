import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { Recipient } from "src/modules/mail/mail.service";
import { Address } from "nodemailer/lib/mailer";

export type SendMailJob = {
  to: Recipient;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: Record<string, any>;
  from?: string | Address; // ← НЕ Recipient, только один адрес
  replyTo?: string | Address; // ← НЕ Recipient, только один адрес
  priority?: number;
};

@Injectable()
export class MailQueue {
  constructor(@InjectQueue("mail") private readonly q: Queue) {}

  /** Универсальная постановка письма */
  async enqueueSend(
    payload: SendMailJob,
    opts?: { dedupeKey?: string; delayMs?: number; priority?: number }
  ) {
    return this.q.add("send", payload, {
      jobId: opts?.dedupeKey,
      delay: opts?.delayMs ?? 0,
      priority: opts?.priority ?? payload?.priority,
    });
  }

  /** Удобный шорткат под OTP */
  async enqueueOtpEmail(to: string, code: string, project = "Gennio") {
    return this.enqueueSend(
      {
        to,
        subject: `Код подтверждения: ${code}`,
        template: "otp",
        context: {
          code,
          project,
          expireMinutes: 5,
          supportEmail: "support@gennio.ru",
        },
        priority: 1,
      },
      { dedupeKey: `otp:${to}:${code}` }
    );
  }
}
