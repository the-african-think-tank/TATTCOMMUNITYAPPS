import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { InjectModel } from '@nestjs/sequelize';
import { SupportTicket, TicketStatus } from './entities/support-ticket.entity';
import { SupportFaq } from './entities/support-faq.entity';
import { SupportFaqCategory } from './entities/support-faq-category.entity';
import { CreateTicketDto, ResolveTicketDto, CreateFaqDto } from './dto/support.dto';
import { User } from '../iam/entities/user.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SystemRole } from '../iam/enums/roles.enum';

@Injectable()
export class SupportService {
    constructor(
        @InjectModel(SupportTicket) private ticketRepo: typeof SupportTicket,
        @InjectModel(SupportFaq) private faqRepo: typeof SupportFaq,
        @InjectModel(SupportFaqCategory) private categoryRepo: typeof SupportFaqCategory,
        @InjectModel(User) private userRepo: typeof User,
        @InjectModel(SupportMessage) private messageRepo: typeof SupportMessage,
        private notificationsService: NotificationsService,
    ) { }

    // --- DASHBOARD OVERVIEW ---
    async getDashboardStats() {
        try {
            const openTickets = await this.ticketRepo.count({
                where: { status: [TicketStatus.NEW, TicketStatus.OPEN, TicketStatus.PENDING] }
            });
            
            const unresolvedUrgent = await this.ticketRepo.count({
                where: { status: [TicketStatus.NEW, TicketStatus.OPEN], category: 'TECHNICAL' }
            });

            const avgResponseTime = '1.4h';

            const activeTickets = await this.ticketRepo.findAll({
                limit: 10,
                order: [['createdAt', 'DESC']],
                include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'profilePicture'] }]
            });

            const categories = await this.categoryRepo.findAll({
                include: [{
                    model: SupportFaq,
                    where: { isActive: true },
                    required: false
                }]
            });

            const faqs = categories.map(cat => ({
                category: cat.category,
                count: cat.questions ? cat.questions.length : 0
            }));

            return {
                openTickets,
                avgResponseTime,
                unresolvedUrgent,
                activeTickets,
                faqs
            };
        } catch (error) {
            console.error('[SupportService] Dashboard Stats Error:', error);
            return {
                openTickets: 0,
                avgResponseTime: '0h',
                unresolvedUrgent: 0,
                activeTickets: [],
                faqs: [],
                error: error.message
            };
        }
    }

    // --- SUPPORT TICKETS ---
    async createTicket(userId: string, dto: CreateTicketDto) {
        const ticketNumber = `TATT-${Math.floor(1000 + Math.random() * 9000)}`;
        const ticket = await this.ticketRepo.create({
            ...dto,
            userId,
            ticketNumber,
        } as any);

        // Notify member of confirmation
        await this.notificationsService.create(
            userId,
            NotificationType.SUPPORT_TICKET_CREATED,
            'Support Request Filed',
            `Your transmission #${ticketNumber} has been received into the TATT Archive. We will review it shortly.`,
            { ticketId: ticket.id }
        );

        // OPTIONAL: Notify all Admins?
        const admins = await this.userRepo.findAll({ 
            where: { systemRole: [SystemRole.ADMIN, SystemRole.SUPERADMIN] } as any 
        });
        for (const admin of admins) {
            await this.notificationsService.create(
                admin.id,
                NotificationType.SUPPORT_TICKET_CREATED,
                'New Support Request Created',
                `A new membership inquiry #${ticketNumber} has been filed by ${ticket.userId}.`,
                { ticketId: ticket.id },
                true // Email the admin too
            );
        }

        return ticket;
    }

    async resolveTicket(ticketId: string, dto: ResolveTicketDto) {
        const ticket = await this.ticketRepo.findByPk(ticketId);
        if (!ticket) throw new NotFoundException('Ticket not found');

        ticket.status = TicketStatus.RESOLVED;
        ticket.resolvedAt = new Date();
        if (dto.adminNotes) {
            ticket.adminNotes = dto.adminNotes;
        }
        await ticket.save();

        // Notify member of resolution
        await this.notificationsService.create(
            ticket.userId,
            NotificationType.SUPPORT_TICKET_RESOLVED,
            'Support Request Resolved',
            `Issue #${ticket.ticketNumber} ("${ticket.subject}") has been marked as resolved in the Archive.`,
            { ticketId: ticket.id }
        );

        return ticket;
    }

    async getMemberTickets(userId: string) {
        return this.ticketRepo.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });
    }

    async getTicketById(ticketId: string) {
        console.log(`[SupportService] Fetching ticket diagnostic: ${ticketId}`);
        // Diagnostic: first find without any includes or paranoid filter
        const rawTicket = await this.ticketRepo.findByPk(ticketId, { paranoid: false });
        if (rawTicket) {
            console.log(`[SupportService] Ticket found in DB but maybe soft-deleted or has failing includes. Deleted: ${!!rawTicket.deletedAt}`);
        } else {
            console.error(`[SupportService] Ticket ID absolutely NOT found in DB: ${ticketId}`);
        }

        const ticket = await this.ticketRepo.findByPk(ticketId, {
            include: [
                { model: User, attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'email', 'createdAt', 'tattMemberId', 'communityTier'] },
                { 
                    model: SupportMessage, 
                    include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'profilePicture'] }],
                    as: 'messages'
                }
            ]
        });
        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }
        return ticket;
    }

    async updateTicket(ticketId: string, dto: any, senderId?: string) {
        const ticket = await this.ticketRepo.findByPk(ticketId);
        if (!ticket) throw new NotFoundException('Ticket not found');

        if (dto.status) ticket.status = dto.status;
        
        // Handle adminNotes as a message if provided
        if (dto.adminNotes && senderId) {
            await this.messageRepo.create({
                ticketId,
                senderId,
                message: dto.adminNotes,
                isAdminResponse: true // This method is called from admin-like context or generalized update
            } as any);
            // We also update adminNotes on ticket for legacy/preview display if needed
            ticket.adminNotes = dto.adminNotes;
        }

        if (Object.prototype.hasOwnProperty.call(dto, 'resolvedAt')) {
            ticket.resolvedAt = dto.resolvedAt;
        }
        
        await ticket.save();
        return ticket;
    }

    // Explicitly add message (used for member responses)
    async addMessage(ticketId: string, senderId: string, message: string, isAdmin: boolean) {
        const ticket = await this.ticketRepo.findByPk(ticketId, {
            include: [{ model: User, attributes: ['id', 'firstName', 'lastName'] }]
        });
        if (!ticket) throw new NotFoundException('Ticket not found');

        const msg = await this.messageRepo.create({
            ticketId,
            senderId,
            message,
            isAdminResponse: isAdmin
        } as any);

        if (isAdmin) {
            ticket.adminNotes = message;
        }
        
        if (ticket.status === TicketStatus.RESOLVED) {
            ticket.status = TicketStatus.OPEN;
            ticket.resolvedAt = null;
        }

        await ticket.save();

        // Cross-notify (if admin spoke, notify user. if user spoke, notify admin usually - for now let's notify the ticket owner if it was an admin response)
        if (isAdmin) {
            await this.notificationsService.create(
                ticket.userId,
                NotificationType.SUPPORT_MESSAGE_RECEIVED,
                'New Message from TATT Support',
                `A new response has been transmitted concerning your ticket: "${ticket.subject}".`,
                { ticketId: ticket.id }
            );
        } else {
            // Member responded. Notify Admins.
            const admins = await this.userRepo.findAll({ 
                where: { systemRole: [SystemRole.ADMIN, SystemRole.SUPERADMIN] } as any 
            });
            for (const admin of admins) {
                await this.notificationsService.create(
                    admin.id,
                    NotificationType.SUPPORT_MESSAGE_RECEIVED,
                    'New Support Response Received',
                    `A member has responded to ticket #${ticket.ticketNumber} ("${ticket.subject}").`,
                    { ticketId: ticket.id },
                    true
                );
            }
        }

        return msg;
    }

    // --- FAQS ---
    async createFaq(dto: CreateFaqDto) {
        const formattedCategory = dto.category.toUpperCase().trim();
        const [categoryRecord] = await this.categoryRepo.findOrCreate({
            where: { category: formattedCategory }
        });
        return this.faqRepo.create({
            question: dto.question,
            answer: dto.answer,
            isActive: dto.isActive !== undefined ? dto.isActive : true,
            categoryId: categoryRecord.id
        } as any);
    }

    async getFaqs() {
        const categories = await this.categoryRepo.findAll({
            include: [{
                model: SupportFaq,
                where: { isActive: true },
                required: false
            }],
            order: [['category', 'ASC']]
        });
        return categories.map(cat => ({
            id: cat.id,
            category: cat.category,
            questions: (cat.questions || []).map(q => ({
                id: q.id,
                question: q.question,
                answer: q.answer,
                category: cat.category,
                isActive: q.isActive
            }))
        }));
    }

    async updateFaq(id: string, dto: Partial<CreateFaqDto>) {
        const faq = await this.faqRepo.findByPk(id);
        if (!faq) throw new Error('FAQ not found');
        
        const updateData: any = { ...dto };
        if (dto.category) {
            const formattedCategory = dto.category.toUpperCase().trim();
            const [categoryRecord] = await this.categoryRepo.findOrCreate({
                where: { category: formattedCategory }
            });
            updateData.categoryId = categoryRecord.id;
            delete updateData.category;
        }
        return faq.update(updateData);
    }

    async deleteFaq(id: string) {
        const faq = await this.faqRepo.findByPk(id);
        if (!faq) throw new Error('FAQ not found');
        await faq.destroy();
        return { message: 'FAQ deleted successfully' };
    }

    async deleteCategory(id: string) {
        const category = await this.categoryRepo.findByPk(id);
        if (!category) throw new Error('Category not found');
        
        await this.faqRepo.destroy({
            where: { categoryId: id }
        });
        
        await category.destroy();
        return { message: 'Category and all associated FAQs deleted successfully' };
    }
}
