import Stripe from 'stripe';
import type { PrismaClient } from '@receiptflow/database';
import { NotFoundError, BusinessRuleError } from '@receiptflow/shared/errors';

export interface BillingConfig {
  stripeSecretKey: string;
  webhookSecret: string;
  stripeApiVersion: string;
  planPriceIds: Readonly<Record<string, string>>;
}

export class BillingService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly planPriceIds: Readonly<Record<string, string>>;

  constructor(
    private readonly prisma: PrismaClient,
    config: BillingConfig,
  ) {
    this.stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: config.stripeApiVersion as Stripe.LatestApiVersion,
    });
    this.webhookSecret = config.webhookSecret;
    this.planPriceIds = config.planPriceIds;
  }

  async createCheckoutSession(
    tenantId: string,
    plan: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundError('Tenant not found');

    const priceId = this.planPriceIds[plan];
    if (!priceId) throw new BusinessRuleError(`Invalid or unconfigured plan: ${plan}`);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tenantId },
    });

    return { url: session.url! };
  }

  async createPortalSession(tenantId: string, returnUrl: string): Promise<{ url: string }> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId },
      select: { stripeCustomerId: true },
    });
    if (!subscription?.stripeCustomerId) {
      throw new NotFoundError('No active subscription found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch {
      throw new BusinessRuleError('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'invoice.paid': {
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }
      case 'customer.subscription.deleted': {
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.['tenantId'];
    if (!tenantId || !session.subscription) return;

    const stripeSub = await this.stripe.subscriptions.retrieve(session.subscription as string);

    await this.prisma.subscription.upsert({
      where: { stripeSubscriptionId: stripeSub.id },
      create: {
        tenantId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: stripeSub.id,
        plan: 'GROWTH',
        status: 'ACTIVE',
        currentPeriodStart: new Date((stripeSub.current_period_start as number) * 1000),
        currentPeriodEnd: new Date((stripeSub.current_period_end as number) * 1000),
      },
      update: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: stripeSub.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date((stripeSub.current_period_start as number) * 1000),
        currentPeriodEnd: new Date((stripeSub.current_period_end as number) * 1000),
      },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;
    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription as string },
      select: { id: true, tenantId: true },
    });
    if (!sub) return;

    await this.prisma.stripeInvoice.create({
      data: {
        tenantId: sub.tenantId,
        subscriptionId: sub.id,
        stripeId: invoice.id,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        status: 'PAID',
        periodStart: new Date((invoice.period_start as number) * 1000),
        periodEnd: new Date((invoice.period_end as number) * 1000),
        ...(invoice.invoice_pdf ? { pdfUrl: invoice.invoice_pdf } : {}),
      },
    });
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }
}

