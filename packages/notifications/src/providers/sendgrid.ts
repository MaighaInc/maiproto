import sgMail from '@sendgrid/mail';
import type { IEmailProvider, EmailMessage, SendResult } from '../types.js';
import { SystemError } from '@receiptflow/shared/errors';

export interface SendGridConfig {
  apiKey: string;
}

export class SendGridEmailProvider implements IEmailProvider {
  readonly providerName = 'SENDGRID';

  constructor(config: SendGridConfig) {
    sgMail.setApiKey(config.apiKey);
  }

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const toArr = Array.isArray(message.to) ? message.to : [message.to];
      const [response] = await sgMail.send({
        from: { email: message.from.email, name: message.from.name },
        to: toArr.map((a) => ({ email: a.email, name: a.name })),
        cc: message.cc?.map((a) => ({ email: a.email, name: a.name })),
        bcc: message.bcc?.map((a) => ({ email: a.email, name: a.name })),
        replyTo: message.replyTo ? { email: message.replyTo.email, name: message.replyTo.name } : undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
          type: a.contentType,
          disposition: 'attachment' as const,
        })),
      });

      return {
        messageId: (response.headers['x-message-id'] as string | undefined) ?? 'sendgrid',
        provider: this.providerName,
      };
    } catch (err) {
      throw new SystemError(`SendGrid send failed: ${String(err)}`);
    }
  }

  async sendBatch(messages: EmailMessage[]): Promise<SendResult[]> {
    return Promise.all(messages.map((m) => this.send(m)));
  }
}
