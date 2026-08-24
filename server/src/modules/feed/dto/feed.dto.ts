import {
    IsString, IsNotEmpty, IsOptional, IsBoolean,
    IsArray, IsEnum, IsInt, Min, Max,
    MaxLength, ArrayMaxSize, IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostType, ContentFormat } from '../entities/post.entity';

// ─── FEED QUERY ──────────────────────────────────────────────────────────────

// ─── FEED QUERY ──────────────────────────────────────────────────────────────

export enum FeedFilter {
    ALL = 'ALL',
    CHAPTER = 'CHAPTER',
    PREMIUM = 'PREMIUM',
    BOOKMARKS = 'BOOKMARKS',
}

export class FeedQueryDto {
    @ApiPropertyOptional({
        enum: FeedFilter,
        default: FeedFilter.ALL,
        description:
            '`ALL` (default) — every published post; ' +
            '`CHAPTER` — only posts from members of your chapter; ' +
            '`PREMIUM` — only premium resource posts (paid members only); ' +
            '`BOOKMARKS` — only posts bookmarked by the current user.',
    })
    @IsOptional()
    @IsEnum(FeedFilter)
    filter?: FeedFilter;

    @ApiPropertyOptional({ description: 'Page number (1-based). Defaults to 1.', example: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ description: 'Posts per page (1–50). Defaults to 20.', example: 20, minimum: 1, maximum: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number;

    @ApiPropertyOptional({ description: 'Filter posts by topic ID' })
    @IsOptional()
    @IsString()
    topicId?: string;
}

// ─── CREATE POST ─────────────────────────────────────────────────────────────

export class CreatePostDto {
    @ApiPropertyOptional({
        enum: PostType,
        default: PostType.GENERAL,
        description: 'Post type. `RESOURCE` and `ANNOUNCEMENT` are org-staff only.',
    })
    @IsOptional()
    @IsEnum(PostType)
    type?: PostType = PostType.GENERAL;

    @ApiPropertyOptional({
        description: 'Optional title (useful for RESOURCE and EVENT posts).',
        example: 'How to Build a Pan-African Investment Thesis',
        maxLength: 200,
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @ApiPropertyOptional({
        description: 'Main post body. Format is declared by `contentFormat`.',
        example: '<h2>Pan-African Investment</h2><p>Here are the <strong>three pillars</strong>...</p>',
    })
    @IsString()
    @IsNotEmpty({ message: 'Post content cannot be empty.' })
    content: string;

    @ApiPropertyOptional({
        enum: ContentFormat,
        default: ContentFormat.PLAIN,
        description:
            'Declares how `content` should be rendered by the frontend. ' +
            '`PLAIN` = raw text; `MARKDOWN` = Markdown; `HTML` = sanitized HTML (XSS-safe, server-sanitized). ' +
            'When `HTML` is used, the server runs `sanitize-html` on the content before storage.',
    })
    @IsOptional()
    @IsEnum(ContentFormat)
    contentFormat?: ContentFormat = ContentFormat.PLAIN;

    @ApiPropertyOptional({
        description: 'Array of pre-uploaded media URLs (images, video, PDF, etc.).',
        type: [String],
        example: ['https://cdn.tatt.org/posts/img1.jpg'],
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10, { message: 'A post may contain at most 10 media attachments.' })
    @IsString({ each: true }) // Using IsString instead of IsUrl to be more permissive for localhost/dev
    mediaUrls?: string[];

    @ApiPropertyOptional({
        description: 'Hashtag-style tags for discoverability.',
        type: [String],
        example: ['fintech', 'investment', 'africa'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(10)
    tags?: string[];

    @ApiPropertyOptional({
        description:
            'Mark this post as premium (visible only to paid/org members). ' +
            'Rejected for FREE-tier community members.',
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isPremium?: boolean = false;

    @ApiPropertyOptional({
        description: 'Optional ID of the post being shared/reposted.',
        format: 'uuid',
    })
    @IsOptional()
    @IsString()
    parentPostId?: string;

    @ApiPropertyOptional({ description: 'UUID of the FeedTopic this post belongs to' })
    @IsOptional()
    @IsString()
    topicId?: string;

    @ApiPropertyOptional({ description: 'Link to the job description (for JOB posts).' })
    @IsOptional()
    @IsString()
    @IsUrl()
    jobLink?: string;

    @ApiPropertyOptional({ description: 'Location of the job (for JOB posts).' })
    @IsOptional()
    @IsString()
    jobLocation?: string;

    @ApiPropertyOptional({ description: 'Name of the company (for JOB posts).' })
    @IsOptional()
    @IsString()
    jobCompany?: string;

    @ApiPropertyOptional({ description: 'Event type (for EVENT posts). e.g. WEBINAR, WORKSHOP, CONFERENCE, IN_PERSON' })
    @IsOptional()
    @IsString()
    eventType?: string;

    @ApiPropertyOptional({ description: 'Date/time of the event (ISO string, for EVENT posts).' })
    @IsOptional()
    @IsString()
    eventDate?: string;

    @ApiPropertyOptional({ description: 'Registration / event URL (for EVENT posts).' })
    @IsOptional()
    @IsString()
    eventUrl?: string;
}

// ─── UPDATE POST ─────────────────────────────────────────────────────────────

export class UpdatePostDto {
    @ApiPropertyOptional({ maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    content?: string;

    @ApiPropertyOptional({
        enum: ContentFormat,
        description: 'Update the content format (e.g. switching from PLAIN to HTML after a rich-text edit).',
    })
    @IsOptional()
    @IsEnum(ContentFormat)
    contentFormat?: ContentFormat;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @IsString({ each: true })
    mediaUrls?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(10)
    tags?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isPremium?: boolean;

    @ApiPropertyOptional({ description: 'Unpublish/republish a post.', default: true })
    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;

    @ApiPropertyOptional({ description: 'Topic UUID to attach or switch to' })
    @IsOptional()
    @IsString()
    topicId?: string;
}

// ─── COMMENT ─────────────────────────────────────────────────────────────────

export class AddCommentDto {
    @ApiProperty({
        description: 'Comment text.',
        example: 'This is a really insightful perspective — thanks for sharing!',
    })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiPropertyOptional({
        description: 'ID of the parent comment to reply to. Omit for a top-level comment.',
        format: 'uuid',
    })
    @IsOptional()
    @IsString()
    parentId?: string;
}

export class GetCommentsQueryDto {
    @ApiPropertyOptional({ example: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}

// ─── REPORTING ───────────────────────────────────────────────────────────────

import { ReportAction } from '../entities/post-report.entity';

export class ReportPostDto {
    @ApiProperty({
        description: 'Reason for reporting the post.',
        example: 'Inappropriate content or community guideline violation.',
    })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiProperty({
        enum: ReportAction,
        default: ReportAction.LIMIT_RECOMMENDATION,
        description: 'Member suggested action for the administrators.',
    })
    @IsEnum(ReportAction)
    suggestedAction: ReportAction;
}

// ─── BATCH VIEWS RECORDING ───────────────────────────────────────────────────

export class RecordViewsDto {
    @ApiProperty({ description: 'Array of post UUIDs viewed by the member', example: ['c3d4e5f6-0001-4f71-bf14-01e23f4a5678'] })
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(100)
    postIds: string[];
}
