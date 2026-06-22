import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import sanitizeHtml, { simpleTransform, IOptions } from 'sanitize-html';  // ✅ Fixed import
import { Post, PostType, ContentFormat } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostUpvote } from './entities/post-upvote.entity';
import { PostBookmark } from './entities/post-bookmark.entity';
import { PostReport, ReportStatus } from './entities/post-report.entity';
import { FeedInsight } from './entities/feed-insight.entity';
import { FeedPrompt } from './entities/feed-prompt.entity';
import { FeedTopic } from './entities/feed-topic.entity';
import { User } from '../iam/entities/user.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { CommunityTier, SystemRole, AccountFlags } from '../iam/enums/roles.enum';
import {
    FeedQueryDto, FeedFilter,
    CreatePostDto, UpdatePostDto,
    AddCommentDto, GetCommentsQueryDto,
    ReportPostDto,
} from './dto/feed.dto';
import { FeedGateway } from './feed.gateway';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { MailService } from '../../common/mail/mail.service';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Tiers that can see premium content in full */
const PAID_TIERS: CommunityTier[] = [
    CommunityTier.UBUNTU,
    CommunityTier.IMANI,
    CommunityTier.KIONGOZI,
];

/** Org roles that can always see all content and mark posts as premium */
const STAFF_ROLES: SystemRole[] = [
    SystemRole.SUPERADMIN,
    SystemRole.ADMIN,
    SystemRole.MODERATOR,
    SystemRole.CONTENT_ADMIN,
    SystemRole.REGIONAL_ADMIN,
];

/** Minimal author fields returned in feed card */
const AUTHOR_ATTRS = [
    'id', 'firstName', 'lastName', 'profilePicture',
    'professionTitle', 'communityTier', 'tattMemberId', 'flags',
] as const;

const CHAPTER_ATTRS = ['id', 'name', 'code'] as const;

/**
 * Allowed HTML elements and attributes for rich-text posts.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'b', 'i', 'em', 'strong', 'u', 's', 'del', 'mark', 'small', 'sub', 'sup',
        'code', 'kbd', 'pre', 'abbr', 'span',
        'p', 'br', 'hr', 'blockquote', 'div', 'section',
        'ul', 'ol', 'li', 'a', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'img', 'figure', 'figcaption',
    ],
    allowedAttributes: {
        'a': ['href', 'target', 'rel', 'title'],
        'img': ['src', 'alt', 'width', 'height', 'loading'],
        'td': ['colspan', 'rowspan'],
        'th': ['colspan', 'rowspan'],
        'span': ['class'],
        'div': ['class'],
        'p': ['class'],
        'blockquote': ['class'],
        'pre': ['class'],
        'code': ['class'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: {
        'a': sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isStaff(user?: User): boolean {
    return user ? STAFF_ROLES.includes(user.systemRole) : false;
}

function isPaidMember(user?: User): boolean {
    return user ? PAID_TIERS.includes(user.communityTier) : false;
}

function canSeePremium(user?: User): boolean {
    return isStaff(user) || isPaidMember(user);
}

function canCreatePremium(user?: User): boolean {
    return isStaff(user) || isPaidMember(user);
}

function hasCompletedProfile(user: User): boolean {
    // Staff are exempt from mandatory profile completion to allow quick setup
    if (isStaff(user)) return true;
    return user.flags?.includes(AccountFlags.PROFILE_COMPLETED) ?? false;
}

/**
 * Sanitizes content when format is HTML; returns content as-is for PLAIN/MARKDOWN.
 */
function sanitizeContent(content: string, format: ContentFormat): string {
    if (format !== ContentFormat.HTML) return content;
    const clean = sanitizeHtml(content, SANITIZE_OPTIONS).trim();
    if (!clean) {
        throw new BadRequestException('HTML content was empty after sanitization.');
    }
    return clean;
}

/**
 * Strips or locks premium content based on viewer's plan.
 */
