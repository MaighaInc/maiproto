import type { IEmailProvider, ISlackProvider, EmailMessage, SendResult } from './types.js';
import { SmtpEmailProvider, type SmtpConfig } from './providers/smtp.js';
import { SendGridEmailProvider, type SendGridConfig } from './providers/sendgrid.js';
import { ResendEmailProvider, type ResendConfig } from './providers/resend.js';
import { SlackWebhookProvider, type SlackWebhookConfig } from './providers/slack.js';

export type EmailProviderType = 'smtp' | 'sendgrid' | 'resend';

export interface EmailFactoryConfig {
  provider: EmailProviderType;
  smtp?: SmtpConfig;
  sendgrid?: SendGridConfig;
  resend?: ResendConfig;
}

class NoOpEmailProvider implements IEmailProvider {
  readonly providerName = 'noop';
  async send(_message: EmailMessage): Promise<SendResult> {
    return { messageId: 'noop', provider: 'noop' };
  }
  async sendBatch(messages: EmailMessage[]): Promise<SendResult[]> {
    return messages.map(() => ({ messageId: 'noop', provider: 'noop' }));
  }
}

export function createEmailProvider(config: EmailFactoryConfig): IEmailProvider {
  switch (config.provider) {
    case 'smtp':
      if (!config.smtp) return new NoOpEmailProvider();
      return new SmtpEmailProvider(config.smtp);
    case 'sendgrid':
      if (!config.sendgrid) return new NoOpEmailProvider();
      return new SendGridEmailProvider(config.sendgrid);
    case 'resend':
      if (!config.resend) return new NoOpEmailProvider();
      return new ResendEmailProvider(config.resend);
    default:
      return new NoOpEmailProvider();
  }
}

export function createSlackProvider(config: SlackWebhookConfig): ISlackProvider {
  return new SlackWebhookProvider(config);
}

export type { IEmailProvider, ISlackProvider, EmailMessage, SlackMessage, SendResult } from './types.js';
export { SmtpEmailProvider } from './providers/smtp.js';
export { SendGridEmailProvider } from './providers/sendgrid.js';
export { ResendEmailProvider } from './providers/resend.js';
export { SlackWebhookProvider } from './providers/slack.js';
export {
  verifyEmailTemplate,
  resetPasswordTemplate,
  receiptApprovalRequestTemplate,
} from './templates.js';
