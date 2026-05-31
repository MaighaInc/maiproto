export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailMessage {
  to: EmailAddress | EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  from: EmailAddress;
  replyTo?: EmailAddress;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  tags?: Record<string, string>;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface SendResult {
  messageId: string;
  provider: string;
}

export interface IEmailProvider {
  readonly providerName: string;
  send(message: EmailMessage): Promise<SendResult>;
  sendBatch(messages: EmailMessage[]): Promise<SendResult[]>;
}

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: unknown[];
  username?: string;
  iconUrl?: string;
}

export interface ISlackProvider {
  send(message: SlackMessage): Promise<void>;
}
