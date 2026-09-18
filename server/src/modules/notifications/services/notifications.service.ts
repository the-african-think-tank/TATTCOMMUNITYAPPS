import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Notification, NotificationType } from '../entities/notification.entity';
import { User } from '../../iam/entities/user.entity';
import { MailService } from '../../../common/mail/mail.service';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        @InjectModel(Notification) private notificationRepo: typeof Notification,
        @InjectModel(User) private userRepo: typeof User,
        private mailService: MailService,
    ) { }

    async create(
        userId: string,
        type: NotificationType,
        title: string,
        message: string,
        data: any = null,
        sendEmail: boolean = true
    ) {
        const user = await this.userRepo.findByPk(userId);
        if (!user) {
            this.logger.error(`Cannot create notification: User ${userId} not found`);
            return;
        }

        const notification = await this.notificationRepo.create({
            userId,
            type,
            title,
            message,
            data,
        });

        if (sendEmail) {
            const actionLink = this.getActionLink(type, data);
            const actionLabel = this.getActionLabel(type);

            await this.mailService.sendNotificationEmail(
                user.email,
                user.firstName || 'Member',
                title,
                message,
                actionLink,
                actionLabel
            );

            notification.isEmailSent = true;
            await notification.save();
        }

        return notification;
    }

    async findAll(userId: string) {
        return this.notificationRepo.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 50,
        });
    }

    async markAsRead(userId: string, id: string) {
        const notification = await this.notificationRepo.findOne({
            where: { id, userId },
        });

        if (!notification) throw new NotFoundException('Notification not found');

        notification.readAt = new Date();
        await notification.save();
        return notification;
    }

    async markAllRead(userId: string) {
        return this.notificationRepo.update(
            { readAt: new Date() },
            {
                where: {
                    userId,
                    readAt: null,
                    dismissedAt: null,
                },
            },
        );
    }

    async dismiss(userId: string, id: string) {
        const notification = await this.notificationRepo.findOne({
            where: { id, userId },
        });

        if (!notification) throw new NotFoundException('Notification not found');

        notification.dismissedAt = new Date();
        await notification.save();
        return notification;
    }

    async delete(userId: string, id: string) {
        const notification = await this.notificationRepo.findOne({
            where: { id, userId },
        });

        if (!notification) throw new NotFoundException('Notification not found');

        await notification.destroy();
    }

    private getActionLink(type: NotificationType, data: any): string | undefined {
        // Build frontend links based on notification type and data
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        switch (type) {
            case NotificationType.CONNECTION_REQUEST:
                return `${baseUrl}/dashboard/messages?tab=pending`;
            case NotificationType.NEW_MESSAGE:
                return `${baseUrl}/dashboard/messages/${data?.connectionId || ''}`;
            case NotificationType.SUBSCRIPTION_EXPIRING:
            case NotificationType.SUBSCRIPTION_RENEWAL:
            case NotificationType.SUBSCRIPTION_DOWNGRADE:
                return `${baseUrl}/dashboard/settings`;
            case NotificationType.EVENT_REMINDER:
                return `${baseUrl}/dashboard/events/${data?.eventId || ''}`;
            case NotificationType.VOLUNTEER_ACTIVITY:
            case NotificationType.VOLUNTEER_ROLE:
                return `${baseUrl}/dashboard/volunteers`;
            case NotificationType.SUPPORT_TICKET_CREATED:
            case NotificationType.SUPPORT_MESSAGE_RECEIVED:
            case NotificationType.SUPPORT_TICKET_RESOLVED:
                return `${baseUrl}/dashboard/support/ticket/${data?.ticketId || ''}`;
            default:
                return `${baseUrl}/dashboard`;
        }
    }

    private getActionLabel(type: NotificationType): string {
        switch (type) {
            case NotificationType.CONNECTION_REQUEST:
                return 'View Request';
            case NotificationType.NEW_MESSAGE:
                return 'Reply Now';
            case NotificationType.SUBSCRIPTION_EXPIRING:
                return 'Renew Membership';
            case NotificationType.EVENT_REMINDER:
                return 'View Event';
            case NotificationType.VOLUNTEER_ACTIVITY:
                return 'View My Activities';
            case NotificationType.VOLUNTEER_ROLE:
                return 'View Profile';
            case NotificationType.SUPPORT_TICKET_CREATED:
                return 'View Ticket';
            case NotificationType.SUPPORT_MESSAGE_RECEIVED:
                return 'Read History';
            case NotificationType.SUPPORT_TICKET_RESOLVED:
                return 'View Case Detail';
            default:
                return 'View Dashboard';
        }
    }
}
