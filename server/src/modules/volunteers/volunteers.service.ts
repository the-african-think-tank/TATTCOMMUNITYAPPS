import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { VolunteerRole } from './entities/volunteer-role.entity';
import { VolunteerApplication, ApplicationStatus } from './entities/volunteer-application.entity';
import { VolunteerActivity, ActivityStatus } from './entities/volunteer-activity.entity';
import { VolunteerTrainingResource } from './entities/volunteer-training.entity';
import { VolunteerStat, VolunteerGrade, VolunteerStatus } from './entities/volunteer-stat.entity';
import { VolunteerTrainingProgress } from './entities/volunteer-training-progress.entity';
import { VolunteerFeedback } from './entities/volunteer-feedback.entity';
import { User } from '../iam/entities/user.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Connection, ConnectionStatus } from '../connections/entities/connection.entity';
import { ActivityTemplate } from './entities/activity-template.entity';
import { AccountFlags } from '../iam/enums/roles.enum';
import {
    CreateVolunteerRoleDto,
    ApplyVolunteerDto,
    UpdateApplicationStatusDto,
    CreateActivityDto,
    UpdateActivityStatusDto,
    CreateTrainingResourceDto
} from './dto/volunteers.dto';
import { Op } from 'sequelize';

import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/services/notifications.service';
import { BroadcastsService } from '../notifications/services/broadcasts.service';
import { BroadcastAudience } from '../notifications/entities/broadcast.entity';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class VolunteersService {
    private readonly logger = new Logger(VolunteersService.name);

    constructor(
        @InjectModel(VolunteerRole) private roleModel: typeof VolunteerRole,
        @InjectModel(VolunteerApplication) private applicationModel: typeof VolunteerApplication,
        @InjectModel(VolunteerActivity) private activityModel: typeof VolunteerActivity,
        @InjectModel(VolunteerTrainingResource) private trainingModel: typeof VolunteerTrainingResource,
        @InjectModel(VolunteerStat) private statModel: typeof VolunteerStat,
        @InjectModel(VolunteerTrainingProgress) private progressModel: typeof VolunteerTrainingProgress,
        @InjectModel(VolunteerFeedback) private feedbackModel: typeof VolunteerFeedback,
        @InjectModel(User) private userModel: typeof User,
        @InjectModel(Connection) private connectionRepo: typeof Connection,
        @InjectModel(ActivityTemplate) private activityTemplateModel: typeof ActivityTemplate,
        private notificationsService: NotificationsService,
        private broadcastsService: BroadcastsService,
        private mailService: MailService,
    ) { }

    // ─── ROLES (Admin) ─────────────────────────────────────────────────────────

    async createRole(createdBy: string, dto: CreateVolunteerRoleDto) {
        const role = await this.roleModel.create({
            ...dto,
            createdBy,
            openUntil: new Date(dto.openUntil)
        } as any);

        // Notify relevant chapter members
        this.notifyMembersForRole(role);

        return role;
    }

    async getRoleById(id: string) {
        const role = await this.roleModel.findByPk(id, {
            include: [{ model: Chapter }]
        });
        if (!role) throw new NotFoundException('Role not found');
        return role;
    }

    private async notifyMembersForRole(role: VolunteerRole) {
        try {
            await this.broadcastsService.createSystemBroadcast({
                title: 'Strategic Volunteer Role Opened',
                message: `A new strategic volunteer role "${role.name}" has been created in your local TATT chapter. Your contribution can drive significant impact.`,
                audienceType: BroadcastAudience.CHAPTER_SPECIFIC,
                targetChapterId: role.chapterId
            });
            this.logger.log(`Automatic system broadcast dispatched for role: ${role.name}`);
        } catch (error) {
            this.logger.error(`Failed to send automated broadcast for role ${role.id}`, error.stack);
        }
    }

    async getActiveRoles(chapterId?: string) {
        const where: any = { isActive: true, openUntil: { [Op.gt]: new Date() } };
        if (chapterId) where.chapterId = chapterId;
        return this.roleModel.findAll({ where, include: ['chapter'] });
    }

    async getAllRoles(chapterId?: string) {
        const where: any = {};
        if (chapterId) where.chapterId = chapterId;
        return this.roleModel.findAll({
            where,
            include: ['chapter'],
            order: [['createdAt', 'DESC']]
        });
    }

    async closeRole(roleId: string) {
        const role = await this.roleModel.findByPk(roleId);
        if (!role) throw new NotFoundException('Role not found');
        role.isActive = false;
        await role.save();
        return { message: 'Role closed' };
    }

    // ─── APPLICATIONS ──────────────────────────────────────────────────────────

    async apply(userId: string, dto: ApplyVolunteerDto) {
        // Check if user already has a pending application for this role
        const existing = await this.applicationModel.findOne({
            where: { userId, roleId: dto.roleId || null, status: ApplicationStatus.PENDING }
        });
        if (existing) throw new BadRequestException('You already have a pending application.');

        const payload: any = { ...dto, userId };
        if (dto.birthDate) payload.birthDate = new Date(dto.birthDate);
        const application = await this.applicationModel.create(payload);
        const user = await this.userModel.findByPk(userId);
        
        // Notify Admins, Super Admins, and Regional Admins
        try {
            const admins = await this.userModel.findAll({
                where: {
                    systemRole: {
                        [Op.in]: ['SUPERADMIN', 'ADMIN', 'REGIONAL_ADMIN']
                    }
                }
            });

            let roleName = 'General Volunteering';
            if (dto.roleId) {
                const role = await this.roleModel.findByPk(dto.roleId);
                if (role) roleName = role.name;
            }

            const message = `${user?.firstName} ${user?.lastName} has applied for: ${roleName}`;

            await Promise.all(admins.map(admin => 
                this.notificationsService.create(
                    admin.id,
                    NotificationType.VOLUNTEER_APPLICATION,
                    'New Volunteer Application',
                    message
                )
            ));
        } catch (error) {
            this.logger.error('Failed to notify admins of new volunteer application', error.stack);
        }

        return application;
    }

    async getMyApplications(userId: string) {
        return this.applicationModel.findAll({
            where: { userId },
            include: [{ model: VolunteerRole }],
            order: [['createdAt', 'DESC']],
        });
    }

    async getApplications(adminId: string, roleId?: string) {
        const where: any = {};
        if (roleId) where.roleId = roleId;
        return this.applicationModel.findAll({
            where,
            include: [
                { model: User, attributes: ['id', 'firstName', 'lastName', 'email', 'chapterId'] },
                { model: VolunteerRole }
            ]
        });
    }

    async updateApplicationStatus(adminId: string, applicationId: string, dto: UpdateApplicationStatusDto) {
        const app = await this.applicationModel.findByPk(applicationId, { include: [User] });
        if (!app) throw new NotFoundException('Application not found');

        app.status = dto.status;
        if (dto.interviewTime) app.interviewTime = new Date(dto.interviewTime);
        if (dto.adminNotes) app.adminNotes = dto.adminNotes;
        await app.save();

        if (dto.status === ApplicationStatus.APPROVED) {
            // Upgrade user to volunteer
            const user = await this.userModel.findByPk(app.userId);
            if (user) {
                if (!user.flags.includes(AccountFlags.VOLUNTEER)) {
                    user.flags = [...user.flags, AccountFlags.VOLUNTEER];
                    await user.save();
                }
                // Initialize stats
                await this.statModel.findOrCreate({ where: { userId: user.id } });

                // AUTOMATION: Create a connection between Admin and Volunteer to enable Direct Chat
                const existingConn = await this.connectionRepo.findOne({
                    where: {
                        [Op.or]: [
                            { requesterId: adminId, recipientId: user.id },
                            { requesterId: user.id, recipientId: adminId },
                        ]
                    }
                });

                if (!existingConn) {
                    await this.connectionRepo.create({
                        requesterId: adminId,
                        recipientId: user.id,
                        status: ConnectionStatus.ACCEPTED,
                        message: 'System-generated connection for volunteer coordination.'
                    });
                } else if (existingConn.status !== ConnectionStatus.ACCEPTED) {
                    existingConn.status = ConnectionStatus.ACCEPTED;
                    await existingConn.save();
                }
            }
        }

        return { message: `Application ${dto.status.toLowerCase()}`, status: app.status };
    }

    // ─── ACTIVITIES ────────────────────────────────────────────────────────────
    
    async getActivityTemplates(chapterId?: string) {
        const where: any = { isActive: true };
        if (chapterId) where.chapterId = chapterId;
        return this.activityTemplateModel.findAll({ where });
    }

    async createActivityTemplate(adminId: string, dto: any) {
        return this.activityTemplateModel.create({ ...dto } as any);
    }

    async createActivity(adminId: string, dto: CreateActivityDto) {
        const activity = await this.activityModel.create({
            ...dto,
            dueDate: new Date(dto.dueDate)
        } as any);

        // Notify Volunteer
        const volunteer = await this.userModel.findByPk(dto.assignedToId);
        if (volunteer) {
            await this.notificationsService.create(
                volunteer.id,
                NotificationType.VOLUNTEER_ACTIVITY,
                'New Activity Assigned',
                `You have been assigned the activity: ${activity.title}`
            );
        }

        return activity;
    }

    async getVolunteerActivities(volunteerId: string) {
        return this.activityModel.findAll({
            where: { assignedToId: volunteerId },
            order: [['dueDate', 'ASC']]
        });
    }

    async updateActivityStatus(volunteerId: string, activityId: string, dto: UpdateActivityStatusDto) {
        const activity = await this.activityModel.findOne({ where: { id: activityId, assignedToId: volunteerId } });
        if (!activity) throw new NotFoundException('Activity not found or not assigned to you');

        if (activity.status === ActivityStatus.COMPLETED) {
            throw new BadRequestException('Activity already completed');
        }

        activity.status = dto.status;
        if (dto.declineReason) activity.declineReason = dto.declineReason;
        await activity.save();

        if (dto.status === ActivityStatus.COMPLETED) {
            await this.awardPointsAndHours(volunteerId, activity.estimatedHours, activity.impactPoints);
        }

        return { message: `Activity marked as ${dto.status.toLowerCase()}` };
    }

    private async awardPointsAndHours(userId: string, hours: number, points: number) {
        const stats = await this.statModel.findOne({ where: { userId } });
        if (stats) {
            stats.totalHours = Number(stats.totalHours) + hours;
            stats.impactPoints += points;

            // Grade logic: Silver -> Bronze -> Gold
            if (stats.impactPoints >= 500) {
                stats.grade = VolunteerGrade.GOLD;
            } else if (stats.impactPoints >= 100) {
                stats.grade = VolunteerGrade.BRONZE;
            } else {
                stats.grade = VolunteerGrade.SILVER;
            }

            await stats.save();
        }
    }

    // ─── RESOURCES & ALERTS ────────────────────────────────────────────────────

    async createTrainingResource(adminId: string, dto: CreateTrainingResourceDto) {
        return this.trainingModel.create({ ...dto, createdBy: adminId });
    }

    async getTrainingResources() {
        return this.trainingModel.findAll({ order: [['createdAt', 'DESC']] });
    }

    async getTrainingStats() {
        const resources = await this.trainingModel.findAll({
            order: [['createdAt', 'DESC']]
        });

        const stats = await Promise.all(resources.map(async (resource) => {
            const completedCount = await this.progressModel.count({
                where: { resourceId: resource.id, isCompleted: true }
            });

            return {
                id: resource.id,
                title: resource.title,
                completions: completedCount,
                mediaCount: resource.mediaUrls.length
            };
        }));

        return stats;
    }

    async getStats(userId: string) {
        const [pendingActivities, neededRoles] = await Promise.all([
            this.activityModel.count({ where: { assignedToId: userId, status: ActivityStatus.ASSIGNED } }),
            this.roleModel.count({ where: { isActive: true, openUntil: { [Op.gt]: new Date() } } })
        ]);
        return { pendingActivities, neededRoles };
    }

    // ─── ADMIN DASHBOARD ───────────────────────────────────────────────────────

    async getAdminDashboardStats(chapterId?: string) {
        const userWhere: any = { flags: { [Op.contains]: [AccountFlags.VOLUNTEER] } };
        const appWhere: any = { status: ApplicationStatus.PENDING };
        let appInclude: any = undefined;
        let statInclude: any = undefined;

        if (chapterId) {
            userWhere.chapterId = chapterId;
            appInclude = [{
                model: User,
                as: 'user',
                where: { chapterId },
                required: true,
            }];
            statInclude = [{
                model: User,
                as: 'user',
                where: { chapterId },
                required: true,
            }];
        }

        const [totalVolunteers, pendingApplications, onboardingVolunteers, trainingCompletion] = await Promise.all([
            this.userModel.count({ where: userWhere }),
            this.applicationModel.count({ where: appWhere, include: appInclude }),
            this.statModel.count({ where: { status: VolunteerStatus.TRAINING }, include: statInclude }),
            this.calculateTrainingCompletionRate(chapterId)
        ]);

        return {
            totalVolunteers,
            pendingApplications,
            onboardingVolunteers,
            trainingCompletionRate: trainingCompletion
        };
    }

    async getAdminVolunteersList(query: { page?: number; limit?: number; search?: string; chapterId?: string; status?: string }) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const offset = (page - 1) * limit;

        const where: any = { flags: { [Op.contains]: [AccountFlags.VOLUNTEER] } };
        const statWhere: any = {};
        
        if (query.search) {
            where[Op.or] = [
                { firstName: { [Op.iLike]: `%${query.search}%` } },
                { lastName: { [Op.iLike]: `%${query.search}%` } },
                { email: { [Op.iLike]: `%${query.search}%` } },
            ];
        }
        if (query.chapterId) where.chapterId = query.chapterId;
        if (query.status) statWhere.status = query.status;

        const { rows, count } = await this.userModel.findAndCountAll({
            where,
            include: [
                { 
                    model: VolunteerStat,
                    where: Object.keys(statWhere).length > 0 ? statWhere : undefined,
                    required: Object.keys(statWhere).length > 0
                },
                { model: Chapter },
                { model: VolunteerApplication, as: 'applications', limit: 1, order: [['createdAt', 'DESC']] }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        return {
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        };
    }

    async getAdminApplicationsList(query: { page?: number; limit?: number; search?: string; status?: string, roleId?: string, chapterId?: string }) {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const offset = (page - 1) * limit;

        const where: any = {};
        if (query.status) where.status = query.status;
        if (query.roleId) where.roleId = query.roleId;
        
        const userWhere: any = {};
        if (query.search) {
            userWhere[Op.or] = [
                { firstName: { [Op.iLike]: `%${query.search}%` } },
                { lastName: { [Op.iLike]: `%${query.search}%` } },
                { email: { [Op.iLike]: `%${query.search}%` } },
            ];
        }
        if (query.chapterId) {
            userWhere.chapterId = query.chapterId;
        }

        const { rows, count } = await this.applicationModel.findAndCountAll({
            where,
            include: [
                { 
                    model: User, 
                    as: 'user',
                    where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
                    required: Object.keys(userWhere).length > 0
                },
                { model: VolunteerRole, as: 'role' }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        return {
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        };
    }

    private async calculateTrainingCompletionRate(chapterId?: string) {
        const volunteerWhere: any = { flags: { [Op.contains]: [AccountFlags.VOLUNTEER] } };
        if (chapterId) volunteerWhere.chapterId = chapterId;

        const totalVolunteers = await this.userModel.count({ where: volunteerWhere });
        if (totalVolunteers === 0) return 0;

        const totalResources = await this.trainingModel.count();
        if (totalResources === 0) return 100;

        const progressInclude = chapterId ? [{
            model: User,
            as: 'user',
            where: { chapterId },
            required: true
        }] : undefined;

        const completedRecords = await this.progressModel.count({
            where: { isCompleted: true },
            include: progressInclude
        });
        
        const rate = (completedRecords / (totalVolunteers * totalResources)) * 100;
        return Math.round(rate);
    }

    // ─── VOLUNTEER PROFILE (Admin detail view) ─────────────────────────────────

    async getVolunteerProfile(volunteerId: string) {
        const user = await this.userModel.findByPk(volunteerId, {
            attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture', 'chapterId', 'createdAt'],
            include: [{ 
                model: VolunteerStat,
                include: [{ model: VolunteerRole, as: 'currentRole' }]
            }],
        });
        if (!user) throw new NotFoundException('Volunteer not found');

        const [applications, activities, feedback] = await Promise.all([
            this.applicationModel.findAll({
                where: { userId: volunteerId },
                include: [{ model: VolunteerRole }],
                order: [['createdAt', 'DESC']],
            }),
            this.activityModel.findAll({
                where: { assignedToId: volunteerId },
                order: [['dueDate', 'DESC']],
                limit: 10,
            }),
            this.feedbackModel.findAll({
                where: { volunteerId },
                include: [{ model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName', 'profilePicture'] }],
                order: [['createdAt', 'DESC']],
                limit: 10,
            }),
        ]);

        return {
            user,
            stats: (user as any).volunteerStat ?? null,
            applications,
            recentActivities: activities,
            feedback,
        };
    }

    async addFeedback(
        reviewerId: string,
        volunteerId: string,
        payload: { rating: number; comment: string; eventLabel?: string },
    ) {
        const volunteer = await this.userModel.findByPk(volunteerId);
        if (!volunteer) throw new NotFoundException('Volunteer not found');

        if (payload.rating < 1 || payload.rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5');
        }

        const feedback = await this.feedbackModel.create({
            volunteerId,
            reviewerId,
            rating: payload.rating,
            comment: payload.comment,
            eventLabel: payload.eventLabel,
        } as any);

        // Recompute rolling average on the stat row
        const allFeedback = await this.feedbackModel.findAll({ where: { volunteerId } });
        const avg = allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;
        const stats = await this.statModel.findOne({ where: { userId: volunteerId } });
        if (stats) {
            stats.rating = Math.round(avg * 10) / 10;
            stats.ratingCount = allFeedback.length;
            await stats.save();
        }

        return feedback;
    }

    async getVolunteerFeedback(volunteerId: string, page = 1, limit = 5) {
        const offset = (page - 1) * limit;
        const { rows, count } = await this.feedbackModel.findAndCountAll({
            where: { volunteerId },
            include: [{ model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName', 'profilePicture'] }],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });
        return { data: rows, total: count, page, totalPages: Math.ceil(count / limit) };
    }

    async updateVolunteerStats(
        volunteerId: string,
        payload: Partial<VolunteerStat>,
    ) {
        const [stats] = await this.statModel.findOrCreate({ where: { userId: volunteerId } });
        const oldRoleId = stats.currentRoleId;
        const oldGrade = stats.grade;

        Object.assign(stats, payload);
        await stats.save();

        // If role or grade changes, notify
        if ((payload.currentRoleId && payload.currentRoleId !== oldRoleId) || (payload.grade && payload.grade !== oldGrade)) {
            const user = await this.userModel.findByPk(volunteerId);
            if (user) {
                let roleName = 'Updated Role';
                if (payload.currentRoleId) {
                    const role = await this.roleModel.findByPk(payload.currentRoleId);
                    roleName = role?.name || roleName;
                }

                await this.notificationsService.create(
                    user.id,
                    NotificationType.VOLUNTEER_ROLE,
                    'Strategic Role Assignment',
                    `You have been assigned the role: ${roleName}`
                );
            }
        }

        return stats;
    }
}
