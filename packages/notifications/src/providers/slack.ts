import type { ISlackProvider, SlackMessage } from '../types.js';
import { SystemError } from '@receiptflow/shared/errors';

export interface SlackWebhookConfig {
  webhookUrl: string;
  defaultChannel?: string;
}

export class SlackWebhookProvider implements ISlackProvider {
  readonly providerName = 'SLACK_WEBHOOK';
  private readonly webhookUrl: string;
  private readonly defaultChannel?: string;

  constructor(config: SlackWebhookConfig) {
    this.webhookUrl = config.webhookUrl;
    this.defaultChannel = config.defaultChannel;
  }

  async send(message: SlackMessage): Promise<void> {
    const payload: Record<string, unknown> = {
      text: message.text,
      ...(message.blocks ? { blocks: message.blocks } : {}),
      ...(message.username ? { username: message.username } : {}),
      ...(message.iconUrl ? { icon_url: message.iconUrl } : {}),
      ...(message.channel ?? this.defaultChannel
        ? { channel: message.channel ?? this.defaultChannel }
        : {}),
    };

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new SystemError(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }
  }
}
