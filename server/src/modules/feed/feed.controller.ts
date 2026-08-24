import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, ParseUUIDPipe,
    UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
    ApiTags, ApiOperation, ApiBearerAuth,
    ApiParam, ApiBody, ApiQuery, ApiResponse,
    ApiExtraModels, getSchemaPath,
} from '@nestjs/swagger';
import { FeedService } from './feed.service';
import {
    FeedQueryDto, FeedFilter,
    CreatePostDto, UpdatePostDto,
    AddCommentDto, GetCommentsQueryDto,
    ReportPostDto, RecordViewsDto,
} from './dto/feed.dto';
import {
    PostCardSchema, PostAuthorSchema, PostChapterSchema,
    FeedResponseSchema, FeedMetaSchema,
    ToggleLikeResponseSchema,
    CommentSchema, CommentReplySchema, CommentAuthorSchema, CommentsResponseSchema,
    CreatePostResponseSchema, CreateCommentResponseSchema, FeedMessageResponseSchema,
} from './dto/feed.schemas';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('TATT Feed')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiExtraModels(
    // Register all schemas so Swagger can build the $ref graph
    PostCardSchema, PostAuthorSchema, PostChapterSchema,
    FeedResponseSchema, FeedMetaSchema,
    ToggleLikeResponseSchema,
    CommentSchema, CommentReplySchema, CommentAuthorSchema, CommentsResponseSchema,
    CreatePostResponseSchema, CreateCommentResponseSchema, FeedMessageResponseSchema,
    CreatePostDto, UpdatePostDto, AddCommentDto, ReportPostDto,
)
@Controller('feed')
export class FeedController {
    constructor(private readonly feedService: FeedService) { }

