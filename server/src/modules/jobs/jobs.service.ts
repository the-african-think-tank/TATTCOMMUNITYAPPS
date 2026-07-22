import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { JobListing } from './entities/job-listing.entity';
import { JobApplication } from './entities/job-application.entity';
import { SavedJob } from './entities/saved-job.entity';
import { JobAlert } from './entities/job-alert.entity';
import { User } from '../iam/entities/user.entity';
import { ApplyJobDto } from './dto/jobs.dto';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Sequelize } from 'sequelize-typescript';

export type MarketInsights = {
    topCategory: { name: string; growth: string } | null;
    salaryTrend: { avg: number; label: string };
    topEmployers: { name: string; initials: string }[];
};

@Injectable()
export class JobsService {
    constructor(
        @InjectModel(JobListing) private jobRepo: typeof JobListing,
        @InjectModel(JobApplication) private applicationRepo: typeof JobApplication,
        @InjectModel(SavedJob) private savedRepo: typeof SavedJob,
        @InjectModel(JobAlert) private alertRepo: typeof JobAlert,
        @InjectModel(User) private userRepo: typeof User,
        private readonly notificationsService: NotificationsService,
    ) {}

    async getListings(params: { category?: string; type?: string; location?: string; search?: string; page?: number; limit?: number }) {
        const { category, type, location, search, page = 1, limit = 10 } = params;
        const where: WhereOptions<JobListing> = { isActive: true };

        if (category && category !== 'all') where.category = { [Op.iLike]: `%${category}%` };
        if (type && type !== 'all') where.type = { [Op.iLike]: `%${type}%` };
        if (location && location !== 'all') {
            if (location.toLowerCase() === 'remote') where.location = { [Op.iLike]: '%remote%' };
            else where.location = { [Op.iLike]: `%${location}%` };
        }
        if (search?.trim()) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search.trim()}%` } },
                { companyName: { [Op.iLike]: `%${search.trim()}%` } },
                { description: { [Op.iLike]: `%${search.trim()}%` } },
            ];
        }

        const offset = (page - 1) * limit;
        const { count, rows } = await this.jobRepo.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'postedBy',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'communityTier', 'businessName', 'businessRole', 'businessProfileLink', 'industryId'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });
        return { data: rows, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) || 0 } };
    }

    async getListingById(id: string) {
        const job = await this.jobRepo.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'postedBy',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'communityTier', 'businessName', 'businessRole', 'businessProfileLink', 'industryId'],
                },
            ],
        });
        if (!job) throw new NotFoundException('Job not found');
        return job;
    }

    async apply(userId: string, jobId: string, dto: ApplyJobDto) {
        const job = await this.getListingById(jobId);
        const existing = await this.applicationRepo.findOne({ where: { userId, jobId } });
        if (existing) throw new BadRequestException('You have already applied to this job.');
        const application = await this.applicationRepo.create({
            userId,
            jobId,
            fullName: dto.fullName,
            email: dto.email,
            phone: dto.phone,
            resumeUrl: dto.resumeUrl,
            coverLetter: dto.coverLetter,
        });
        return { message: 'Application submitted.', application };
    }

    async getSavedJobIds(userId: string): Promise<string[]> {
        const saved = await this.savedRepo.findAll({ where: { userId }, attributes: ['jobId'] });
        return saved.map((s) => s.jobId);
    }

    async toggleSaved(userId: string, jobId: string) {
        await this.getListingById(jobId);
        const existing = await this.savedRepo.findOne({ where: { userId, jobId } });
        if (existing) {
            await existing.destroy();
            return { saved: false, message: 'Removed from saved roles.' };
        }
        await this.savedRepo.create({ userId, jobId });
        return { saved: true, message: 'Added to saved roles.' };
    }

    async getSavedListings(userId: string) {
        const saved = await this.savedRepo.findAll({
            where: { userId },
            include: [{ model: JobListing, as: 'job' }],
        });
        return saved.map((s) => (s as any).job).filter(Boolean);
    }

    async getMarketInsights(): Promise<MarketInsights> {
        const jobs = await this.jobRepo.findAll({
            where: { isActive: true },
            attributes: ['category', 'companyName', 'salaryMin', 'salaryMax'],
            raw: true,
        });
        const categoryCounts: Record<string, number> = {};
        const employerSet = new Set<string>();
        let salarySum = 0;
        let salaryCount = 0;
        jobs.forEach((r: any) => {
            const c = r.category || 'Other';
            categoryCounts[c] = (categoryCounts[c] || 0) + 1;
            if (r.companyName) employerSet.add(r.companyName);
            if (r.salaryMin != null && r.salaryMax != null) {
                salarySum += (Number(r.salaryMin) + Number(r.salaryMax)) / 2;
                salaryCount++;
            }
        });
        const topCategoryEntry = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
        const topEmployers = Array.from(employerSet).slice(0, 5).map((name) => ({ name, initials: name.slice(0, 2).toUpperCase() }));
        return {
            topCategory: topCategoryEntry ? { name: topCategoryEntry[0], growth: '+18% growth this month' } : { name: 'Green Tech', growth: '+18% growth this month' },
            salaryTrend: { avg: salaryCount > 0 ? Math.round(salarySum / salaryCount) : 95000, label: 'Executive roles in West Africa' },
            topEmployers: topEmployers.length > 0 ? topEmployers : [{ name: 'EcoTech', initials: 'ET' }, { name: 'Nile Fintech', initials: 'NF' }, { name: 'SolarPath', initials: 'SP' }],
        };
    }

    // --- Job Alerts Methods ---

    async getJobAlerts(userId: string) {
        return this.alertRepo.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
        });
    }

    async createMemberListing(userId: string, dto: import('./dto/jobs.dto').CreateJobDto) {
        const job = await this.jobRepo.create({
            ...dto,
            postedById: userId,
            isActive: true, // Assuming direct activation for now, can be PENDING if moderation needed
            isNew: true,
            isFlagged: false,
        } as any);
        await this.triggerAlertsForJob(job.id);
        return job;
    }

    async createJobAlert(userId: string, dto: { keyword: string; category?: string }) {
        if (!dto.keyword.trim()) {
            throw new BadRequestException('Keyword is required for job alert.');
        }

        const alert = await this.alertRepo.create({
            userId,
            keyword: dto.keyword.trim(),
            category: dto.category || null,
        });

        // Add a system notification to confirm the setup
        try {
            await this.notificationsService.create(
                userId,
                NotificationType.SYSTEM_ALERT,
                'Job Alert Created',
                `You will now receive notifications for jobs matching: "${dto.keyword}"${dto.category ? ` in ${dto.category}` : ''}.`,
                { actionUrl: '/dashboard/jobs' },
                false // don't send email just for setup
            );
        } catch(e) { /* ignore if notification fails */ }

        return alert;
    }

    async deleteJobAlert(userId: string, alertId: string) {
        const alert = await this.alertRepo.findOne({ where: { id: alertId, userId } });
        if (!alert) throw new NotFoundException('Alert not found');
        
        await alert.destroy();
        return { message: 'Alert removed successfully.' };
    }

    async triggerAlertsForJob(jobId: string) {
        const job = await this.jobRepo.findByPk(jobId);
        if (!job || !job.isActive) return;

        // Fetch all alerts
        const allAlerts = await this.alertRepo.findAll();
        const matchedUsers = new Set<string>();

        // Find users whose alerts match this job (simple matching by keyword in title/desc)
        const jobText = `${job.title} ${job.description || ''} ${job.companyName || ''}`.toLowerCase();
        
        for (const alert of allAlerts) {
            const matchesCategory = alert.category ? job.category?.toLowerCase().includes(alert.category.toLowerCase()) : true;
            const matchesKeyword = jobText.includes(alert.keyword.toLowerCase());

            if (matchesCategory && matchesKeyword) {
                matchedUsers.add(alert.userId);
            }
        }

        for (const userId of matchedUsers) {
            try {
                await this.notificationsService.create(
                    userId,
                    NotificationType.SYSTEM_ALERT,
                    'New Job Matches Your Alert',
                    `${job.companyName} just posted a new role: ${job.title}. This matched one of your job alerts. Check it out now!`,
                    { actionUrl: `/dashboard/jobs/${job.id}` },
                    true // send email
                );
            } catch (e) {
                // Log and continue
                console.error(`Failed to send job alert to user ${userId}`, e);
            }
        }

        return { matchedUsers: Array.from(matchedUsers) };
    }

    // ════════════════════════════════════════════════════════════════════════════
    // ADMIN METHODS
    // ════════════════════════════════════════════════════════════════════════════

    async getAdminListings(params: { search?: string; status?: string; type?: string; page?: number; limit?: number }) {
        const { search, status, type, page = 1, limit = 20 } = params;
        const where: any = {};
        if (status === 'active') where.isActive = true;
        else if (status === 'inactive') where.isActive = false;
        else if (status === 'flagged') where.isFlagged = true;
        if (type && type !== 'all') where.type = { [Op.iLike]: `%${type}%` };
        if (search?.trim()) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search.trim()}%` } },
                { companyName: { [Op.iLike]: `%${search.trim()}%` } },
            ];
        }
        const offset = (page - 1) * limit;
        const { count, rows } = await this.jobRepo.findAndCountAll({
            where,
            attributes: {
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM "job_applications" AS "apps"
                            WHERE
                                "apps"."jobId" = "JobListing"."id"
                        )`),
                        'applicationsCount'
                    ]
                ]
            },
            include: [{ model: this.userRepo, as: 'postedBy', attributes: ['id', 'firstName', 'lastName', 'email', 'communityTier'] }],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            paranoid: false,
        });
        return { data: rows, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) || 0 } };
    }

    async getAdminStats() {
        const [total, active, flagged, applications, categoryCounts] = await Promise.all([
            this.jobRepo.count({ paranoid: false }),
            this.jobRepo.count({ where: { isActive: true } }),
            this.jobRepo.count({ where: { isFlagged: true } }),
            this.applicationRepo.count(),
            this.jobRepo.findAll({
                where: { isActive: true },
                attributes: ['category', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
                group: ['category'],
                raw: true,
            })
        ]);

        const categories = (categoryCounts as any).map((item: any) => ({
            name: item.category || 'Other',
            count: parseInt(item.count, 10),
            percentage: active > 0 ? Math.round((parseInt(item.count, 10) / active) * 100) : 0
        })).sort((a: any, b: any) => b.count - a.count);

        return { 
            total, 
            active, 
            inactive: total - active, 
            flagged, 
            applications,
            categories 
        };
    }

    async adminCreateListing(dto: import('./dto/jobs.dto').CreateJobDto) {
        const job = await this.jobRepo.create({
            title: dto.title, companyName: dto.companyName, location: dto.location,
            type: dto.type, category: dto.category, description: dto.description,
            requirements: dto.requirements, qualifications: dto.qualifications,
            companyLogoUrl: dto.companyLogoUrl, companyWebsite: dto.companyWebsite,
            salaryLabel: dto.salaryLabel, salaryMin: dto.salaryMin, salaryMax: dto.salaryMax,
            isActive: true, isNew: true, isFlagged: false,
            postedById: dto.postedById ?? null,
        } as any);
        await this.triggerAlertsForJob(job.id);
        return job;
    }

    async adminFlagListing(jobId: string, reason?: string) {
        const job = await this.jobRepo.findByPk(jobId, { paranoid: false });
        if (!job) throw new NotFoundException('Job not found');
        await job.update({ isFlagged: true, flagReason: reason ?? null });
        if (job.postedById) {
            try {
                await this.notificationsService.create(
                    job.postedById, NotificationType.SYSTEM_ALERT,
                    'Your Job Listing Has Been Flagged',
                    `Your listing "${job.title}" has been flagged for review${reason ? `: ${reason}` : '.'}`,
                    { actionUrl: '/dashboard/jobs' }, true
                );
            } catch (e) { /* non-critical */ }
        }
        return job;
    }

    async adminUnlistListing(jobId: string, reason?: string) {
        const job = await this.jobRepo.findByPk(jobId, { paranoid: false });
        if (!job) throw new NotFoundException('Job not found');
        await job.update({ isActive: false, flagReason: reason ?? job.flagReason });
        if (job.postedById) {
            try {
                await this.notificationsService.create(
                    job.postedById, NotificationType.SYSTEM_ALERT,
                    'Your Job Listing Has Been Unlisted',
                    `Your listing "${job.title}" has been removed from the TATT Job Board${reason ? ` — Reason: ${reason}` : '.'}`,
                    { actionUrl: '/dashboard/jobs' }, true
                );
            } catch (e) { /* non-critical */ }
        }
        return job;
    }

    async adminRestoreListing(jobId: string) {
        const job = await this.jobRepo.findByPk(jobId, { paranoid: false });
        if (!job) throw new NotFoundException('Job not found');
        await job.update({ isActive: true, isFlagged: false, flagReason: null });
        return job;
    }

    async adminDeleteListing(jobId: string) {
        const job = await this.jobRepo.findByPk(jobId, { paranoid: false });
        if (!job) throw new NotFoundException('Job not found');
        await job.destroy({ force: true });
        return { message: 'Job permanently deleted.' };
    }

    async getAdminApplications(params: { jobId?: string; page?: number; limit?: number }) {
        const { jobId, page = 1, limit = 20 } = params;
        const where: any = {};
        if (jobId) where.jobId = jobId;

        const { count, rows } = await this.applicationRepo.findAndCountAll({
            where,
            include: [
                { model: JobListing, as: 'job', attributes: ['title', 'companyName'] },
                { model: User, as: 'applicant', attributes: ['firstName', 'lastName', 'email', 'profilePicture'] }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit,
        });

        return { data: rows, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) || 0 } };
    }

    async getApplicationById(id: string) {
        const app = await this.applicationRepo.findByPk(id, {
            include: [
                { model: JobListing, as: 'job' },
                { model: User, as: 'applicant' }
            ]
        });
        if (!app) throw new NotFoundException('Application not found');
        return app;
    }
}

