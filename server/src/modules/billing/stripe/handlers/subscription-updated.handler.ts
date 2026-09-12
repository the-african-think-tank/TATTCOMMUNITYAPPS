import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import Stripe from 'stripe';
import { IStripeWebhookHandler } from '../interfaces/webhook-handler.interface';
import { User } from '../../../iam/entities/user.entity';

@Injectable()
export class SubscriptionUpdatedHandler implements IStripeWebhookHandler {
    readonly eventType: Stripe.Event.Type = 'customer.subscription.updated';
    private readonly logger = new Logger(SubscriptionUpdatedHandler.name);

    constructor(@InjectModel(User) private readonly userRepo: typeof User) {}

    async handle(event: Stripe.Event): Promise<void> {
        const subscription = event.data.object as Stripe.Subscription;
        this.logger.log(`Handling customer.subscription.updated for subscription: ${subscription.id}`);

        const customerId = subscription.customer as string;
        const user = await this.userRepo.findOne({ where: { stripeCustomerId: customerId } });
        if (!user) return;

        // 1. Sync auto-pay status
        const isAutoPayEnabled = !subscription.cancel_at_period_end;
        if (user.hasAutoPayEnabled !== isAutoPayEnabled) {
            user.hasAutoPayEnabled = isAutoPayEnabled;
            await user.save();
            this.logger.log(`User ${user.email} auto-pay status updated to: ${isAutoPayEnabled}`);
        }

        // 2. Sync period end if updated
        const currentPeriodEnd = (subscription as any).current_period_end;
        if (currentPeriodEnd) {
            const newExpiry = new Date(currentPeriodEnd * 1000);
            if (!user.subscriptionExpiresAt || user.subscriptionExpiresAt.getTime() !== newExpiry.getTime()) {
                user.subscriptionExpiresAt = newExpiry;
                await user.save();
            }
        }
    }
}
