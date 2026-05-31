import type { PrismaClient } from '@receiptflow/database';
import type { Redis } from 'ioredis';
import { NotFoundError, BusinessRuleError } from '@receiptflow/shared/errors';
import { WEBHOOK_EVENTS } from '@receiptflow/shared/validators';
import { randomUUID } from 'node:crypto';
import { createHmac } from 'node:crypto';

export interface CreateWebhookInput {
  tenantId: string;
  organizationId: string;
  url: string;
  events: string[];
  secret?: string;
  description?: string;
}

export class WebhookService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  async createWebhook(input: CreateWebhookInput): Promise<unknown> {
    const invalidEvents = input.events.filter((e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e));
    if (invalidEvents.length > 0) {
      throw new BusinessRuleError(`Invalid webhook events: ${invalidEvents.join(', ')}`);
    }

    const secret = input.secret ?? `whsec_${randomUUID().replace(/-/g, '')}`;

    return this.prisma.webhook.create({
      data: {
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        url: input.url,
        events: input.events,
        secret,
        description: input.description,
        isActive: true,
      },
    });
  }

  async listWebhooks(tenantId: string, organizationId: string): Promise<unknown[]> {
    return this.prisma.webhook.findMany({
      where: { tenantId, organizationId, deletedAt: null },
      select: {
        id: true, url: true, events: true, isActive: true, description: true, createdAt: true,
        // Never return secret
      },
    });
  }

  async deleteWebhook(id: string, tenantId: string): Promise<void> {
    const webhook = await this.prisma.webhook.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!webhook) throw new NotFoundError('Webhook not found');
    await this.prisma.webhook.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async dispatchWebhookEvent(
    tenantId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        events: { has: event },
      },
    });

    for (const webhook of webhooks) {
      const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
      const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

      // Queue delivery
      await this.redis.lpush(
        'webhook:deliveries',
        JSON.stringify({ webhookId: webhook.id, url: webhook.url, body, signature }),
      );
    }
  }
}
