import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import Stripe from 'stripe';
import { IStripeWebhookHandler } from '../interfaces/webhook-handler.interface';
import { User } from '../../../iam/entities/user.entity';
import { StripeClientService } from '../services/stripe-client.service';
import { BillingTransactionService } from '../../services/billing-transaction.service';
import { TransactionStatus, TransactionType } from '../../../revenue/entities/financial-transaction.entity';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { NotificationType } from '../../../notifications/entities/notification.entity';

@Injectable()
export class InvoicePaymentSucceededHandler implements IStripeWebhookHandler {
    readonly eventType: Stripe.Event.Type = 'invoice.payment_succeeded';
    private readonly logger = new Logger(InvoicePaymentSucceededHandler.name);

    constructor(
        @InjectModel(User) private readonly userRepo: typeof User,
        private readonly stripeClient: StripeClientService,
        private readonly transactionService: BillingTransactionService,
        private readonly notificationsService: NotificationsService,
    ) {}

    async handle(event: Stripe.Event): Promise<void> {
        const invoice = event.data.object as Stripe.Invoice;
        this.logger.log(`Handling invoice.payment_succeeded for invoice: ${invoice.id}`);

        const customerId = invoice.customer as string;
        const subscriptionId = (invoice as any).subscription as string;

        const user = await this.userRepo.findOne({ where: { stripeCustomerId: customerId } });
        if (!user) {
            this.logger.warn(`Invoice paid for unknown Stripe customer: ${customerId}`);
            return;
        }

        // 1. Advance expiration date if attached to a recurring subscription
        let expiresAt: Date | null = null;
        if (subscriptionId) {
            try {
                const stripe = await this.stripeClient.getClient();
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const currentPeriodEnd = (sub as any).current_period_end;
                if (currentPeriodEnd) {
                    expiresAt = new Date(currentPeriodEnd * 1000);
                    user.subscriptionExpiresAt = expiresAt;
                    await user.save();
                    this.logger.log(`Advanced subscription expiry for ${user.email} to ${expiresAt.toISOString()}`);
                }
            } catch (subErr: any) {
                this.logger.warn(`Could not retrieve subscription details for invoice ${invoice.id}: ${subErr.message}`);
            }
        }

        // 2. Record FinancialTransaction idempotently
        const paymentIntentId = (invoice as any).payment_intent as string;
        await this.transactionService.recordTransaction({
            userId: user.id,
            chapterId: user.chapterId,
            type: TransactionType.SUBSCRIPTION,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency?.toUpperCase() || 'USD',
            status: TransactionStatus.COMPLETED,
            stripePaymentIntentId: paymentIntentId,
            referenceNumber: `INV-${invoice.id}`,
            membershipTier: user.communityTier,
            metadata: {
                invoiceId: invoice.id,
                subscriptionId,
            },
        });

        // 3. Send renewal success notification
        if (expiresAt) {
            await this.notificationsService.create(
                user.id,
                NotificationType.SUBSCRIPTION_RENEWAL,
                'Subscription Renewed',
                `Your ${user.communityTier} membership renewed successfully until ${expiresAt.toLocaleDateString()}.`,
                { expiresAt, invoiceId: invoice.id },
                true, // email notification
            );
        }
    }
}
