import Stripe from 'stripe';

export interface IStripeWebhookHandler {
    /**
     * Unique Stripe event type string (e.g. 'invoice.payment_succeeded')
     */
    readonly eventType: Stripe.Event.Type;

    /**
     * Executes isolated domain logic for the specific Stripe event.
     */
    handle(event: Stripe.Event): Promise<void>;
}
