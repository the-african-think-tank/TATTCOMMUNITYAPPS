import {
    Table, Column, Model, DataType, Default,
    ForeignKey, BelongsTo, HasMany,
} from 'sequelize-typescript';
import { User } from '../../iam/entities/user.entity';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { PostLike } from './post-like.entity';
import { PostComment } from './post-comment.entity';
import { FeedTopic } from './feed-topic.entity';

export enum ContentFormat {
    PLAIN = 'PLAIN',    // Raw plain text
    MARKDOWN = 'MARKDOWN', // Markdown (frontend renders with a MD parser)
    HTML = 'HTML',     // Sanitized HTML (sanitize-html runs on write)
}

export enum PostType {
    GENERAL = 'GENERAL',     // Standard member post (text + media)
    RESOURCE = 'RESOURCE',    // Premium knowledge resource (articles, guides)
    EVENT = 'EVENT',       // Upcoming chapter or global event
    ANNOUNCEMENT = 'ANNOUNCEMENT', // Org-wide announcement (admin-authored)
    JOB = 'JOB',                   // Job listing (member-authored)
}

import { PostUpvote } from './post-upvote.entity';
import { PostBookmark } from './post-bookmark.entity';
import { PostReport } from './post-report.entity';

@Table({
    tableName: 'posts',
    timestamps: true,
    paranoid: true, // soft delete — preserves comment/like history
})
export class Post extends Model<Post> {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    id: string;

    // ─── AUTHOR ───────────────────────────────────────────────────────────────
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    authorId: string;

    @BelongsTo(() => User, 'authorId')
    author: User;

    // ─── CONTENT ─────────────────────────────────────────────────────────────
    @Default(PostType.GENERAL)
    @Column({
        type: DataType.ENUM(...Object.values(PostType)),
        allowNull: false,
    })
    type: PostType;

    @Column({ type: DataType.STRING, allowNull: true })
    title?: string;

    /**
     * Rich-text content. Format is declared by `contentFormat`.
     * HTML content is sanitized server-side before persistence (XSS-safe).
     */
    @Column({ type: DataType.TEXT, allowNull: false })
    content: string;

    /**
     * Tells the frontend how to render `content`.
     * PLAIN  → display as-is
     * MARKDOWN → parse and render with a Markdown library
     * HTML  → render as HTML (guaranteed sanitized by the API)
     */
    @Default(ContentFormat.PLAIN)
    @Column({
        type: DataType.ENUM(...Object.values(ContentFormat)),
        allowNull: false,
    })
    contentFormat: ContentFormat;

    /**
     * Array of media URLs (images, videos, documents).
     * Stored as a Postgres string array. Files are uploaded to S3/CDN first
     * and the returned URLs are passed here.
     */
    @Column({ type: DataType.ARRAY(DataType.TEXT), defaultValue: [] })
    mediaUrls: string[];

    /** Optional hashtag-style tags for discoverability */
    @Column({ type: DataType.ARRAY(DataType.STRING), defaultValue: [] })
    tags: string[];

    // ─── PREMIUM GATING ───────────────────────────────────────────────────────
    /**
     * If true, the full `content` and `mediaUrls` are hidden from FREE-tier members.
     * They receive `content: null` and `isPremiumLocked: true` in the response.
     * Only paid members (UBUNTU / IMANI / KIONGOZI) and org staff can see the full post.
     */
    @Default(false)
    @Column(DataType.BOOLEAN)
    isPremium: boolean;

    // ─── CHAPTER SCOPING ─────────────────────────────────────────────────────
    /**
     * Automatically set to the author's chapterId on creation.
     * null = no chapter affiliation (post appears in ALL and PREMIUM filters only).
     * CHAPTER filter surfaces only posts where this matches the viewer's chapterId.
     */
    @ForeignKey(() => Chapter)
    @Column({ type: DataType.UUID, allowNull: true })
    chapterId?: string;

    @BelongsTo(() => Chapter, 'chapterId')
    chapter: Chapter;

    // ─── JOB POST METADATA ────────────────────────────────────────────────────────
    @Column({ type: DataType.STRING, allowNull: true })
    jobLink?: string;

    @Column({ type: DataType.STRING, allowNull: true })
    jobLocation?: string;

    @Column({ type: DataType.STRING, allowNull: true })
    jobCompany?: string;

    // ─── EVENT POST METADATA ─────────────────────────────────────────────────────
    @Column({ type: DataType.STRING, allowNull: true })
    eventType?: string; // e.g. WEBINAR, WORKSHOP, CONFERENCE, IN_PERSON

    @Column({ type: DataType.DATE, allowNull: true })
    eventDate?: Date;

    @Column({ type: DataType.STRING, allowNull: true })
    eventUrl?: string;

    // ─── METRICS & PUBLISH STATE ──────────────────────────────────────────────
    @Default(0)
    @Column({ type: DataType.INTEGER, allowNull: false })
    viewsCount: number;

    @Default(true)
    @Column(DataType.BOOLEAN)
    isPublished: boolean;

    @Default(false)
    @Column(DataType.BOOLEAN)
    isShadowBanned: boolean;

    // ─── REPOSTING ────────────────────────────────────────────────────────────
    @ForeignKey(() => Post)
    @Column({ type: DataType.UUID, allowNull: true })
    parentPostId?: string;

    @BelongsTo(() => Post, 'parentPostId')
    parentPost?: Post;

    // ─── TOPIC ────────────────────────────────────────────────────────────
    @ForeignKey(() => FeedTopic)
    @Column({ type: DataType.UUID, allowNull: true })
    topicId?: string;

    @BelongsTo(() => FeedTopic, 'topicId')
    topic?: FeedTopic;

    // ─── ASSOCIATIONS ─────────────────────────────────────────────────────────
    @HasMany(() => PostLike, 'postId')
    likes: PostLike[];

    @HasMany(() => PostComment, 'postId')
    comments: PostComment[];

    @HasMany(() => PostUpvote, 'postId')
    upvotes: PostUpvote[];

    @HasMany(() => PostBookmark, 'postId')
    bookmarks: PostBookmark[];

    @HasMany(() => PostReport, 'postId')
    reports: PostReport[];
}
