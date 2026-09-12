import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import Stripe from 'stripe';
import { IStripeWebhookHandler } from '../interfaces/webhook-handler.interface';
import { User } from '../../../iam/entities/user.entity';
import { CommunityTier, AccountFlags } from '../../../iam/enums/roles.enum';
import { EventRegistration } from '../../../events/entities/event-registration.entity';
import { Order, OrderStatus } from '../../../store/entities/order.entity';
import { BillingTransactionService } from '../../services/billing-transaction.service';
import { TransactionStatus, TransactionType } from '../../../revenue/entities/financial-transaction.entity';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { NotificationType } from '../../../notifications/entities/notification.entity';
import { MailService } from '../../../../common/mail/mail.service';
import { StripeClientService } from '../services/stripe-client.service';

@Injectable()
export class CheckoutCompletedHandler implements IStripeWebhookHandler {
    readonly eventType: Stripe.Event.Type = 'checkout.session.completed';
    private readonly logger = new Logger(CheckoutCompletedHandler.name);

    constructor(
        @InjectModel(User) private readonly userRepo: typeof User,
        @InjectModel(EventRegistration) private readonly eventRegistrationRepo: typeof EventRegistration,
        @InjectModel(Order) private readonly orderRepo: typeof Order,
        private readonly transactionService: BillingTransactionService,
        private readonly notificationsService: NotificationsService,
        private readonly mailService: MailService,
        private readonly stripeClient: StripeClientService,
    ) {}

    async handle(event: Stripe.Event): Promise<void> {
        const session = event.data.object as Stripe.Checkout.Session;
        this.logger.log(`Handling checkout.session.completed for session: ${session.id}`);

        if (session.metadata?.type === 'EVENT_REGISTRATION') {
            await this.handleEventRegistration(session);
        } else if (session.metadata?.type === 'STORE_ORDER') {
            await this.handleStoreOrder(session);
        } else if (session.mode === 'subscription' || session.metadata?.tier) {
            await this.handleSubscriptionCheckout(session);
        }
    }

    private async handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
        const userId = session.metadata?.userId;
        const tier = (session.metadata?.tier as CommunityTier) || CommunityTier.UBUNTU;
        const cycle = (session.metadata?.billingCycle as 'MONTHLY' | 'YEARLY') || 'MONTHLY';

        let user: User | null = null;
        if (userId) {
            user = await this.userRepo.findByPk(userId);
        }
        if (!user && session.customer) {
            user = await this.userRepo.findOne({ where: { stripeCustomerId: session.customer as string } });
        }
        if (!user && session.customer_details?.email) {
            user = await this.userRepo.findOne({ where: { email: session.customer_details.email } });
        }

        if (!user) {
            this.logger.warn(`checkout.session.completed: Could not find user for session ${session.id}`);
            return;
        }

        // 1. Link customer ID
        if (session.customer) {
            user.stripeCustomerId = session.customer as string;
        }

        // 2. If upgrading, safely cancel any prior active subscriptions so user is not double-billed on renewal
        if (session.customer && session.subscription) {
            try {
                const stripe = await this.stripeClient.getClient();
                const currentSubId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id;
                const subs = await stripe.subscriptions.list({
                    customer: session.customer as string,
                    status: 'active',
                });
                for (const sub of subs.data) {
                    if (sub.id !== currentSubId) {
                        await stripe.subscriptions.cancel(sub.id);
                        this.logger.log(`Canceled prior subscription ${sub.id} after new subscription checkout ${currentSubId}`);
                    }
                }
            } catch (subErr: any) {
                this.logger.warn(`Could not cancel previous subscriptions for customer ${session.customer}: ${subErr.message}`);
            }
        }

        // 3. Set active tier, cycle, auto-pay
        user.communityTier = tier;
        user.billingCycle = cycle;
        user.hasAutoPayEnabled = true;

        // 3. Set expiry date (1 month or 12 months)
        const durationMonths = cycle === 'YEARLY' ? 12 : 1;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
        user.subscriptionExpiresAt = expiresAt;

        // 4. Mark onboarding as complete
        const flags = user.flags || [];
        if (!flags.includes(AccountFlags.ONBOARDING_COMPLETED)) {
            user.flags = [...flags, AccountFlags.ONBOARDING_COMPLETED];
        }

        await user.save();

        // 5. Idempotently log FinancialTransaction
        const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
        await this.transactionService.recordTransaction({
            userId: user.id,
            chapterId: user.chapterId,
            type: TransactionType.SUBSCRIPTION,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency || 'USD',
            status: TransactionStatus.COMPLETED,
            stripePaymentIntentId: paymentIntentId,
            referenceNumber: `CHECKOUT-${session.id}`,
            membershipTier: tier,
            metadata: {
                sessionId: session.id,
                subscriptionId: session.subscription,
                cycle,
            },
        });

        // 6. Send in-app notification
        await this.notificationsService.create(
            user.id,
            NotificationType.SUBSCRIPTION_RENEWAL,
            'Membership Activated!',
            `Welcome to ${tier} tier! Your subscription is active until ${expiresAt.toLocaleDateString()}.`,
            { tier, cycle, expiresAt },
            false,
        );

        this.logger.log(`Subscription activated via webhook for user ${user.email} -> ${tier} (${cycle})`);
    }

    private async handleEventRegistration(session: Stripe.Checkout.Session) {
        const registrationId = session.metadata?.registrationId;
        if (!registrationId) return;

        const reg = await this.eventRegistrationRepo.findByPk(registrationId);
        if (!reg) return;

        reg.status = 'COMPLETED';
        reg.stripePaymentIntentId = session.payment_intent as string;
        await reg.save();

        this.logger.log(`Event registration ${registrationId} confirmed.`);
    }

    private async handleStoreOrder(session: Stripe.Checkout.Session) {
        const orderId = session.metadata?.orderId;
        if (!orderId) return;

        const order = await this.orderRepo.findByPk(orderId, { include: [{ model: User, as: 'customer' }] });
        if (!order) return;

        order.status = OrderStatus.CONFIRMED;
        await order.save();

        await this.transactionService.recordTransaction({
            userId: order.customerId,
            chapterId: order.customer?.chapterId,
            type: TransactionType.PRODUCT_SALE,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency || 'USD',
            status: TransactionStatus.COMPLETED,
            stripePaymentIntentId: session.payment_intent as string,
            referenceNumber: order.orderNumber,
            metadata: { orderId: order.id },
        });

        this.logger.log(`Store order ${order.orderNumber} confirmed.`);
    }
}
