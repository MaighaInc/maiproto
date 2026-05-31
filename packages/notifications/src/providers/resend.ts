import { Resend } from 'resend';
import type { IEmailProvider, EmailMessage, SendResult } from '../types.js';
import { SystemError } from '@receiptflow/shared/errors';

export interface ResendConfig {
  apiKey: string;
}

export class ResendEmailProvider implements IEmailProvider {
  readonly providerName = 'RESEND';
  private readonly client: Resend;

  constructor(config: ResendConfig) {
    this.client = new Resend(config.apiKey);
  }

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const toArr = Array.isArray(message.to) ? message.to : [message.to];
      const { data, error } = await this.client.emails.send({
        from: message.from.name
          ? `${message.from.name} <${message.from.email}>`
          : message.from.email,
        to: toArr.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)),
        cc: message.cc?.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)),
        bcc: message.bcc?.map((a) => (a.name ? `${a.name} <${a.email}>` : a.email)),
        reply_to: message.replyTo?.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.isBuffer(a.content)
            ? a.content.toString('base64')
            : Buffer.from(a.content).toString('base64'),
        })),
      });

      if (error) throw new Error(error.message);
      return { messageId: data?.id ?? 'resend', provider: this.providerName };
    } catch (err) {
      throw new SystemError(`Resend send failed: ${String(err)}`);
    }
  }

  async sendBatch(messages: EmailMessage[]): Promise<SendResult[]> {
    return Promise.all(messages.map((m) => this.send(m)));
  }
}
