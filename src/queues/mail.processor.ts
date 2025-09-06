// src/queues/mail.processor.ts
import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { MailService } from "src/modules/mail/mail.service";
import { SendMailJob } from "./mail.queue";

@Processor("mail")
export class MailProcessor {
  constructor(private readonly mail: MailService) {}

  @Process({ name: "send", concurrency: 5 })
  async handleSend(job: Job<SendMailJob>) {
    const { to, subject, text, html, template, context, from, replyTo } =
      job.data;

    if (template) {
      return this.mail.sendTemplate({
        to,
        subject,
        template,
        context: context ?? {},
        from,
        replyTo,
      });
    }

    return this.mail.send({ to, subject, text, html, from, replyTo });
  }
}
