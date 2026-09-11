import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { JobListing } from './entities/job-listing.entity';
import { JobApplication } from './entities/job-application.entity';
import { SavedJob } from './entities/saved-job.entity';
import { JobAlert } from './entities/job-alert.entity';
import { JobCompanySource } from './entities/job-company-source.entity';
import { User } from '../iam/entities/user.entity';
import { ApplyJobDto } from './dto/jobs.dto';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Sequelize } from 'sequelize-typescript';
import { JobSchedulerService } from './ingestion/services/job-scheduler.service';
import { JobIngestionService } from './ingestion/services/job-ingestion.service';

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
        @InjectModel(JobCompanySource) private companySourceRepo: typeof JobCompanySource,
        @InjectModel(User) private userRepo: typeof User,
        private readonly notificationsService: NotificationsService,
        private readonly jobScheduler: JobSchedulerService,
        private readonly jobIngestion: JobIngestionService,
    ) { }
    
    private USER_PUBLIC_ATTRIBUTES = [
        'id',
        'firstName',
        'lastName',
        'email',
        'communityTier',
        'businessName',
        'businessRole',
        'businessProfileLink',
        'industryId',
    ];


    async getListings(params: { category?: string; type?: string; location?: string; datePosted?: string; search?: string; page?: number; limit?: number }) {
        const { category, type, location, datePosted, search, page = 1, limit = 10 } = params;
        const where: WhereOptions<JobListing> = { isActive: true };

        if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'all categories') {
            where.category = { [Op.iLike]: `%${category.trim()}%` };
        }
        if (type && type.toLowerCase() !== 'all' && type.toLowerCase() !== 'all types') {
            where.type = { [Op.iLike]: `%${type.trim()}%` };
        }
        if (location && location.toLowerCase() !== 'all' && location.toLowerCase() !== 'all locations') {
            const loc = location.trim().toLowerCase();
            if (loc === 'remote' || loc.includes('remote')) {
                where[Op.or] = [
                    { location: { [Op.iLike]: '%remote%' } },
                    { title: { [Op.iLike]: '%remote%' } },
                ];
            } else if (loc === 'africa') {
                where[Op.or] = [
                    { region: 'Africa' },
                    { location: { [Op.iLike]: '%africa%' } },
                ];
            } else if (loc === 'united states' || loc === 'us' || loc === 'usa') {
                where[Op.or] = [
                    { region: 'US' },
                    { location: { [Op.iLike]: '%united states%' } },
                    { location: { [Op.iLike]: '%usa%' } },
                ];
            } else {
                where.location = { [Op.iLike]: `%${location.trim()}%` };
            }
        }
        if (datePosted && datePosted.toLowerCase() !== 'all') {
            const dp = datePosted.toLowerCase();
            const now = Date.now();
            let threshold: Date | null = null;
            if (dp === '24h' || dp === 'today') {
                threshold = new Date(now - 24 * 60 * 60 * 1000);
            } else if (dp === '7d' || dp === 'week') {
                threshold = new Date(now - 7 * 24 * 60 * 60 * 1000);
            } else if (dp === '30d' || dp === 'month') {
                threshold = new Date(now - 30 * 24 * 60 * 60 * 1000);
            }
            if (threshold) {
                where.createdAt = { [Op.gte]: threshold };
            }
        }
        if (search?.trim()) {
            const term = `%${search.trim()}%`;
            const searchClause = {
                [Op.or]: [
                    { title: { [Op.iLike]: term } },
                    { companyName: { [Op.iLike]: term } },
                    { description: { [Op.iLike]: term } },
                    { location: { [Op.iLike]: term } },
                    { category: { [Op.iLike]: term } },
                ],
            };
            if (where[Op.and]) {
                (where[Op.and] as any[]).push(searchClause);
            } else {
                where[Op.and] = [searchClause];
            }
        }

        const offset = (page - 1) * limit;
        const { count, rows } = await this.jobRepo.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'postedBy',
                    attributes: this.USER_PUBLIC_ATTRIBUTES,
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
                    attributes: this.USER_PUBLIC_ATTRIBUTES,
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

    async getAppliedJobIds(userId: string): Promise<string[]> {
        const apps = await this.applicationRepo.findAll({ where: { userId }, attributes: ['jobId'] });
        return apps.map((a) => a.jobId);
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

    // ─── HARVEST & INGESTION ENGINE ──────────────────────────────────────────
    async triggerHarvest(companySlug?: string) {
        return this.jobScheduler.runHarvestWithLock(companySlug);
    }

    async getCompanySources(page = 1, limit = 50) {
        await this.jobIngestion.ensureSeedCompanies();
        const { count, rows } = await this.companySourceRepo.findAndCountAll({
            order: [['companyName', 'ASC']],
            limit,
            offset: (page - 1) * limit,
        });
        return {
            data: rows,
            meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) || 0 }
        };
    }

    async addCompanySource(dto: { companyName: string; boardToken: string; websiteUrl?: string; submittedById?: string }) {
        let token = dto.boardToken.trim().toLowerCase();
        const urlMatch = token.match(/(?:boards|job-boards)\.greenhouse\.io\/([a-z0-9_-]+)/i);
        if (urlMatch) {
            token = urlMatch[1];
        }

        const existing = await this.companySourceRepo.findOne({
            where: { adapter: 'greenhouse', boardToken: token }
        });

        if (existing) {
            if (!existing.isActive) {
                await existing.update({ isActive: true });
            }
            return existing;
        }

        const source = await this.companySourceRepo.create({
            adapter: 'greenhouse',
            companyName: dto.companyName.trim(),
            boardToken: token,
            websiteUrl: dto.websiteUrl,
            targetRegions: ['US', 'Africa'],
            isActive: true,
            submittedById: dto.submittedById,
        });

        // Trigger immediate fetch for the newly registered company
        this.jobIngestion.runHarvest(token).catch(err => {
            console.error(`Error in initial sync for new source ${token}:`, err?.message);
        });

        return source;
    }

    async toggleCompanySource(id: string) {
        const source = await this.companySourceRepo.findByPk(id);
        if (!source) throw new NotFoundException('Company source not found');
        await source.update({ isActive: !source.isActive });
        return source;
    }

    async deleteCompanySource(id: string) {
        const source = await this.companySourceRepo.findByPk(id);
        if (!source) throw new NotFoundException('Company source not found');
        await source.destroy();
        return { success: true };
    }

    async submitCommunitySource(urlOrToken: string, userId: string) {
        if (!urlOrToken || !urlOrToken.trim()) {
            throw new BadRequestException('Please provide a valid Greenhouse board token or career page URL');
        }

        let token = urlOrToken.trim().toLowerCase();
        const urlMatch = token.match(/(?:boards|job-boards)\.greenhouse\.io\/([a-z0-9_-]+)/i);
        if (urlMatch) {
            token = urlMatch[1];
        }

        // Validate that the Greenhouse board actually exists
        try {
            const checkUrl = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs`;
            const res = await fetch(checkUrl, {
                signal: AbortSignal.timeout(8000),
                headers: { 'Accept': 'application/json' },
            });

            if (!res.ok) {
                if (res.status === 404) {
                    throw new BadRequestException(`No active Greenhouse job board found for "${token}".`);
                }
                throw new BadRequestException(`Unable to verify Greenhouse board (HTTP ${res.status}).`);
            }

            const data = (await res.json()) as any;
            if (!data || !Array.isArray(data.jobs)) {
                throw new BadRequestException('Could not find an active Greenhouse job board at that link.');
            }

            const companyName = data.jobs[0]?.company_name || token.charAt(0).toUpperCase() + token.slice(1);
            return this.addCompanySource({
                companyName,
                boardToken: token,
                submittedById: userId,
            });
        } catch (err: any) {
            if (err instanceof BadRequestException) throw err;
            throw new BadRequestException(`Unable to verify Greenhouse board: ${err?.message}`);
        }
    }
}