function applyPremiumGate(
    post: Post, 
    viewer: User | undefined, 
    likedPostIds: Set<string>,
    upvotedPostIds: Set<string>,
    bookmarkedPostIds: Set<string>
): Record<string, any> {
    const locked = post.isPremium && !canSeePremium(viewer);
    return {
        id: post.id,
        type: post.type,
        isPremium: post.isPremium,
        isPremiumLocked: locked,
        title: post.title ?? null,
        content: locked ? null : post.content,
        contentFormat: post.contentFormat,
        mediaUrls: locked ? [] : (post.mediaUrls ?? []),
        tags: post.tags ?? [],
        author: post.author,
        chapter: post.chapter ?? null,
        topic: post.topic ?? null,
        likesCount: post.likes?.length ?? 0,
        upvotesCount: post.upvotes?.length ?? 0,
        commentsCount: post.comments?.length ?? 0,
        isLikedByMe: likedPostIds.has(post.id),
        isUpvotedByMe: upvotedPostIds.has(post.id),
        isBookmarked: bookmarkedPostIds.has(post.id),
        isHighlighted: (post as any).isHighlighted ?? false,
        parentPost: post.parentPost ? applyPremiumGate(post.parentPost, viewer, new Set(), new Set(), new Set()) : null,
        jobLink: post.jobLink ?? null,
        jobLocation: post.jobLocation ?? null,
        jobCompany: post.jobCompany ?? null,
        eventType: (post as any).eventType ?? null,
        eventDate: (post as any).eventDate ?? null,
        eventUrl: (post as any).eventUrl ?? null,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
    };
}

@Injectable()
export class FeedService {
    private readonly logger = new Logger(FeedService.name);

    constructor(
        @InjectModel(Post) private postRepo: typeof Post,
        @InjectModel(PostLike) private likeRepo: typeof PostLike,
        @InjectModel(PostComment) private commentRepo: typeof PostComment,
        @InjectModel(PostUpvote) private upvoteRepo: typeof PostUpvote,
        @InjectModel(PostBookmark) private bookmarkRepo: typeof PostBookmark,
        @InjectModel(PostReport) private reportRepo: typeof PostReport,
        @InjectModel(FeedInsight) private insightRepo: typeof FeedInsight,
        @InjectModel(FeedPrompt) private promptRepo: typeof FeedPrompt,
        @InjectModel(FeedTopic) private topicRepo: typeof FeedTopic,
        @InjectModel(User) private userRepo: typeof User,
        private readonly feedGateway: FeedGateway,
        private readonly notificationsService: NotificationsService,
        private readonly mailService: MailService,
    ) { }

    // ════════════════════════════════════════════════════════════════════════════
    //  FEED QUERIES
    // ════════════════════════════════════════════════════════════════════════════

