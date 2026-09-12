import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import Stripe from 'stripe';
import { IStripeWebhookHandler } from '../interfaces/webhook-handler.interface';
import { User } from '../../../iam/entities/user.entity';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { NotificationType } from '../../../notifications/entities/notification.entity';
import { MailService } from '../../../../common/mail/mail.service';

@Injectable()
export class InvoiceUpcomingHandler implements IStripeWebhookHandler {
    readonly eventType: Stripe.Event.Type = 'invoice.upcoming';
    private readonly logger = new Logger(InvoiceUpcomingHandler.name);

    constructor(
        @InjectModel(User) private readonly userRepo: typeof User,
        private readonly notificationsService: NotificationsService,
        private readonly mailService: MailService,
    ) {}

    async handle(event: Stripe.Event): Promise<void> {
        const invoice = event.data.object as Stripe.Invoice;
        this.logger.log(`Handling invoice.upcoming for customer: ${invoice.customer}`);

        const customerId = invoice.customer as string;
        const user = await this.userRepo.findOne({ where: { stripeCustomerId: customerId } });
        if (!user) return;

        const amount = ((invoice.amount_due || invoice.total || 0) / 100).toFixed(2);
        const renewalDate = invoice.period_end ? new Date(invoice.period_end * 1000).toLocaleDateString() : 'soon';

        // In-app reminder
        await this.notificationsService.create(
            user.id,
            NotificationType.SUBSCRIPTION_EXPIRING,
            'Upcoming Membership Renewal',
            `Your ${user.communityTier} subscription will automatically renew on ${renewalDate} for $${amount}.`,
            { amount, renewalDate },
            false,
        );

        // Email reminder
        try {
            await this.mailService.sendNotificationEmail(
                user.email,
                user.firstName,
                'Notice: Upcoming TATT Membership Renewal',
                `This is a courtesy notice that your TATT ${user.communityTier} membership is scheduled to automatically renew on ${renewalDate} for $${amount}.\n\nIf you need to review your plan or billing details, you can visit your settings anytime.`,
                `${process.env.FRONTEND_URL || 'https://community.theafricanthinktank.com'}/dashboard/settings`,
                'View Subscription',
            );
        } catch (err: any) {
            this.logger.warn(`Could not dispatch invoice.upcoming email: ${err.message}`);
        }
    }
}
