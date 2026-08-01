import { Injectable, ConflictException, NotFoundException, ForbiddenException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Chapter } from './entities/chapter.entity';
import { ChapterActivity, ActivityType } from './entities/chapter-activity.entity';
import { User } from '../iam/entities/user.entity';
import { Post, PostType } from '../feed/entities/post.entity';
import { PostLike } from '../feed/entities/post-like.entity';
import { PostComment } from '../feed/entities/post-comment.entity';
import { CreateChapterDto, UpdateChapterDto } from './dto/chapters.dto';
import { CreateChapterActivityDto, UpdateChapterActivityDto } from './dto/chapter-activity.dto';
import { SystemRole, AccountFlags } from '../iam/enums/roles.enum';
import { VolunteerApplication, ApplicationStatus } from '../volunteers/entities/volunteer-application.entity';
import { VolunteerRole } from '../volunteers/entities/volunteer-role.entity';

const ACTIVITY_AUTHOR_ATTRS = ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle', 'communityTier'] as const;
const POST_AUTHOR_ATTRS = ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle', 'communityTier', 'tattMemberId'] as const;

@Injectable()
export class ChaptersService implements OnApplicationBootstrap {
    private readonly logger = new Logger(ChaptersService.name);

    constructor(
        @InjectModel(Chapter) private chapterRepository: typeof Chapter,
        @InjectModel(ChapterActivity) private activityRepository: typeof ChapterActivity,
        @InjectModel(User) private userRepository: typeof User,
        @InjectModel(Post) private postRepository: typeof Post,
        @InjectModel(PostLike) private likeRepository: typeof PostLike,
        @InjectModel(PostComment) private commentRepository: typeof PostComment,
        @InjectModel(VolunteerApplication) private volunteerAppRepo: typeof VolunteerApplication,
        @InjectModel(VolunteerRole) private volunteerRoleRepo: typeof VolunteerRole,
    ) { }

    async onApplicationBootstrap() {
        this.logger.log('Syncing official Regional Chapters...');

        const officialChapters = [
            { name: 'Dallas-Fort Worth Chapter', code: '1001', country: 'USA', stateRegion: 'Texas', cities: ['Dallas', 'Fort Worth'], description: 'Strategic Diaspora Hub for Dallas-Fort Worth Metroplex.' },
            { name: 'Houston Chapter', code: '1002', country: 'USA', stateRegion: 'Texas', cities: ['Houston'], description: 'Regional base for Houston and Gulf Coast connections.' },
            { name: 'Atlanta Chapter', code: '1003', country: 'USA', stateRegion: 'Georgia', cities: ['Atlanta'], description: 'Primary Diaspora network hub in the Southeast.' },
            { name: 'Washington D.C. Area Chapter', code: '1004', country: 'USA', stateRegion: 'District of Columbia', cities: ['Washington D.C.', 'DMV'], description: 'Capital region hub for policy, diaspora affairs, and global advocacy.' },
            { name: 'Charlotte Chapter', code: '1005', country: 'USA', stateRegion: 'North Carolina', cities: ['Charlotte'], description: 'Piedmont and Carolinas regional hub.' },
            { name: 'Accra Chapter', code: '1006', country: 'Ghana', stateRegion: 'Greater Accra', cities: ['Accra'], description: 'Key West African center for development and returnee network.' },
            { name: 'Global Chapter', code: '1007', country: 'Global', stateRegion: 'International', cities: ['Worldwide'], description: 'Global chapter connecting TATT members around the world.' },
        ];

        const officialIds: string[] = [];
        let globalChapterId: string | null = null;

        for (const data of officialChapters) {
            const matchConditions: any[] = [{ code: data.code }, { name: data.name }];
            if (data.code === '1003') matchConditions.push({ name: 'Atlanta Diaspora Chapter' });
            if (data.code === '1006') matchConditions.push({ name: 'Accra Chapter' });

            let chapter = await this.chapterRepository.findOne({
                where: { [Op.or]: matchConditions },
            });

            if (chapter) {
                await chapter.update(data);
            } else {
                chapter = await this.chapterRepository.create(data as any);
            }

            officialIds.push(chapter.id);
            if (data.code === '1007') {
                globalChapterId = chapter.id;
            }
        }

        const extraChapters = await this.chapterRepository.findAll({
            where: { id: { [Op.notIn]: officialIds } },
        });

        if (extraChapters.length > 0) {
            this.logger.log(`Cleaning up ${extraChapters.length} legacy chapters...`);
            for (const oldChap of extraChapters) {
                if (globalChapterId) {
                    await this.userRepository.update(
                        { chapterId: globalChapterId },
                        { where: { chapterId: oldChap.id } },
                    );
                }
                await this.activityRepository.destroy({ where: { chapterId: oldChap.id } });
                await oldChap.destroy();
            }
        }

        this.logger.log(`Successfully synced ${officialChapters.length} official regional chapters.`);
    }

