import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import {
    ApiTags, ApiOperation, ApiBearerAuth,
} from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../iam/enums/roles.enum';

@ApiTags('Admin / Feed Moderation')
@ApiBearerAuth()
@Roles(SystemRole.SUPERADMIN, SystemRole.ADMIN, SystemRole.MODERATOR, SystemRole.CONTENT_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/feed')
export class FeedAdminController {
    constructor(private readonly feedService: FeedService) { }

    @ApiOperation({ summary: 'Get moderation dashboard stats' })
    @Get('stats')
    async getStats() {
        return this.feedService.getAdminStats();
    }

    @ApiOperation({ summary: 'Get pending reports queue' })
    @Get('reports')
    async getReports() {
        return this.feedService.getReportQueue();
    }

    @ApiOperation({ summary: 'Handle a post report' })
    @Patch('reports/:reportId')
    async handleReport(
        @Request() req,
        @Param('reportId') reportId: string,
        @Body() dto: { action: 'RESOLVE' | 'DISMISS'; notes?: string }
    ) {
        return this.feedService.handleReport(req.user, reportId, dto.action, dto.notes);
    }

    @ApiOperation({ summary: 'Toggle shadow ban on a post' })
    @Patch('posts/:postId/shadow-ban')
    async shadowBanPost(
        @Request() req,
        @Param('postId') postId: string,
        @Body() dto: { status: boolean }
    ) {
        return this.feedService.shadowBanPost(req.user, postId, dto.status);
    }

    @ApiOperation({ summary: 'Toggle shadow ban on a user' })
    @Patch('users/:userId/shadow-ban')
    async shadowBanUser(
        @Request() req,
        @Param('userId') userId: string,
        @Body() dto: { status: boolean }
    ) {
        return this.feedService.shadowBanUser(req.user, userId, dto.status);
    }
    
    @ApiOperation({ summary: 'Delete post as admin' })
    @Delete('posts/:postId')
    async deletePost(@Request() req, @Param('postId') postId: string) {
        return this.feedService.deletePost(req.user, postId);
    }

    // ─── Feed Curation ───────────────────────────────────────────────────────

    @ApiOperation({ summary: 'Create a new trending insight' })
    @Post('insights')
    async createInsight(@Body() dto: { title: string; content: string; startDate?: string }) {
        return this.feedService.createInsight(dto);
    }

    @ApiOperation({ summary: 'Get all trending insights' })
    @Get('insights')
    async getInsights() {
        return this.feedService.getInsights();
    }

    @ApiOperation({ summary: 'Delete an insight' })
    @Delete('insights/:id')
    async deleteInsight(@Param('id') id: string) {
        return this.feedService.deleteInsight(id);
    }

    @ApiOperation({ summary: 'Create a new community prompt' })
    @Post('prompts')
    async createPrompt(@Body() dto: { prompt: string }) {
        return this.feedService.createPrompt(dto);
    }

    @ApiOperation({ summary: 'Get all community prompts' })
    @Get('prompts')
    async getPrompts() {
        return this.feedService.getPrompts();
    }

    @ApiOperation({ summary: 'Rotate the active community prompt' })
    @Post('prompts/rotate')
    async rotatePrompt() {
        return this.feedService.rotatePrompt();
    }

    @ApiOperation({ summary: 'Create a new topic' })
    @Post('topics')
    async createTopic(@Body() dto: { name: string; description?: string }) {
        return this.feedService.createTopic(dto);
    }

    @ApiOperation({ summary: 'Archive a topic' })
    @Patch('topics/:id/archive')
    async archiveTopic(@Param('id') id: string) {
        return this.feedService.archiveTopic(id);
    }
}
