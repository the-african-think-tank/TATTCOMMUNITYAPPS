import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import Stripe from 'stripe';
import { IStripeWebhookHandler } from '../interfaces/webhook-handler.interface';
import { User } from '../../../iam/entities/user.entity';
import { CommunityTier } from '../../../iam/enums/roles.enum';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { NotificationType } from '../../../notifications/entities/notification.entity';
import { MailService } from '../../../../common/mail/mail.service';

@Injectable()
export class SubscriptionDeletedHandler implements IStripeWebhookHandler {
    readonly eventType: Stripe.Event.Type = 'customer.subscription.deleted';
    private readonly logger = new Logger(SubscriptionDeletedHandler.name);

    constructor(
        @InjectModel(User) private readonly userRepo: typeof User,
        private readonly notificationsService: NotificationsService,
        private readonly mailService: MailService,
    ) {}

    async handle(event: Stripe.Event): Promise<void> {
        const subscription = event.data.object as Stripe.Subscription;
        this.logger.log(`Handling customer.subscription.deleted for subscription: ${subscription.id}`);

        const customerId = subscription.customer as string;
        const user = await this.userRepo.findOne({ where: { stripeCustomerId: customerId } });
        if (!user) return;

        const previousTier = user.communityTier;
        user.communityTier = CommunityTier.FREE;
        user.subscriptionExpiresAt = null;
        user.pendingTier = null;
        user.hasAutoPayEnabled = false;
        await user.save();

        this.logger.log(`Downgraded user ${user.email} from ${previousTier} to FREE tier`);

        // 1. Send downgrade notice email
        try {
            await this.mailService.sendSubscriptionDowngradeNotice(
                user.email,
                user.firstName,
                subscription.status || 'canceled',
            );
        } catch (mailErr: any) {
            this.logger.warn(`Could not send downgrade email to ${user.email}: ${mailErr.message}`);
        }

        // 2. Send in-app notification
        await this.notificationsService.create(
            user.id,
            NotificationType.SUBSCRIPTION_DOWNGRADE,
            'Membership Concluded',
            `Your ${previousTier} membership has concluded. You are now on the Free tier. Upgrade anytime to restore your benefits.`,
            { previousTier, status: subscription.status },
            false,
        );
    }
}