    async getFeed(viewer: User, query: FeedQueryDto) {
        const { filter = FeedFilter.ALL, page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;

        if (filter === FeedFilter.PREMIUM && !canSeePremium(viewer)) {
            throw new ForbiddenException('Upgrade your membership to access curated premium resources.');
        }

        if (filter === FeedFilter.CHAPTER && !viewer.chapterId) {
            return {
                data: [],
                meta: { total: 0, page, limit, totalPages: 0 },
                message: 'You are not assigned to a chapter.',
            };
        }

        const where: any = { isPublished: true };

        const include: any[] = [
            { model: Chapter, as: 'chapter', attributes: [...CHAPTER_ATTRS], required: false },
            { model: PostLike, as: 'likes', attributes: ['userId'], required: false },
            { model: PostUpvote, as: 'upvotes', attributes: ['userId'], required: false },
            { model: PostComment, as: 'comments', attributes: ['id'], required: false, where: { parentId: null }, paranoid: false },
            { model: FeedTopic, as: 'topic', required: false, attributes: ['id', 'name'] },
            { 
                model: Post, 
                as: 'parentPost', 
                required: false,
                include: [{ model: User, as: 'author', attributes: [...AUTHOR_ATTRS] }, { model: FeedTopic, as: 'topic', attributes: ['id', 'name'] }]
            }
        ];

        // ── SHADOW BAN LOGIC ────────────────────────────────────────────────
        // Staff see everything. Regular members only see non-shadow-banned posts
        // unless they are the author of the post.
        if (!isStaff(viewer)) {
            where[Op.and] = [
                {
                    [Op.or]: [
                        { isShadowBanned: false },
                        { authorId: viewer.id }
                    ]
                }
            ];
            
            // Also hide posts from shadow-banned users (except for the user themselves)
            include.push({
                model: User,
                as: 'author',
                attributes: [...AUTHOR_ATTRS],
                where: {
                    [Op.or]: [
                        { id: viewer.id },
                        { flags: null },
                        Sequelize.literal(`NOT ('SHADOW_BANNED' = ANY("author"."flags"))`)
                    ]
                }
            });
        } else {
            include.push({ model: User, as: 'author', attributes: [...AUTHOR_ATTRS] });
        }

        if (filter === FeedFilter.CHAPTER) {
            where['chapterId'] = viewer.chapterId;
        }

        if (filter === FeedFilter.PREMIUM) {
            where['isPremium'] = true;
        }

        if (query.topicId) {
            where['topicId'] = query.topicId;
        }

        // ── BOOKMARKS filter logic ───────────────────────────────────────────
        if (filter === FeedFilter.BOOKMARKS) {
            include.push({
                model: PostBookmark,
                as: 'bookmarks',
                where: { userId: viewer.id },
                required: true, // only posts that HAVE a bookmark from this user
            });
        } else {
            include.push({
                model: PostBookmark,
                as: 'bookmarks',
                attributes: ['userId'],
                required: false,
            });
        }

        const { count, rows: posts } = await this.postRepo.findAndCountAll({
            where,
            include,
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true,
        });

        const postIds = posts.map((p) => p.id);
        let likedPostIds = new Set<string>();
        let upvotedPostIds = new Set<string>();
        let bookmarkedPostIds = new Set<string>();

        if (postIds.length > 0) {
            const [likes, upvotes, bookmarks] = await Promise.all([
                this.likeRepo.findAll({ where: { userId: viewer.id, postId: { [Op.in]: postIds } }, attributes: ['postId'] }),
                this.upvoteRepo.findAll({ where: { userId: viewer.id, postId: { [Op.in]: postIds } }, attributes: ['postId'] }),
                this.bookmarkRepo.findAll({ where: { userId: viewer.id, postId: { [Op.in]: postIds } }, attributes: ['postId'] }),
            ]);
            likedPostIds = new Set(likes.map((l) => l.postId));
            upvotedPostIds = new Set(upvotes.map((u) => u.postId));
            bookmarkedPostIds = new Set(bookmarks.map((b) => b.postId));
        }

        const data = posts.map((post) => applyPremiumGate(post, viewer, likedPostIds, upvotedPostIds, bookmarkedPostIds));

        return {
            data,
            meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
        };
    }

    async getPost(viewer: User | undefined, postId: string) {
        const post = await this.postRepo.findByPk(postId, {
            include: [
                { model: User, as: 'author', attributes: [...AUTHOR_ATTRS] },
                { model: Chapter, as: 'chapter', attributes: [...CHAPTER_ATTRS], required: false },
                { model: PostLike, as: 'likes', attributes: ['userId'], required: false },
                { model: PostUpvote, as: 'upvotes', attributes: ['userId'], required: false },
                { model: PostBookmark, as: 'bookmarks', attributes: ['userId'], required: false },
                { model: PostComment, as: 'comments', attributes: ['id'], required: false, paranoid: false },
                { model: FeedTopic, as: 'topic', required: false, attributes: ['id', 'name'] },
                { model: Post, as: 'parentPost', required: false, include: [{ model: User, as: 'author', attributes: [...AUTHOR_ATTRS] }, { model: FeedTopic, as: 'topic', attributes: ['id', 'name'] }] }
            ],
        });

        if (!post || !post.isPublished) throw new NotFoundException('Post not found.');

        const isOwner = viewer && post.authorId === viewer.id;
        const isStaffUser = isStaff(viewer);

        if (post.isShadowBanned && !isOwner && !isStaffUser) {
            throw new NotFoundException('Post not found.');
        }

        // Also check if author is shadow banned
        const authorIsShadowBanned = post.author?.flags?.includes(AccountFlags.SHADOW_BANNED);
        if (authorIsShadowBanned && !isOwner && !isStaffUser) {
            throw new NotFoundException('Post not found.');
        }

        let liked = false, upvoted = false, bookmarked = false;
        if (viewer) {
            const [l, u, b] = await Promise.all([
                this.likeRepo.findOne({ where: { userId: viewer.id, postId } }),
                this.upvoteRepo.findOne({ where: { userId: viewer.id, postId } }),
                this.bookmarkRepo.findOne({ where: { userId: viewer.id, postId } }),
            ]);
            liked = !!l; upvoted = !!u; bookmarked = !!b;
        }

        return applyPremiumGate(
            post, viewer, 
            new Set(liked ? [postId] : []), 
            new Set(upvoted ? [postId] : []), 
            new Set(bookmarked ? [postId] : [])
        );
    }

    async createPost(author: User, dto: CreatePostDto) {
        if (!hasCompletedProfile(author)) {
            throw new ForbiddenException(
                'Profile Setup Required: Please complete your professional profile (Title, Industry, Bio, and Interests) before posting to the TATT Feed.'
            );
        }

        if (dto.isPremium && !canCreatePremium(author)) {

            throw new ForbiddenException('Only paid members and staff can create premium posts.');
        }

        const restrictedTypes = [PostType.ANNOUNCEMENT, PostType.RESOURCE];
        if (restrictedTypes.includes(dto.type) && !isStaff(author)) {
            throw new ForbiddenException(`Only staff can create ${dto.type} posts.`);
        }

        if (dto.type === PostType.JOB && !canCreatePremium(author)) {
            throw new ForbiddenException('Only paid members and staff can create job announcement posts.');
        }

        const fullAuthor = await this.userRepo.findByPk(author.id, { attributes: ['id', 'chapterId'] });
        const format = dto.contentFormat ?? ContentFormat.PLAIN;
        const sanitizedContent = sanitizeContent(dto.content, format);

        const post = await this.postRepo.create({
            authorId: author.id,
            type: dto.type ?? PostType.GENERAL,
            title: dto.title ?? null,
            content: sanitizedContent,
            contentFormat: format,
            mediaUrls: dto.mediaUrls ?? [],
            tags: dto.tags ?? [],
            isPremium: dto.isPremium ?? false,
            chapterId: fullAuthor?.chapterId ?? null,
            topicId: dto.topicId ?? null,
            isPublished: true,
            parentPostId: dto.parentPostId ?? null,
            jobLink: dto.jobLink ?? null,
            jobLocation: dto.jobLocation ?? null,
            jobCompany: dto.jobCompany ?? null,
            eventType: dto.eventType ?? null,
            eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
            eventUrl: dto.eventUrl ?? null,
        });

        // ── Real-time Notification ───────────────────────────────────────────
        // We fetch the post with author info to broadcast it
        const broadcastPost = await this.postRepo.findByPk(post.id, {
            include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRS as any }],
        });
        if (broadcastPost) {
            this.feedGateway.broadcastNewPost(broadcastPost);
        }

