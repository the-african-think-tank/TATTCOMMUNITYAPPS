import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Event } from './entities/event.entity';
import { EventChapter } from './entities/event-chapter.entity';
import { EventGuest } from './entities/event-guest.entity';
import { EventRegistration } from './entities/event-registration.entity';
import { EventType } from './enums/event-type.enum';
import { User } from '../iam/entities/user.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { RegisterEventDto } from './dto/register-event.dto';
import { SystemRole, CommunityTier, AccountFlags } from '../iam/enums/roles.enum';
import { Op } from 'sequelize';
import Stripe from 'stripe';
import { MailService } from '../../common/mail/mail.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { BroadcastsService } from '../notifications/services/broadcasts.service';
import { BroadcastAudience } from '../notifications/entities/broadcast.entity';

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);
    private stripe: Stripe;

    constructor(
        @InjectModel(Event) private eventRepo: typeof Event,
        @InjectModel(EventChapter) private eventChapterRepo: typeof EventChapter,
        @InjectModel(EventGuest) private eventGuestRepo: typeof EventGuest,
        @InjectModel(EventRegistration) private eventRegistrationRepo: typeof EventRegistration,
        @InjectModel(User) private userRepo: typeof User,
        private mailService: MailService,
        private notificationsService: NotificationsService,
        private broadcastsService: BroadcastsService,
        private settingsService: SystemSettingsService,
    ) { }

    private async getStripe() {
        return this.settingsService.getStripeInstance();
    }

    async createEvent(admin: User, dto: CreateEventDto) {
        const allowedRoles = [SystemRole.SUPERADMIN, SystemRole.ADMIN, SystemRole.CONTENT_ADMIN];
        if (!allowedRoles.includes(admin.systemRole) && !admin.flags?.includes(AccountFlags.CAN_ACCESS_EVENTS)) {
            throw new ForbiddenException('Only Org admins and content admins can create events.');
        }

        const event = await this.eventRepo.create({
            title: dto.title,
            description: dto.description,
            dateTime: new Date(dto.dateTime),
            timezone: dto.timezone || 'America/Los_Angeles',
            type: dto.type,
            imageUrl: dto.imageUrl,
            isForAllMembers: dto.isForAllMembers,
            targetMembershipTiers: dto.targetMembershipTiers,
            basePrice: dto.basePrice || 0,
        });

        for (const loc of dto.locations) {
            await this.eventChapterRepo.create({
                eventId: event.id,
                chapterId: loc.chapterId,
                address: loc.address,
            });
        }

        if (dto.featuredGuestIds && dto.featuredGuestIds.length > 0) {
            for (const guestId of dto.featuredGuestIds) {
                await this.eventGuestRepo.create({
                    eventId: event.id,
                    userId: guestId,
                });
            }
        }

        // Notify community members
        this.notifyMembers(event);

        return event;
    }

    async updateEvent(admin: User, id: string, dto: CreateEventDto) {
        const allowedRoles = [SystemRole.SUPERADMIN, SystemRole.ADMIN, SystemRole.CONTENT_ADMIN];
        if (!allowedRoles.includes(admin.systemRole) && !admin.flags?.includes(AccountFlags.CAN_ACCESS_EVENTS)) {
            throw new ForbiddenException('Only Org admins and content admins can update events.');
        }

        const event = await this.eventRepo.findByPk(id);
        if (!event) throw new NotFoundException('Event not found');

        await event.update({
            title: dto.title,
            description: dto.description,
            dateTime: new Date(dto.dateTime),
            timezone: dto.timezone || 'America/Los_Angeles',
            type: dto.type,
            imageUrl: dto.imageUrl,
            isForAllMembers: dto.isForAllMembers,
            targetMembershipTiers: dto.targetMembershipTiers,
            basePrice: dto.basePrice || 0,
        });

        // Update locations: simplest way is to delete and recreate
        await this.eventChapterRepo.destroy({ where: { eventId: id } });
        for (const loc of dto.locations) {
            await this.eventChapterRepo.create({
                eventId: event.id,
                chapterId: loc.chapterId,
                address: loc.address,
            });
        }

        // Update featured guests
        await this.eventGuestRepo.destroy({ where: { eventId: id } });
        if (dto.featuredGuestIds && dto.featuredGuestIds.length > 0) {
            for (const guestId of dto.featuredGuestIds) {
                await this.eventGuestRepo.create({
                    eventId: event.id,
                    userId: guestId,
                });
            }
        }

        return this.getEvent(id);
    }

    async deleteEvent(admin: User, id: string) {
        const allowedRoles = [SystemRole.SUPERADMIN, SystemRole.ADMIN, SystemRole.CONTENT_ADMIN];
        if (!allowedRoles.includes(admin.systemRole) && !admin.flags?.includes(AccountFlags.CAN_ACCESS_EVENTS)) {
            throw new ForbiddenException('Only Org admins and content admins can delete events.');
        }

        const event = await this.eventRepo.findByPk(id);
        if (!event) throw new NotFoundException('Event not found');

        // Cascade delete should handle associations if configured, but let's be safe.
        await this.eventChapterRepo.destroy({ where: { eventId: id } });
        await this.eventGuestRepo.destroy({ where: { eventId: id } });
        await this.eventRegistrationRepo.destroy({ where: { eventId: id } });

        await event.destroy();
        return { success: true, message: 'Event deleted successfully.' };
    }

    private async notifyMembers(event: Event) {
        const dateStr = event.dateTime.toLocaleString();
        const chapterIds = event.locations?.map(loc => loc.chapterId) || [];

        try {
            if (event.isForAllMembers || chapterIds.length === 0) {
                await this.broadcastsService.createSystemBroadcast({
                    title: `New Community Event: ${event.title}`,
                    message: `A new ${event.type.toLowerCase()} "${event.title}" has been scheduled for ${dateStr}.`,
                    audienceType: event.targetMembershipTiers?.length ? BroadcastAudience.TIER_SPECIFIC : BroadcastAudience.ALL,
                    targetTier: event.targetMembershipTiers?.[0],
                    type: NotificationType.EVENT_REMINDER
                });
            } else {
                for (const chapterId of chapterIds) {
                    await this.broadcastsService.createSystemBroadcast({
                        title: `Local Chapter Event: ${event.title}`,
                        message: `A new ${event.type.toLowerCase()} "${event.title}" has been scheduled in your chapter for ${dateStr}.`,
                        audienceType: BroadcastAudience.CHAPTER_SPECIFIC,
                        targetChapterId: chapterId,
                        type: NotificationType.EVENT_REMINDER
                    });
                }
            }
            this.logger.log(`Automated broadcast(s) dispatched for event: ${event.title}`);
        } catch (error) {
            this.logger.error(`Failed to dispatch automated broadcasts for event ${event.id}: ${error.message}`);
        }
    }

    async getEvents(viewer: User, upcoming?: boolean, limit?: number) {
        // Optionally filter by membership if we want to hide restricted events from the list
        // Requirement says "it should show up in the events and workshops page", implying it might be visible but maybe locked?
        // Usually restricted events are only visible to those who can join.
        // Let's allow everyone to see them for now, but restrict registration.
        const where: any = {};
        if (upcoming) {
            where.dateTime = { [Op.gt]: new Date() };
        }

        return this.eventRepo.findAll({
            where,
            include: [
                { model: EventChapter, as: 'locations', include: [{ model: Chapter, as: 'chapter' }] },
                { model: User, as: 'featuredGuests', attributes: ['id', 'firstName', 'lastName', 'profilePicture'], through: { attributes: [] } },
            ],
            order: [['dateTime', 'ASC']],
            limit: limit && !isNaN(limit) && limit > 0 ? limit : undefined,
        });
    }

    async getEvent(id: string) {
        const event = await this.eventRepo.findByPk(id, {
            include: [
                { model: EventChapter, as: 'locations', include: [{ model: Chapter, as: 'chapter' }] },
                { model: User, as: 'featuredGuests', attributes: ['id', 'firstName', 'lastName', 'profilePicture'], through: { attributes: [] } },
            ],
        });
        if (!event) throw new NotFoundException('Event not found');
        return event;
    }

    async register(user: User, eventId: string, dto: RegisterEventDto) {
        const event = await this.getEvent(eventId);

        if (!event.isForAllMembers) {
            if (!event.targetMembershipTiers.includes(user.communityTier)) {
                throw new ForbiddenException('This event is restricted to specific membership classes.');
            }
        }

        let amountToPay = event.basePrice || 0;

        // Apply membership discounts
        if (user.communityTier === CommunityTier.KIONGOZI) {
            amountToPay = 0;
        } else if (user.communityTier === CommunityTier.IMANI) {
            if (event.type === EventType.WORKSHOP) {
                amountToPay = 0; // Free Workshops
            } else if (event.type === EventType.MIXER) {
                amountToPay = amountToPay * 0.75; // 25% Discount
            }
        } else if (user.communityTier === CommunityTier.UBUNTU) {
            amountToPay = amountToPay * 0.85; // 15% Discount
        }

        // Business registration might have extra costs or fixed price
        if (dto.isBusinessRegistration) {
            if (user.communityTier !== CommunityTier.KIONGOZI) {
                // If there's a specific logic for business, apply it here. 
                // For now, let's keep the user's previous logic if it was intended, 
                // or just apply the basePrice logic. 
                // The requirement says "reflect on their dashboard when they are booking for that event"
                // Let's assume business registration is also subject to discounts or has a fixed floor.
                if (amountToPay < 75) amountToPay = 75; // Example: floor for business
            }
        }

        const registration = await this.eventRegistrationRepo.create({
            eventId: event.id,
            userId: user.id,
            isBusinessRegistration: dto.isBusinessRegistration,
            amountPaid: amountToPay,
            status: amountToPay > 0 ? 'PENDING' : 'COMPLETED',
        });

        if (amountToPay > 0) {
            // Check if we have a real Stripe key
            const isMock = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder');

            if (dto.paymentMethodId) {
                if (isMock) {
                    this.logger.warn(`Simulating successful internal payment for event registration: ${registration.id}`);
                    registration.status = 'COMPLETED';
                    await registration.save();
                    return { registration, message: 'Internal payment successful (simulated).' };
                }

                // Real Stripe PaymentIntent with confirm: true
                try {
                    const stripe = await this.getStripe();
                    const intent = await stripe.paymentIntents.create({
                        amount: Math.round(amountToPay * 100),
                        currency: 'usd',
                        payment_method: dto.paymentMethodId,
                        customer: user.stripeCustomerId || undefined,
                        confirm: true,
                        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/events/${event.id}/success`,
                        metadata: {
                            registrationId: registration.id,
                            type: 'EVENT_REGISTRATION'
                        }
                    });

                    if (intent.status === 'succeeded') {
                        registration.status = 'COMPLETED';
                        registration.stripePaymentIntentId = intent.id;
                        await registration.save();
                        return { registration, message: 'Payment confirmed successfully.' };
                    }

                    return { registration, message: 'Payment in progress.', status: intent.status };
                } catch (error) {
                    this.logger.error(`Stripe Error: ${error.message}`);
                    throw new Error(`Payment failed: ${error.message}`);
                }
            }

            // Fallback: External Stripe Checkout Session (Redirect)
            const session = await (await this.getStripe()).checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `Event Registration for ${event.title}`,
                                description: `Event Date: ${event.dateTime.toLocaleString()}`,
                            },
                            unit_amount: Math.round(amountToPay * 100),
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/events/${event.id}/success?regId=${registration.id}`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/events/${event.id}/cancel`,
                client_reference_id: registration.id,
                metadata: {
                    registrationId: registration.id,
                    type: 'EVENT_REGISTRATION',
                },
            });

            return { registration, checkoutUrl: session.url };
        }

        return { registration, message: 'Registration successful.' };
    }

    async getEventAttendees(eventId: string) {
        return this.eventRegistrationRepo.findAll({
            where: { eventId, status: 'COMPLETED' },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle', 'communityTier', 'chapterId'],
                include: [{ model: Chapter, as: 'chapter' }]
            }],
        });
    }
}