    // ═══════════════════════════════════════════════════════════════════════════
    //  FEED — listing
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Get the TATT Feed',
        description:
            'Returns a reverse-chronological, paginated list of posts.\n\n' +
            '### Feed Filters\n' +
            '| Filter | Who sees it | What is returned |\n' +
            '|---|---|---|\n' +
            '| `ALL` *(default)* | Everyone | All published posts |\n' +
            '| `CHAPTER` | Everyone | Posts from members of **your** chapter only |\n' +
            '| `PREMIUM` | **Paid members + org staff only** | Premium resource posts only |\n\n' +
            '### Premium gating in `ALL` feed\n' +
            'Premium posts are **visible** to Free-tier members in the `ALL` feed, but `content` becomes ' +
            '`null` and `mediaUrls` becomes `[]`. ' +
            'The `isPremiumLocked: true` flag tells the frontend to show an upgrade prompt instead of the body.',
    })
    @ApiQuery({
        name: 'filter',
        enum: FeedFilter,
        required: false,
        description: 'Feed lens. `ALL` | `CHAPTER` | `PREMIUM`',
        example: FeedFilter.ALL,
    })
    @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Page number (1-based)' })
    @ApiQuery({ name: 'limit', type: Number, required: false, example: 20, description: 'Results per page (1–50)' })
    @ApiResponse({
        status: 200,
        description: 'Paginated feed posts.',
        type: FeedResponseSchema,
    })
    @ApiResponse({
        status: 200,
        description: '`CHAPTER` filter when the user has no chapter assigned.',
        schema: {
            properties: {
                data: { type: 'array', items: {}, example: [] },
                meta: { type: 'object', example: { total: 0, page: 1, limit: 20, totalPages: 0 } },
                message: { type: 'string', example: 'You are not assigned to a chapter. Join a chapter to see local posts.' },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Attempted `PREMIUM` filter with a Free-tier account.',
        schema: {
            properties: {
                statusCode: { type: 'integer', example: 403 },
                message: {
                    type: 'string',
                    example:
                        'The Premium feed is exclusively available to paid TATT members (Ubuntu, Imani, or Kiongozi tier). ' +
                        'Upgrade your membership to access curated premium resources.',
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
    @Get()
    async getFeed(@Request() req, @Query() query: FeedQueryDto) {
        return this.feedService.getFeed(req.user, query);
    }

    @ApiOperation({ summary: 'Get active trending insight and community prompt' })
    @Get('curation/active')
    async getActiveCuration() {
        return this.feedService.getActiveCuration();
    }

    @ApiOperation({ summary: 'Batch record feed post views (impressions)' })
    @HttpCode(HttpStatus.OK)
    @Post('views')
    async recordViews(@Request() req, @Body() dto: RecordViewsDto) {
        return this.feedService.recordViews(req.user, dto);
    }

    @ApiOperation({ summary: 'Get available feed topics' })
    @Get('topics')
    async getTopics() {
        return this.feedService.getTopics();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  FEED — single post
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Get a single post by ID',
        description:
            'Fetches a single published post by its UUID. ' +
            'Premium gating applies identically to the feed — Free-tier members receive `content: null` ' +
            'and `isPremiumLocked: true` for premium posts.',
    })
    @ApiParam({
        name: 'postId',
        format: 'uuid',
        description: 'UUID of the post to retrieve',
        example: 'c3d4e5f6-0001-4000-a000-000000000001',
    })
    @ApiResponse({
        status: 200,
        description: 'Full post object (premium-gated when applicable).',
        type: PostCardSchema,
    })
    @ApiResponse({
        status: 404,
        description: 'Post not found or has been unpublished/deleted.',
        schema: {
            properties: {
                statusCode: { type: 'integer', example: 404 },
                message: { type: 'string', example: 'Post not found.' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
    @Public()
    @Get(':postId')
    async getPost(
        @Request() req,
        @Param('postId', ParseUUIDPipe) postId: string,
    ) {
        return this.feedService.getPost(req.user, postId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  FEED — create post
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Create a new post',
        description:
            '### Post Permissions\n' +
            '| Post type | Minimum permission |\n' +
            '|---|---|\n' +
            '| `GENERAL` | Any authenticated member |\n' +
            '| `EVENT` | Any authenticated member |\n' +
            '| `RESOURCE` | Org staff only (Admin, Moderator, Content Admin, Regional Admin) |\n' +
            '| `ANNOUNCEMENT` | Org staff only |\n\n' +
            '### Premium flag\n' +
            'Setting `isPremium: true` requires a **paid membership tier** (Ubuntu / Imani / Kiongozi) or org staff role.\n\n' +
            '### Rich text\n' +
            'Pass `contentFormat: "HTML"` to enable rich text. ' +
            'The server runs `sanitize-html` with a strict allowlist before persistence — ' +
            'scripts, iframes, event handlers, and unsafe URI schemes are stripped automatically.\n\n' +
            '### Chapter scoping\n' +
            'The post is automatically tagged with the author\'s chapter (if any). ' +
            'This makes it appear in the `CHAPTER` filter for members of the same chapter.',
    })
    @ApiBody({ type: CreatePostDto })
    @ApiResponse({
        status: 201,
        description: 'Post published successfully.',
        type: CreatePostResponseSchema,
    })
    @ApiResponse({
        status: 400,
        description: 'Validation error or HTML content was empty after sanitization.',
        schema: {
            properties: {
                statusCode: { type: 'integer', example: 400 },
                message: { type: 'string', example: 'HTML content was empty after sanitization.' },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Insufficient tier or role for the requested post type or premium flag.',
        schema: {
            properties: {
                statusCode: { type: 'integer', example: 403 },
                message: {
                    type: 'string',
                    example: 'Only paid members (Ubuntu, Imani, Kiongozi) and org staff can create premium posts.',
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createPost(@Request() req, @Body() dto: CreatePostDto) {
        return this.feedService.createPost(req.user, dto);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  FEED — update post
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Update a post',
        description:
            'Partial update — only provided fields are changed. ' +
            '**Authors** can edit their own posts. **Org staff** (Moderator, Admin, etc.) can edit any post.\n\n' +
            'Updating `content` with `contentFormat: "HTML"` triggers re-sanitization before save. ' +
            'Setting `isPublished: false` hides the post from all feed views without deleting it.',
    })
    @ApiParam({
        name: 'postId',
        format: 'uuid',
        description: 'UUID of the post to update',
        example: 'c3d4e5f6-0001-4000-a000-000000000001',
    })
    @ApiBody({ type: UpdatePostDto })
    @ApiResponse({ status: 200, description: 'Post updated.', type: FeedMessageResponseSchema })
    @ApiResponse({
        status: 403,
        description: 'Caller is not the post author or an org moderator.',
        schema: {
            properties: {
                statusCode: { type: 'integer', example: 403 },
                message: { type: 'string', example: 'You can only edit your own posts.' },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Post not found.', schema: { properties: { statusCode: { type: 'integer', example: 404 }, message: { type: 'string', example: 'Post not found.' } } } })
    @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
    @Patch(':postId')
    async updatePost(
        @Request() req,
        @Param('postId', ParseUUIDPipe) postId: string,
        @Body() dto: UpdatePostDto,
    ) {
        return this.feedService.updatePost(req.user, postId, dto);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  FEED — delete post
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Delete a post (soft-delete)',
        description:
            'Soft-deletes the post — it is hidden from all feed views but its likes and comments are preserved. ' +
            'Only the **post author** or **org staff** can delete a post.',
    })
    @ApiParam({
        name: 'postId',
        format: 'uuid',
        description: 'UUID of the post to delete',
        example: 'c3d4e5f6-0001-4000-a000-000000000001',
    })
    @ApiResponse({ status: 200, description: 'Post removed from feed.', type: FeedMessageResponseSchema })
    @ApiResponse({ status: 403, description: 'Not the author or a moderator.', schema: { properties: { statusCode: { type: 'integer', example: 403 }, message: { type: 'string', example: 'You can only delete your own posts.' } } } })
    @ApiResponse({ status: 404, description: 'Post not found.' })
    @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
    @Delete(':postId')
    @HttpCode(HttpStatus.OK)
    async deletePost(
        @Request() req,
        @Param('postId', ParseUUIDPipe) postId: string,
    ) {
        return this.feedService.deletePost(req.user, postId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  LIKES
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Toggle like on a post',
        description:
            'A single call both likes **and** unlikes — if the user has already liked the post, ' +
            'calling this endpoint again removes the like. ' +
            'The response `liked` boolean tells the frontend which action was performed.\n\n' +
            '**Note:** Free-tier members cannot like premium-locked posts.',
    })
    @ApiParam({
        name: 'postId',
        format: 'uuid',
        description: 'UUID of the post to like/unlike',
        example: 'c3d4e5f6-0001-4000-a000-000000000001',
    })
    @ApiResponse({
        status: 200,
        description: 'Like toggled. `liked: true` = post is now liked; `liked: false` = like removed.',
        type: ToggleLikeResponseSchema,
    })
    @ApiResponse({
        status: 403,
        description: 'Free-tier member attempted to interact with a premium-locked post.',
        schema: { properties: { statusCode: { type: 'integer', example: 403 }, message: { type: 'string', example: 'Upgrade your membership to interact with premium posts.' } } },
    })
    @ApiResponse({ status: 404, description: 'Post not found.' })
    @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
    @Post(':postId/like')
    @HttpCode(HttpStatus.OK)
    async toggleLike(
        @Request() req,
        @Param('postId', ParseUUIDPipe) postId: string,
    ) {
        return this.feedService.toggleLike(req.user, postId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  COMMENTS — list
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Get comments for a post',
        description:
            'Returns top-level comments with their immediate replies pre-loaded (one level deep). ' +
            'Comments are paginated in reverse-chronological order.\n\n' +
            'Free-tier members are blocked from viewing comments on premium posts — ' +
            'they receive a `403` with an upgrade prompt.',
    })
    @ApiParam({
        name: 'postId',
        format: 'uuid',
        description: 'UUID of the post whose comments to fetch',
        example: 'c3d4e5f6-0001-4000-a000-000000000001',
    })
    @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Page number (1-based)' })
    @ApiQuery({ name: 'limit', type: Number, required: false, example: 20, description: 'Comments per page (1–100)' })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of top-level comments with nested replies.',
        type: CommentsResponseSchema,
    })
    @ApiResponse({
        status: 403,
        description: 'Free-tier member attempted to read comments on a premium post.',
        schema: { properties: { statusCode: { type: 'integer', example: 403 }, message: { type: 'string', example: 'Upgrade your membership to read comments on premium posts.' } } },
    })
    @ApiResponse({ status: 404, description: 'Post not found or unpublished.' })
    @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
    @Get(':postId/comments')
    async getComments(
        @Request() req,
        @Param('postId', ParseUUIDPipe) postId: string,
        @Query() query: GetCommentsQueryDto,
    ) {
        return this.feedService.getComments(req.user, postId, query);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  COMMENTS — add
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Add a comment or reply to a post',
        description:
            'Add a top-level comment by omitting `parentId`. ' +
            'To reply to an existing comment, provide `parentId` (UUID of the comment to reply to). ' +
            '**Only one level of nesting is supported** — attempting to reply to a reply returns a `400`.',
    })
    @ApiParam({
        name: 'postId',
        format: 'uuid',
        description: 'UUID of the post to comment on',
        example: 'c3d4e5f6-0001-4000-a000-000000000001',
    })
    @ApiBody({ type: AddCommentDto })
    @ApiResponse({
        status: 201,
        description: 'Comment added successfully.',
        type: CreateCommentResponseSchema,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid `parentId` or attempted reply-to-reply (deeper than one level).',
        schema: {
            properties: {
                statusCode: { type: 'integer', example: 400 },
                message: { type: 'string', example: 'Only one level of comment replies is supported.' },
            },
        },
    })
    @ApiResponse({
        status: 403,
        description: 'Free-tier member attempted to comment on a premium post.',
        schema: { properties: { statusCode: { type: 'integer', example: 403 }, message: { type: 'string', example: 'Upgrade your membership to comment on premium posts.' } } },
    })
    @ApiResponse({ status: 404, description: 'Post not found.' })
    @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
    @Post(':postId/comments')
    @HttpCode(HttpStatus.CREATED)
    async addComment(
        @Request() req,
        @Param('postId', ParseUUIDPipe) postId: string,
        @Body() dto: AddCommentDto,
    ) {
        return this.feedService.addComment(req.user, postId, dto);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  COMMENTS — delete
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Delete a comment',
        description:
            'Soft-deletes the comment. Authorised callers:\n' +
            '- The **comment author**\n' +
            '- The **post author** (housekeeping on their own post)\n' +
            '- **Org moderators and above**\n\n' +
            'Deleted comments are hidden but their existence is preserved for reply thread integrity.',
    })
    @ApiParam({
        name: 'commentId',
        format: 'uuid',
        description: 'UUID of the comment to delete',
        example: 'r1s2t3u4-0001-4000-a000-000000000002',
    })
    @ApiResponse({ status: 200, description: 'Comment removed.', type: FeedMessageResponseSchema })
    @ApiResponse({
        status: 403,
        description: 'Not the comment author, post owner, or a moderator.',
        schema: { properties: { statusCode: { type: 'integer', example: 403 }, message: { type: 'string', example: 'You are not authorised to delete this comment.' } } },
    })
    @ApiResponse({ status: 404, description: 'Comment not found.' })
    @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
    @Delete('comment/:commentId')
    @HttpCode(HttpStatus.OK)
    async deleteComment(
        @Request() req,
        @Param('commentId', ParseUUIDPipe) commentId: string,
    ) {
        return this.feedService.deleteComment(req.user, commentId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  UPVOTES
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Toggle upvote on a post',
        description: 'Toggles a standard upvote. Users cannot upvote their own posts.',
    })
    @ApiParam({ name: 'postId', format: 'uuid' })
    @Post(':postId/upvote')
    @HttpCode(HttpStatus.OK)
    async toggleUpvote(
        @Request() req,
        @Param('postId', ParseUUIDPipe) postId: string,
    ) {
        return this.feedService.toggleUpvote(req.user, postId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  BOOKMARKS
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Toggle bookmark on a post',
        description: 'Saves the post to the user\'s private bookmarks list.',
    })
    @ApiParam({ name: 'postId', format: 'uuid' })
    @Post(':postId/bookmark')
    @HttpCode(HttpStatus.OK)
    async toggleBookmark(
        @Request() req,
        @Param('postId', ParseUUIDPipe) postId: string,
    ) {
        return this.feedService.toggleBookmark(req.user, postId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  REPORTING
    // ═══════════════════════════════════════════════════════════════════════════

    @ApiOperation({
        summary: 'Report a post for review',
        description: 'Flags a post for administrator review due to community guideline violations.',
    })
    @ApiParam({ name: 'postId', format: 'uuid' })
    @ApiBody({ type: ReportPostDto })
    @Post(':postId/report')
    @HttpCode(HttpStatus.CREATED)
    async reportPost(
        @Request() req,
        @Param('postId', ParseUUIDPipe) postId: string,
        @Body() dto: ReportPostDto,
    ) {
        return this.feedService.reportPost(req.user, postId, dto);
    }
}
