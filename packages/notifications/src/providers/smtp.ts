import nodemailer, { type Transporter } from 'nodemailer';
import type { IEmailProvider, EmailMessage, SendResult } from '../types.js';
import { SystemError } from '@receiptflow/shared/errors';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

export class SmtpEmailProvider implements IEmailProvider {
  readonly providerName = 'SMTP';
  private readonly transporter: Transporter;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    });
  }

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const info = await this.transporter.sendMail(toNodemailer(message));
      return { messageId: info.messageId as string, provider: this.providerName };
    } catch (err) {
      throw new SystemError(`SMTP send failed: ${String(err)}`);
    }
  }

  async sendBatch(messages: EmailMessage[]): Promise<SendResult[]> {
    return Promise.all(messages.map((m) => this.send(m)));
  }
}

function toNodemailer(message: EmailMessage): nodemailer.SendMailOptions {
  const toArr = Array.isArray(message.to) ? message.to : [message.to];
  return {
    from: formatAddress(message.from),
    to: toArr.map(formatAddress).join(', '),
    cc: message.cc?.map(formatAddress).join(', '),
    bcc: message.bcc?.map(formatAddress).join(', '),
    replyTo: message.replyTo ? formatAddress(message.replyTo) : undefined,
    subject: message.subject,
    html: message.html,
    text: message.text,
    attachments: message.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  };
}

function formatAddress(addr: { email: string; name?: string }): string {
  return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}
