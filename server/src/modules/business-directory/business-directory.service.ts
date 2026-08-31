import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BusinessPartner } from './entities/business-partner.entity';
import { CreateBusinessApplicationDto, UpdateBusinessStatusDto } from './dto/business-directory.dto';
import { MailService } from '../../common/mail/mail.service';
import { User } from '../iam/entities/user.entity';
import { Partnership } from '../partnerships/entities/partnership.entity';

@Injectable()
export class BusinessDirectoryService {
    private readonly logger = new Logger(BusinessDirectoryService.name);

    constructor(
        @InjectModel(BusinessPartner)
        private readonly businessPartnerModel: typeof BusinessPartner,
        @InjectModel(Partnership)
        private readonly partnershipModel: typeof Partnership,
        private readonly mailService: MailService,
    ) { }

    async apply(dto: CreateBusinessApplicationDto, userId: string) {
        this.logger.log(`[BusinessDirectoryService] Creating application for business: ${dto.name} from user ${userId}`);
        
        // Ensure user hasn't already submitted a business if logged in
        if (userId) {
            const existing = await this.businessPartnerModel.findOne({ where: { submittedById: userId } });
            if (existing) {
                throw new ConflictException("You have already submitted a business to the directory.");
            }
        }

        const business = await this.businessPartnerModel.create({
            ...dto,
            submittedById: userId,
            status: 'PENDING',
        });

        // Send submission confirmation
        if (business.contactEmail) {
            this.mailService.sendBusinessSubmissionEmail(
                business.contactEmail,
                business.contactName || 'Valued Partner',
                business.name
            );
        }

        return business;
    }

