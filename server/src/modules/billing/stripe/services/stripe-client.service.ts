import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { SystemSettingsService } from '../../../system-settings/system-settings.service';
import { StripeWebhookException } from '../errors/stripe.errors';

@Injectable()
export class StripeClientService {
    private readonly logger = new Logger(StripeClientService.name);
    private stripeInstance: Stripe | null = null;

    constructor(private readonly settingsService: SystemSettingsService) {}

    /**
     * Checks if the resolved Stripe API key is a valid active key (not dummy/placeholder).
     */
    isKeyConfigured(apiKey: string | null): boolean {
        if (!apiKey) return false;
        if (
            apiKey.includes('placeholder') ||
            apiKey.includes('your_') ||
            apiKey.includes('*****') ||
            apiKey.includes('dummy') ||
            !apiKey.startsWith('sk_')
        ) {
            return false;
        }
        return true;
    }

    /**
     * Resolves the active Stripe SDK instance (singleton with configuration resolution).
     */
    async getClient(): Promise<Stripe> {
        if (!this.stripeInstance) {
            const apiKey = (await this.settingsService.getRawValue('STRIPE_SECRET_KEY')) || process.env.STRIPE_SECRET_KEY;
            const finalKey = this.isKeyConfigured(apiKey) ? apiKey! : 'sk_test_placeholder';

            this.stripeInstance = new Stripe(finalKey, {
                timeout: 10000,
                maxNetworkRetries: 2,
                apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
            });
        }
        return this.stripeInstance;
    }

    /**
     * Validates cryptographic signature and constructs the Stripe Event from raw body.
     */
    async constructWebhookEvent(payload: Buffer, signature: string): Promise<Stripe.Event> {
        const webhookSecret = (await this.settingsService.getStripeWebhookSecret()) || process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret || webhookSecret.includes('placeholder')) {
            this.logger.error('STRIPE_WEBHOOK_SECRET is not configured.');
            throw new StripeWebhookException('Webhook signing secret is not configured.');
        }

        try {
            const stripe = await this.getClient();
            return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (err: any) {
            this.logger.error(`Webhook cryptographic signature verification failed: ${err.message}`);
            throw new StripeWebhookException(`Signature verification failed: ${err.message}`);
        }
    }
}