    async updateChapter(id: string, dto: UpdateChapterDto) {
        const chapter = await this.chapterRepository.findByPk(id);
        if (!chapter) throw new NotFoundException('Chapter not found.');

        // Verify Unique Name (excluding self)
        if (dto.name && dto.name !== chapter.name) {
            const existingName = await this.chapterRepository.findOne({ 
                where: { 
                    name: dto.name,
                    id: { [Op.ne]: id }
                } 
            });
            if (existingName) {
                throw new ConflictException(`The name "${dto.name}" is already assigned to another chapter. Please choose a unique name.`);
            }
        }

        if (dto.code && dto.code !== chapter.code) {
            if (!/^\d{4}$/.test(dto.code)) {
                throw new ConflictException('Chapter code must be a 4-digit number.');
            }
            const existing = await this.chapterRepository.findOne({ where: { code: dto.code } });
            if (existing) throw new ConflictException(`Code ${dto.code} is already in use.`);
        }

        await chapter.update(dto);
        return { message: 'Chapter updated successfully', data: chapter };
    }

    async deleteChapter(id: string) {
        const chapter = await this.chapterRepository.findByPk(id);
        if (!chapter) throw new NotFoundException('Chapter not found.');

        // Prevent deletion if there are users still attached to it
        const usersCount = await this.userRepository.count({ where: { chapterId: id } });
        if (usersCount > 0) {
            throw new ConflictException(`"${chapter.name}" has ${usersCount} member(s) assigned. Please reassign or remove them before deleting this chapter.`);
        }

        await chapter.destroy();
        return { message: `Chapter "${chapter.name}" has been permanently deleted.` };
    }

    async createChapter(dto: CreateChapterDto) {
        if (dto.code && !/^\d{4}$/.test(dto.code)) {
            throw new ConflictException('Chapter code must be a 4-digit number.');
        }

        const code = dto.code || await this.generateChapterCode();

        const existingCode = await this.chapterRepository.findOne({ where: { code } });
        if (existingCode) {
            throw new ConflictException(`Chapter with code ${code} already exists.`);
        }
        const chapter = await this.chapterRepository.create({ ...dto, code });
        return { message: 'Chapter created successfully', data: chapter };
    }

    private async generateChapterCode(): Promise<string> {
        const lastChapter = await this.chapterRepository.findOne({
            order: [['code', 'DESC']],
            where: { code: { [Op.regexp]: '^[0-9]{4}$' } }
        });

        if (!lastChapter) return '1001';

        const nextNum = parseInt(lastChapter.code) + 1;
        return nextNum.toString().padStart(4, '0');
    }

