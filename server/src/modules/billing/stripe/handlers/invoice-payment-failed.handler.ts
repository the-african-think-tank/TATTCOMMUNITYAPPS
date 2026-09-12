import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import Stripe from 'stripe';
import { IStripeWebhookHandler } from '../interfaces/webhook-handler.interface';
import { User } from '../../../iam/entities/user.entity';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { NotificationType } from '../../../notifications/entities/notification.entity';
import { MailService } from '../../../../common/mail/mail.service';

@Injectable()
export class InvoicePaymentFailedHandler implements IStripeWebhookHandler {
    readonly eventType: Stripe.Event.Type = 'invoice.payment_failed';
    private readonly logger = new Logger(InvoicePaymentFailedHandler.name);

    constructor(
        @InjectModel(User) private readonly userRepo: typeof User,
        private readonly notificationsService: NotificationsService,
        private readonly mailService: MailService,
    ) {}

    async handle(event: Stripe.Event): Promise<void> {
        const invoice = event.data.object as Stripe.Invoice;
        this.logger.warn(`Handling invoice.payment_failed for invoice: ${invoice.id}`);

        const customerId = invoice.customer as string;
        const user = await this.userRepo.findOne({ where: { stripeCustomerId: customerId } });
        if (!user) {
            this.logger.warn(`Payment failed for unknown Stripe customer: ${customerId}`);
            return;
        }

        const updateUrl = `${process.env.FRONTEND_URL || 'https://community.theafricanthinktank.com'}/dashboard/settings`;

        // 1. Send urgent in-app notification
        await this.notificationsService.create(
            user.id,
            NotificationType.SYSTEM_ALERT,
            'Payment Failed — Please Update Your Card',
            `Your renewal payment of $${((invoice.amount_due || 0) / 100).toFixed(2)} could not be processed. Please update your payment method to avoid service interruption.`,
            { invoiceId: invoice.id, updateUrl },
            false,
        );

        // 2. Send urgent email notification
        try {
            await this.mailService.sendNotificationEmail(
                user.email,
                user.firstName,
                'Urgent: Action Required — TATT Subscription Payment Failed',
                `We were unable to process your recurring membership renewal payment ($${((invoice.amount_due || 0) / 100).toFixed(2)}).\n\nYour access remains temporarily active, but please update your payment method now to prevent your membership from expiring.\n\nUpdate Payment Method: ${updateUrl}`,
                updateUrl,
                'Update Payment Method',
            );
            this.logger.log(`Dispatched dunning payment failure email to ${user.email}`);
        } catch (mailErr: any) {
            this.logger.error(`Failed to send dunning email to ${user.email}: ${mailErr.message}`);
        }
    }
}