        if (dto.parentPostId) {
            const parentPost = await this.postRepo.findByPk(dto.parentPostId);
            if (parentPost && parentPost.authorId === author.id) {
                // Count existing reposts of this same post by this author
                const repostCount = await this.postRepo.count({
                    where: {
                        authorId: author.id,
                        parentPostId: dto.parentPostId,
                    },
                });
                if (repostCount >= 2) {
                    throw new ForbiddenException('You can only repost your own strategic insight twice.');
                }
            }
        }

        return { message: 'Post published successfully.', postId: post.id };
    }

    async updatePost(viewer: User, postId: string, dto: UpdatePostDto) {
        const post = await this.postRepo.findByPk(postId);
        if (!post) throw new NotFoundException('Post not found.');

        const isOwner = post.authorId === viewer.id;
        if (!isOwner && !isStaff(viewer)) throw new ForbiddenException('Not authorised.');

        if (dto.isPremium === true && !canCreatePremium(viewer)) {
            throw new ForbiddenException('Not authorised to mark as premium.');
        }

        const format = dto.contentFormat ?? post.contentFormat;
        const sanitizedContent = dto.content !== undefined ? sanitizeContent(dto.content, format) : undefined;

        Object.assign(post, {
            ...(dto.title !== undefined && { title: dto.title }),
            ...(sanitizedContent !== undefined && { content: sanitizedContent }),
            ...(dto.contentFormat !== undefined && { contentFormat: dto.contentFormat }),
            ...(dto.mediaUrls !== undefined && { mediaUrls: dto.mediaUrls }),
            ...(dto.tags !== undefined && { tags: dto.tags }),
            ...(dto.isPremium !== undefined && { isPremium: dto.isPremium }),
            ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        });

        await post.save();
        return { message: 'Post updated.' };
    }

    async deletePost(viewer: User, postId: string) {
        const post = await this.postRepo.findByPk(postId);
        if (!post) throw new NotFoundException('Post not found.');
        
        const isOwner = post.authorId === viewer.id;
        const isStaffUser = isStaff(viewer);

        if (!isOwner && !isStaffUser) {
            throw new ForbiddenException('You are not authorized to delete this post.');
        }

        // Only enforce 30-minute window for authors (staff can delete anytime)
        if (isOwner && !isStaffUser) {
            const minutesSinceCreation = (new Date().getTime() - new Date(post.createdAt).getTime()) / 60000;
            if (minutesSinceCreation > 30) {
                throw new ForbiddenException('Posts can only be deleted within 30 minutes of publishing.');
            }
        }

        await post.destroy();
        return { message: 'Post removed.' };
    }

    async toggleLike(viewer: User, postId: string) {
        const post = await this.postRepo.findByPk(postId);
        if (!post || !post.isPublished) throw new NotFoundException('Post not found.');
        if (post.authorId === viewer.id) throw new BadRequestException('You cannot like your own post.');

        if (post.isPremium && !canSeePremium(viewer)) throw new ForbiddenException('Upgrade required.');

        const existing = await this.likeRepo.findOne({ where: { userId: viewer.id, postId } });
        if (existing) { await existing.destroy(); return { liked: false, message: 'Post unliked.' }; }

        await this.likeRepo.create({ userId: viewer.id, postId });
        return { liked: true, message: 'Post liked.' };
    }

    async toggleUpvote(viewer: User, postId: string) {
        const post = await this.postRepo.findByPk(postId);
        if (!post || !post.isPublished) throw new NotFoundException('Post not found.');
        if (post.authorId === viewer.id) throw new BadRequestException('You cannot upvote your own post.');

        const existing = await this.upvoteRepo.findOne({ where: { userId: viewer.id, postId } });
        if (existing) { await existing.destroy(); return { upvoted: false }; }

        await this.upvoteRepo.create({ userId: viewer.id, postId });
        return { upvoted: true };
    }

    async toggleBookmark(viewer: User, postId: string) {
        const post = await this.postRepo.findByPk(postId);
        if (!post || !post.isPublished) throw new NotFoundException('Post not found.');

        const existing = await this.bookmarkRepo.findOne({ where: { userId: viewer.id, postId } });
        if (existing) { await existing.destroy(); return { bookmarked: false, message: 'Bookmark removed.' }; }

        await this.bookmarkRepo.create({ userId: viewer.id, postId });
        return { bookmarked: true, message: 'Post bookmarked.' };
    }

    async reportPost(reporter: User, postId: string, dto: any) {
        const post = await this.postRepo.findByPk(postId);
        if (!post) throw new NotFoundException('Post not found.');

        await this.reportRepo.create({
            postId,
            reporterId: reporter.id,
            reason: dto.reason,
            suggestedAction: dto.suggestedAction,
        });

        return { message: 'Report submitted.' };
    }

    async getComments(viewer: User, postId: string, query: GetCommentsQueryDto) {
        const post = await this.postRepo.findByPk(postId, { attributes: ['id', 'isPublished', 'isPremium'] });
        if (!post || !post.isPublished) throw new NotFoundException('Post not found.');
        if (post.isPremium && !canSeePremium(viewer)) throw new ForbiddenException('Upgrade required.');

        const { page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;

        const { count, rows } = await this.commentRepo.findAndCountAll({
            where: { postId, parentId: null },
            include: [
                { model: User, as: 'author', attributes: [...AUTHOR_ATTRS] },
                { model: PostComment, as: 'replies', required: false, where: { deletedAt: null }, include: [{ model: User, as: 'author', attributes: [...AUTHOR_ATTRS] }] },
            ],
            order: [['createdAt', 'DESC']],
            limit, offset, distinct: true,
        });

        return { data: rows, meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) } };
    }

    async addComment(author: User, postId: string, dto: AddCommentDto) {
        if (!hasCompletedProfile(author)) {
            throw new ForbiddenException(
                'Profile Setup Required: Please complete your professional profile before joining the conversation.'
            );
        }

        const post = await this.postRepo.findByPk(postId);

        if (!post || !post.isPublished) throw new NotFoundException('Post not found.');
        if (post.authorId === author.id) throw new BadRequestException('You cannot comment on your own post.');

        if (post.isPremium && !canSeePremium(author)) throw new ForbiddenException('Upgrade required.');

        const comment = await this.commentRepo.create({ postId, authorId: author.id, content: dto.content, parentId: dto.parentId ?? null });
        
        // Broadcast real-time
        const fullComment = await this.commentRepo.findByPk(comment.id, {
            include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRS as any }],
        });
        this.feedGateway.broadcastNewComment(postId, fullComment);

        return { message: 'Comment added.', commentId: comment.id };
    }

    async deleteComment(viewer: User, commentId: string) {
        const comment = await this.commentRepo.findByPk(commentId, { include: [{ model: Post, as: 'post', attributes: ['authorId'] }] });
        if (!comment) throw new NotFoundException('Comment not found.');
        if (comment.authorId !== viewer.id && comment.post?.authorId !== viewer.id && !isStaff(viewer)) throw new ForbiddenException('Not authorised.');
        await comment.destroy();
        return { message: 'Comment removed.' };
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  ADMIN / MODERATION
    // ════════════════════════════════════════════════════════════════════════════

    async getAdminStats() {
        const [reportsHandled, activeDiscussions, flaggedUsers] = await Promise.all([
            this.reportRepo.count({ where: { status: ReportStatus.RESOLVED } }),
            this.postRepo.count({ where: { isPublished: true, createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
            this.userRepo.count({ where: { flags: Sequelize.literal(`'SHADOW_BANNED' = ANY("flags")`) } }),
        ]);

        return {
            reportsHandled,
            activeDiscussions,
            flaggedUsers,
        };
    }

    async getReportQueue() {
        return this.reportRepo.findAll({
            where: { status: ReportStatus.PENDING },
            include: [
                { 
                    model: Post, 
                    as: 'post', 
                    include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRS as any }] 
                },
                { model: User, as: 'reporter', attributes: AUTHOR_ATTRS as any },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async handleReport(admin: User, reportId: string, action: 'RESOLVE' | 'DISMISS', notes?: string) {
        const report = await this.reportRepo.findByPk(reportId);
        if (!report) throw new NotFoundException('Report not found');

        report.status = action === 'RESOLVE' ? ReportStatus.RESOLVED : ReportStatus.DISMISSED;
        report.adminNotes = notes;
        await report.save();

        return { message: `Report ${action.toLowerCase()}d.` };
    }

    async shadowBanPost(admin: User, postId: string, status: boolean) {
        const post = await this.postRepo.findByPk(postId);
        if (!post) throw new NotFoundException('Post not found');

        post.isShadowBanned = status;
        await post.save();

        return { message: `Post shadow ban ${status ? 'enabled' : 'disabled'}.` };
    }

    async shadowBanUser(admin: User, userId: string, status: boolean) {
        const user = await this.userRepo.findByPk(userId);
        if (!user) throw new NotFoundException('User not found');

        let flags = user.flags || [];
        if (status) {
            if (!flags.includes(AccountFlags.SHADOW_BANNED)) flags.push(AccountFlags.SHADOW_BANNED);
        } else {
            flags = flags.filter(f => f !== AccountFlags.SHADOW_BANNED);
        }

        user.flags = flags;
        await user.save();

        return { message: `User shadow ban ${status ? 'enabled' : 'disabled'}.` };
    }

    // ─── Feed Curation (Insights & Prompts) ──────────────────────────────────

    async createTopic(dto: { name: string; description?: string }) {
        return this.topicRepo.create({ name: dto.name, description: dto.description });
    }

    async getTopics() {
        return this.topicRepo.findAll({
            where: { isArchived: false },
            order: [['name', 'ASC']],
            include: [{ model: Post, attributes: ['id'] }],
        });
    }

    async archiveTopic(topicId: string) {
        const topic = await this.topicRepo.findByPk(topicId);
        if (!topic) throw new NotFoundException('Topic not found');
        topic.isArchived = true;
        await topic.save();
        return { message: 'Topic archived' };
    }

    async createInsight(dto: { title: string; content: string; startDate?: string }) {
        // Deactivate existing active insights if any (optional, but UI shows one active slot)
        await this.insightRepo.update({ isActive: false }, { where: { isActive: true } });

        const insight = await this.insightRepo.create({
            title: dto.title,
            content: dto.content,
            startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
            isActive: true,
        });
        return insight;
    }

    async getInsights() {
        return this.insightRepo.findAll({ order: [['createdAt', 'DESC']] });
    }

    async deleteInsight(id: string) {
        await this.insightRepo.destroy({ where: { id } });
        return { message: 'Insight removed.' };
    }

    async createPrompt(dto: { prompt: string }) {
        return this.promptRepo.create({
            prompt: dto.prompt,
            isActive: false, // Created prompts are inactive by default until rotated
        });
    }

    async getPrompts() {
        return this.promptRepo.findAll({ order: [['createdAt', 'DESC']] });
    }

    async rotatePrompt() {
        // Find all prompts
        const allPrompts = await this.promptRepo.findAll();
        if (allPrompts.length === 0) return null;

        // Deactivate current active one
        await this.promptRepo.update({ isActive: false }, { where: { isActive: true } });

        // Select a random one to activate
        const nextPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];
        nextPrompt.isActive = true;
        
        // Randomize counts for aesthetic "live node" feel as requested in UI
        nextPrompt.messageCount = Math.floor(Math.random() * 500) + 100;
        nextPrompt.zapCount = Math.floor(Math.random() * 1000) + 200;
        
        await nextPrompt.save();
        return nextPrompt;
    }

    async getActiveCuration() {
        const [insight, prompt] = await Promise.all([
            this.insightRepo.findOne({ where: { isActive: true }, order: [['createdAt', 'DESC']] }),
            this.promptRepo.findOne({ where: { isActive: true } }),
        ]);

        return { insight, prompt };
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  SCHEDULED TASKS (DAILY SUMMARY)
    // ════════════════════════════════════════════════════════════════════════════

    @Cron(CronExpression.EVERY_DAY_AT_11PM)
    async sendDailyCommunityDigest() {
        this.logger.log('[TATT-Digest] Starting daily community digest process...');
        
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // 1. Get new posts across platform
        const globalPostCount = await this.postRepo.count({
            where: { createdAt: { [Op.gte]: startOfDay }, isPublished: true }
        });

        if (globalPostCount === 0) {
            this.logger.log('[TATT-Digest] No new posts today. Skipping digest.');
            return;
        }

        // 2. Get breakdown by chapter
        const chapters = await Chapter.findAll();
        const chapterPostCounts = new Map<string, number>();

        for (const chapter of chapters) {
            const count = await this.postRepo.count({
                where: { chapterId: chapter.id, createdAt: { [Op.gte]: startOfDay }, isPublished: true }
            });
            chapterPostCounts.set(chapter.id, count);
        }

        // 3. Send emails to all users
        const users = await this.userRepo.findAll({
            where: { isActive: true, deletedAt: null },
            attributes: ['id', 'email', 'firstName', 'chapterId']
        });

        this.logger.log(`[TATT-Digest] Sending digest to ${users.length} members...`);

        for (const user of users) {
             const chapterPosts = user.chapterId ? (chapterPostCounts.get(user.chapterId) || 0) : 0;
             const platformPosts = globalPostCount;

             // Only send if there's actual activity to show
             if (platformPosts > 0) {
                 await this.mailService.sendDailyDigest(
                     user.email,
                     user.firstName || 'Member',
                     platformPosts,
                     chapterPosts,
                     user.chapterId ? chapters.find(c => c.id === user.chapterId)?.name : undefined
                 );
             }
        }

        this.logger.log('[TATT-Digest] Daily digest completed.');
    }
}