    async findAll(status?: string, category?: string, chapterId?: string, includeStrategic = true) {
        const where: any = {};
        if (status) where.status = status;
        if (category && category !== 'All Categories') where.category = category;
        if (chapterId) where.chapterId = chapterId;

        const businessPartners = await this.businessPartnerModel.findAll({
            where,
            include: ['chapter'],
            order: [['createdAt', 'DESC']],
        });

        // Only include active strategic partnerships if requested and view is all or approved
        let partnerships: any[] = [];
        if (includeStrategic && !chapterId && (!status || status === 'APPROVED') && this.partnershipModel) {
            const pWhere: any = { status: 'ACTIVE' };
            if (category && category !== 'All Categories') pWhere.category = category;
            
            partnerships = await (this.partnershipModel as any).findAll({
                where: pWhere,
                order: [['createdAt', 'DESC']]
            });
        }

        // Map partnerships to business partner format for frontend
        const mappedPartnerships = partnerships.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            website: p.website,
            logoUrl: p.logoUrl,
            perkOffer: p.description || 'Exclusive TATT Partner',
            locationText: 'Global / Strategic Partner',
            status: 'APPROVED',
            contactEmail: p.email,
            isStrategic: true, // flag for frontend
            perkButtonLabel: p.buttonLabel,
            perkLink: p.redemptionLink,
            clickCount: 0, // Strategic partners don't track clicks yet in this model
            createdAt: p.createdAt // Must include for frontend sorting/display
        }));

        return [...mappedPartnerships, ...businessPartners];
    }

    async findOne(id: string) {
        const business = await this.businessPartnerModel.findByPk(id, {
            include: ['submittedBy'],
        });
        if (business) return business;

        if (this.partnershipModel) {
            const p = await (this.partnershipModel as any).findByPk(id);
            if (p) {
                return {
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    website: p.website,
                    logoUrl: p.logoUrl,
                    perkOffer: p.description || 'Exclusive TATT Partner',
                    locationText: 'Global / Strategic Partner',
                    status: p.status === 'ACTIVE' ? 'APPROVED' : 'INACTIVE',
                    contactEmail: p.email,
                    contactName: p.contactName || 'Strategic Partner Representative',
                    contactPhone: '',
                    isVolunteer: false,
                    description: p.description || '',
                    ownershipType: 'Corporate Strategic Partner',
                    partnershipReason: 'Strategic Organizational Partner',
                    missionAlignment: 'Aligned with TATT Global Ecosystem',
                    benefitType: 'Exclusive Perk',
                    offerDuration: 'Ongoing',
                    typicalEngagement: 'Direct Partnership',
                    additionalInfo: '',
                    valuesAlignmentAgreed: true,
                    contactAgreed: true,
                    isStrategic: true,
                    perkButtonLabel: p.buttonLabel,
                    perkLink: p.redemptionLink,
                    clickCount: 0,
                    createdAt: p.createdAt,
                    adminNotes: 'Strategic Partnership (Managed in Corporate Partnerships Hub)',
                };
            }
        }

        throw new NotFoundException('Business partner not found');
    }

    async updateStatus(id: string, dto: UpdateBusinessStatusDto) {
        const business = await this.businessPartnerModel.findByPk(id);
        if (!business && this.partnershipModel) {
            const p = await (this.partnershipModel as any).findByPk(id);
            if (p) {
                p.status = dto.status === 'APPROVED' ? 'ACTIVE' : 'INACTIVE';
                await p.save();
                return this.findOne(id);
            }
        }
        if (!business) throw new NotFoundException('Business partner not found');

        const oldStatus = business.status;
        business.status = dto.status;
        if (dto.adminNotes) {
            business.adminNotes = dto.adminNotes;
        }
        await business.save();

        this.logger.log(`[BusinessDirectoryService] Status updated for ${business.name}: ${oldStatus} -> ${dto.status}`);

        if (dto.status === 'APPROVED') {
            try {
                const recipientName = business.contactName || business.name;
                await this.mailService.sendBusinessApprovedEmail(
                    business.contactEmail,
                    recipientName,
                    business.name
                );
            } catch (error) {
                this.logger.error(`Failed to send approval email for business ${id}`, error);
            }
        } else if (dto.status === 'DECLINED') {
            try {
                const recipientName = business.contactName || business.name;
                await this.mailService.sendBusinessDeclinedEmail(
                    business.contactEmail,
                    recipientName,
                    business.name,
                    dto.adminNotes
                );
                this.logger.log(`Rejection email sent to ${business.contactEmail}`);
            } catch (error) {
                this.logger.error(`Failed to send rejection email for business ${id}`, error);
            }
        }

        return business;
    }

    async trackClick(id: string) {
        const business = await this.businessPartnerModel.findByPk(id);
        if (business) {
            business.clickCount += 1;
            await business.save();
            this.logger.log(`[BusinessDirectoryService] Tracked click for ${business.name}. New count: ${business.clickCount}`);
            return { success: true, newCount: business.clickCount };
        }

        if (this.partnershipModel) {
            const p = await (this.partnershipModel as any).findByPk(id);
            if (p) {
                return { success: true, newCount: 0 };
            }
        }

        throw new NotFoundException('Business partner not found');
    }

    async getStats() {
        // Count both approved business partners and active strategic partnerships
        const activeBusinesses = await this.businessPartnerModel.count({ where: { status: 'APPROVED' } });
        const pendingApplications = await this.businessPartnerModel.count({ where: { status: 'PENDING' } });
        
        let activeStrategic = 0;
        if (this.partnershipModel) {
            activeStrategic = await (this.partnershipModel as any).count({ where: { status: 'ACTIVE' } });
        }
        
        const stats = await this.businessPartnerModel.findAll({
            attributes: [
                [this.businessPartnerModel.sequelize!.fn('SUM', this.businessPartnerModel.sequelize!.col('clickCount')), 'totalClicks'],
            ],
            raw: true,
        }) as any;

        const totalClicks = stats[0]?.totalClicks ? parseInt(stats[0].totalClicks) : 0;
        
        return {
            activePartners: activeBusinesses + activeStrategic,
            pendingApplications,
            memberRedemptions: totalClicks,
        };
    }

    async getMyBusiness(userId: string) {
        try {
            return await this.businessPartnerModel.findOne({
                where: { submittedById: userId },
                include: ['chapter'],
            });
        } catch (error) {
            this.logger.error(`[BusinessDirectoryService] Error fetching business for user ${userId}:`, error.stack);
            throw error;
        }
    }

    async upsertMyBusiness(userId: string, dto: CreateBusinessApplicationDto, userTier: string) {
        let business = await this.businessPartnerModel.findOne({
            where: { submittedById: userId },
        });

        // Kiongozi members get automatic approval
        const status = userTier === 'KIONGOZI' ? 'APPROVED' : 'PENDING';

        if (business) {
            this.logger.log(`[BusinessDirectoryService] Updating business ${business.id} for user ${userId}. Auto-approve: ${status === 'APPROVED'}`);
            const oldStatus = business.status;
            await business.update({
                ...dto,
                status,
            });

            // If it was pending and now it's approved (auto-approve case on update)
            if (oldStatus !== 'APPROVED' && status === 'APPROVED' && business.contactEmail) {
                this.mailService.sendBusinessApprovedEmail(
                    business.contactEmail,
                    business.contactName || 'Valued Partner',
                    business.name
                );
            }
        } else {
            this.logger.log(`[BusinessDirectoryService] Creating new business for user ${userId}. Auto-approve: ${status === 'APPROVED'}`);
            business = await this.businessPartnerModel.create({
                ...dto,
                submittedById: userId,
                status,
            });

            // Send notification for new creation
            if (business.contactEmail) {
                if (status === 'APPROVED') {
                    this.mailService.sendBusinessApprovedEmail(
                        business.contactEmail,
                        business.contactName || 'Valued Partner',
                        business.name
                    );
                } else {
                    this.mailService.sendBusinessSubmissionEmail(
                        business.contactEmail,
                        business.contactName || 'Valued Partner',
                        business.name
                    );
                }
            }
        }

        return business;
    }
}
