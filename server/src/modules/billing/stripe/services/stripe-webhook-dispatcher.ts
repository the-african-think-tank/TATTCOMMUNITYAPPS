import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeClientService } from './stripe-client.service';
import { IStripeWebhookHandler } from '../interfaces/webhook-handler.interface';
import { CheckoutCompletedHandler } from '../handlers/checkout-completed.handler';
import { InvoicePaymentSucceededHandler } from '../handlers/invoice-payment-succeeded.handler';
import { InvoicePaymentFailedHandler } from '../handlers/invoice-payment-failed.handler';
import { InvoiceUpcomingHandler } from '../handlers/invoice-upcoming.handler';
import { SubscriptionUpdatedHandler } from '../handlers/subscription-updated.handler';
import { SubscriptionDeletedHandler } from '../handlers/subscription-deleted.handler';

@Injectable()
export class StripeWebhookDispatcher {
    private readonly logger = new Logger(StripeWebhookDispatcher.name);
    private readonly handlers = new Map<string, IStripeWebhookHandler>();

    constructor(
        private readonly stripeClient: StripeClientService,
        checkoutCompleted: CheckoutCompletedHandler,
        invoicePaid: InvoicePaymentSucceededHandler,
        invoiceFailed: InvoicePaymentFailedHandler,
        invoiceUpcoming: InvoiceUpcomingHandler,
        subscriptionUpdated: SubscriptionUpdatedHandler,
        subscriptionDeleted: SubscriptionDeletedHandler,
    ) {
        // Register all strategy handlers
        const handlerList: IStripeWebhookHandler[] = [
            checkoutCompleted,
            invoicePaid,
            invoiceFailed,
            invoiceUpcoming,
            subscriptionUpdated,
            subscriptionDeleted,
        ];

        for (const handler of handlerList) {
            this.handlers.set(handler.eventType, handler);
        }
        this.logger.log(`Initialized StripeWebhookDispatcher with ${this.handlers.size} event handlers.`);
    }

    /**
     * Verifies raw signature and dispatches the event to its dedicated handler.
     */
    async dispatch(payload: Buffer, signature: string): Promise<{ received: boolean; type: string }> {
        const event = await this.stripeClient.constructWebhookEvent(payload, signature);
        const startTime = Date.now();

        const handler = this.handlers.get(event.type);
        if (handler) {
            try {
                this.logger.log(`Dispatching event [${event.type}] (ID: ${event.id})...`);
                await handler.handle(event);
                const duration = Date.now() - startTime;
                this.logger.log(`Completed processing event [${event.type}] in ${duration}ms`);
            } catch (err: any) {
                this.logger.error(`Error processing webhook event [${event.type}]: ${err.message}`, err.stack);
                throw err; // Allow controller to return 400 so Stripe can retry if appropriate
            }
        } else {
            this.logger.log(`No handler registered for unhandled event type: ${event.type}`);
        }

        return { received: true, type: event.type };
    }
}