    async getAllChapters() {
        return this.chapterRepository.findAll({
            attributes: {
                include: [
                    [
                        this.chapterRepository.sequelize.literal(
                            `CAST((SELECT COUNT(*) FROM "users" WHERE "users"."chapterId" = "Chapter"."id" AND "users"."isActive" = true AND "users"."deletedAt" IS NULL) AS INTEGER)`
                        ),
                        'memberCount'
                    ]
                ]
            },
            include: [
                {
                    model: User,
                    as: 'regionalManager',
                    attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle'],
                },
                {
                    model: User,
                    as: 'associateRegionalDirector',
                    attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async getChapterById(id: string) {
        const chapter = await this.chapterRepository.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'regionalManager',
                    attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle'],
                },
                {
                    model: User,
                    as: 'associateRegionalDirector',
                    attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle'],
                },
            ],
        });
        if (!chapter) {
            throw new NotFoundException('Chapter not found');
        }
        return chapter;
    }

    async getChapterMembers(chapterId: string, _viewerId?: string) {
        await this.getChapterById(chapterId); // ensure chapter exists
        const [members, total] = await Promise.all([
            this.userRepository.findAll({
                where: { chapterId, isActive: true },
                attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle', 'industry', 'communityTier'],
                limit: 50,
            }),
            this.userRepository.count({ where: { chapterId, isActive: true } }),
        ]);
        return { members, total };
    }

    async updateChapterManager(id: string, managerId: string) {
        const chapter = await this.getChapterById(id);
        chapter.regionalManagerId = managerId;
        await chapter.save();
        return { message: 'Regional manager updated successfully', data: chapter };
    }

    // ── CHAPTER ACTIVITIES (Admin-managed news/events/announcements) ─────────────

    async getChapterActivities(chapterId: string, page = 1, limit = 20, visibility?: string) {
        await this.getChapterById(chapterId);
        const offset = (page - 1) * limit;
        const where: any = { chapterId, isPublished: true };
        if (visibility) where.visibility = visibility;

        const { count, rows } = await this.activityRepository.findAndCountAll({
            where,
            include: [
                { model: User, as: 'author', attributes: [...ACTIVITY_AUTHOR_ATTRS] },
                { model: User, as: 'volunteerManager', attributes: [...ACTIVITY_AUTHOR_ATTRS] },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });
        return {
            data: rows,
            meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
        };
    }

    async getAllActivities(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const { count, rows } = await this.activityRepository.findAndCountAll({
            where: { isPublished: true },
            include: [
                { model: Chapter, as: 'chapter', attributes: ['id', 'name', 'code'] },
                { model: User, as: 'author', attributes: [...ACTIVITY_AUTHOR_ATTRS] },
                { model: User, as: 'volunteerManager', attributes: [...ACTIVITY_AUTHOR_ATTRS] },
            ],
            order: [['eventDate', 'ASC'], ['createdAt', 'DESC']], // Upcoming first
            limit,
            offset,
        });
        return {
            data: rows,
            meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
        };
    }

    async createChapterActivity(chapterId: string, author: User, dto: CreateChapterActivityDto) {
        const chapter = await this.getChapterById(chapterId);
        const isAdmin = [SystemRole.ADMIN, SystemRole.SUPERADMIN].includes(author.systemRole);
        const isRegionalAdminForChapter = author.systemRole === SystemRole.REGIONAL_ADMIN && (chapter.regionalManagerId === author.id || chapter.associateRegionalDirectorId === author.id);

        if (!isAdmin && !isRegionalAdminForChapter) {
            throw new ForbiddenException('Only chapter admins can post chapter activities for this chapter.');
        }
        const { eventDate, endDate, ...rest } = dto;
        const activity = await this.activityRepository.create({
            chapterId,
            authorId: author.id,
            ...rest,
            eventDate: eventDate ? new Date(eventDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            isPublished: true,
        } as any);
        return { message: 'Chapter activity posted successfully.', activityId: activity.id };
    }

    async updateChapterActivity(activityId: string, author: User, dto: UpdateChapterActivityDto) {
        const activity = await this.activityRepository.findByPk(activityId);
        if (!activity) throw new NotFoundException('Activity not found.');
        const chapter = await this.getChapterById(activity.chapterId);
        
        const isAdmin = [SystemRole.ADMIN, SystemRole.SUPERADMIN].includes(author.systemRole);
        const isRegionalAdminForChapter = author.systemRole === SystemRole.REGIONAL_ADMIN && (chapter.regionalManagerId === author.id || chapter.associateRegionalDirectorId === author.id);
        const isOwner = activity.authorId === author.id;
        
        if (!isAdmin && !isRegionalAdminForChapter && !isOwner) {
            throw new ForbiddenException('Unauthorised to update this activity.');
        }
        const { eventDate, ...rest } = dto;
        Object.assign(activity, rest);
        if (eventDate) activity.eventDate = new Date(eventDate);
        await activity.save();
        return { message: 'Activity updated.' };
    }

    async deleteChapterActivity(activityId: string, author: User) {
        const activity = await this.activityRepository.findByPk(activityId);
        if (!activity) throw new NotFoundException('Activity not found.');
        const chapter = await this.getChapterById(activity.chapterId);

        const isAdmin = [SystemRole.ADMIN, SystemRole.SUPERADMIN].includes(author.systemRole);
        const isRegionalAdminForChapter = author.systemRole === SystemRole.REGIONAL_ADMIN && (chapter.regionalManagerId === author.id || chapter.associateRegionalDirectorId === author.id);
        const isOwner = activity.authorId === author.id;
        
        if (!isAdmin && !isRegionalAdminForChapter && !isOwner) {
            throw new ForbiddenException('Unauthorised to delete this activity.');
        }
        await activity.destroy();
        return { message: 'Activity deleted.' };
    }

    async getChapterVolunteers(chapterId: string) {
        this.logger.log(`Fetching volunteers for chapter ${chapterId}`);
        await this.getChapterById(chapterId);

        try {
            // 1. Get existing volunteers (Users in this chapter with VOLUNTEER flag)
            this.logger.log(`Querying active volunteers for chapter ${chapterId}`);
            const activeVolunteers = await this.userRepository.findAll({
                where: {
                    chapterId,
                    isActive: true,
                    flags: { [Op.contains]: [AccountFlags.VOLUNTEER] }
                },
                attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle', 'email'],
            });

            // 2. Get pending applications for this chapter
            this.logger.log(`Querying pending applications for chapter ${chapterId}`);
            const pendingApplications = await this.volunteerAppRepo.findAll({
                where: {
                    status: ApplicationStatus.PENDING
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        where: { chapterId },
                        attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'email']
                    },
                    {
                        model: VolunteerRole,
                        as: 'role',
                        attributes: ['name'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            this.logger.log(`Found ${activeVolunteers.length} active and ${pendingApplications.length} pending volunteers`);

            return {
                active: activeVolunteers,
                pending: pendingApplications,
                totalActive: activeVolunteers.length,
                totalPending: pendingApplications.length
            };
        } catch (error) {
            this.logger.error(`Error in getChapterVolunteers for chapter ${chapterId}:`, error);
            throw error;
        }
    }

    // ── CHAPTER FEED (community member posts within this chapter) ─────────────────

    async getChapterFeed(chapterId: string, viewer: User, page = 1, limit = 20) {
        await this.getChapterById(chapterId);
        const offset = (page - 1) * limit;

        const { count, rows: posts } = await this.postRepository.findAndCountAll({
            where: { chapterId, isPublished: true },
            include: [
                { model: User, as: 'author', attributes: [...POST_AUTHOR_ATTRS] },
                {
                    model: PostLike, as: 'likes', attributes: ['userId'], required: false,
                },
                {
                    model: PostComment, as: 'comments', attributes: ['id'], required: false,
                    where: { parentId: null }, paranoid: false,
                },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true,
        });

        const postIds = posts.map(p => p.id);
        let likedSet = new Set<string>();
        if (postIds.length > 0) {
            const myLikes = await this.likeRepository.findAll({
                where: { userId: viewer.id, postId: { [Op.in]: postIds } },
                attributes: ['postId'],
            });
            likedSet = new Set(myLikes.map(l => l.postId));
        }

        const data = posts.map(p => ({
            id: p.id,
            type: p.type,
            title: p.title ?? null,
            content: p.content,
            contentFormat: p.contentFormat,
            mediaUrls: p.mediaUrls ?? [],
            tags: p.tags ?? [],
            author: p.author,
            likesCount: p.likes?.length ?? 0,
            commentsCount: p.comments?.length ?? 0,
            isLikedByMe: likedSet.has(p.id),
            createdAt: p.createdAt,
        }));

        return { data, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) } };
    }
}
