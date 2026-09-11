import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';
import { JobsService } from './jobs.service';
import { ApplyJobDto, CreateJobDto, FlagJobDto } from './dto/jobs.dto';

@ApiTags('Jobs / Opportunities')
@Controller('jobs')
export class JobsController {
    constructor(private readonly jobsService: JobsService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List active job opportunities' })
    @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'type', required: false })
    @ApiQuery({ name: 'location', required: false })
    @ApiQuery({ name: 'datePosted', required: false, description: 'all, 24h, 7d, 30d' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getListings(
        @Query('category') category?: string,
        @Query('type') type?: string,
        @Query('location') location?: string,
        @Query('datePosted') datePosted?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.jobsService.getListings({
            category, type, location, datePosted, search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        });
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Kiongozi members only: Create a new job listing' })
    async create(@Body() dto: CreateJobDto, @Request() req: any) {
        if (req.user.communityTier !== 'KIONGOZI') {
            throw new BadRequestException('Job posting is only available for Kiongozi members.');
        }
        return this.jobsService.createMemberListing(req.user.id, dto);
    }

    @Get('insights')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Market insights for sidebar' })
    async getInsights() {
        return this.jobsService.getMarketInsights();
    }

    @Get('saved')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get saved job listings' })
    async getSaved(@Request() req: any) {
        return this.jobsService.getSavedListings(req.user.id);
    }

    @Get('saved-ids')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get saved job IDs only' })
    async getSavedIds(@Request() req: any) {
        return this.jobsService.getSavedJobIds(req.user.id);
    }

    @Get('applied-ids')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get applied job IDs only' })
    async getAppliedIds(@Request() req: any) {
        return this.jobsService.getAppliedJobIds(req.user.id);
    }

    @Get('alerts')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user job alerts' })
    async getAlerts(@Request() req: any) {
        return this.jobsService.getJobAlerts(req.user.id);
    }

    @Post('alerts')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create new job alert' })
    async createAlert(@Body() dto: { keyword: string; category?: string }, @Request() req: any) {
        return this.jobsService.createJobAlert(req.user.id, dto);
    }

    @Delete('alerts/:alertId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a job alert' })
    async deleteAlert(@Param('alertId') alertId: string, @Request() req: any) {
        return this.jobsService.deleteJobAlert(req.user.id, alertId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get a single job by ID' })
    async getOne(@Param('id') id: string) {
        return this.jobsService.getListingById(id);
    }

    @Post(':id/apply')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Submit job application' })
    async apply(@Param('id') id: string, @Body() dto: ApplyJobDto, @Request() req: any) {
        return this.jobsService.apply(req.user.id, id, dto);
    }

    @Post(':id/save')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Toggle save job' })
    async toggleSave(@Param('id') id: string, @Request() req: any) {
        return this.jobsService.toggleSaved(req.user.id, id);
    }

    @Delete(':id/save')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Remove job from saved' })
    async unsave(@Param('id') id: string, @Request() req: any) {
        await this.jobsService.toggleSaved(req.user.id, id);
        return { message: 'Removed from saved roles.' };
    }

    @Post('sources/submit')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Community: submit an employer Greenhouse career link' })
    async submitSource(@Body('url') url: string, @Request() req: any) {
        return this.jobsService.submitCommunitySource(url, req.user.id);
    }
}

// ── ADMIN CONTROLLER ──────────────────────────────────────────────────────────

@ApiTags('Admin — Jobs Center')
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminJobsController {
    constructor(private readonly jobsService: JobsService) {}

    @Get('stats')
    @ApiOperation({ summary: 'Jobs dashboard stats' })
    async getStats() {
        return this.jobsService.getAdminStats();
    }

    @Get()
    @ApiOperation({ summary: 'List all job listings (admin view with filters)' })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'type', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getAll(
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.jobsService.getAdminListings({
            search, status, type,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }

    @Post()
    @ApiOperation({ summary: 'Admin: create a new job listing' })
    async create(@Body() dto: CreateJobDto) {
        return this.jobsService.adminCreateListing(dto);
    }

    @Patch(':id/flag')
    @ApiOperation({ summary: 'Admin: flag a listing and notify the poster' })
    async flag(@Param('id') id: string, @Body() dto: FlagJobDto) {
        return this.jobsService.adminFlagListing(id, dto.reason);
    }

    @Patch(':id/unlist')
    @ApiOperation({ summary: 'Admin: unlist a job and notify the poster' })
    async unlist(@Param('id') id: string, @Body() dto: FlagJobDto) {
        return this.jobsService.adminUnlistListing(id, dto.reason);
    }

    @Patch(':id/restore')
    @ApiOperation({ summary: 'Admin: restore a flagged/unlisted job' })
    async restore(@Param('id') id: string) {
        return this.jobsService.adminRestoreListing(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Admin: permanently delete a job listing' })
    async deleteListing(@Param('id') id: string) {
        return this.jobsService.adminDeleteListing(id);
    }

    @Get('applications')
    @ApiOperation({ summary: 'Admin: list all job applications' })
    @ApiQuery({ name: 'jobId', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getApplications(
        @Query('jobId') jobId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.jobsService.getAdminApplications({
            jobId,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }

    @Get('applications/:id')
    @ApiOperation({ summary: 'Admin: get single application detail' })
    async getApplicationDetail(@Param('id') id: string) {
        return this.jobsService.getApplicationById(id);
    }

    // ─── HARVEST & INGESTION MANAGEMENT ──────────────────────────────────────
    @Post('ingest')
    @ApiOperation({ summary: 'Admin: trigger on-demand job harvest' })
    @ApiQuery({ name: 'company', required: false, description: 'Optional specific company board token' })
    async triggerIngest(@Query('company') company?: string) {
        return this.jobsService.triggerHarvest(company);
    }

    @Get('sources')
    @ApiOperation({ summary: 'Admin: list configured harvest company sources' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getSources(@Query('page') page?: string, @Query('limit') limit?: string) {
        return this.jobsService.getCompanySources(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 50
        );
    }

    @Post('sources')
    @ApiOperation({ summary: 'Admin: add a new company harvest source' })
    async addSource(
        @Body() body: { companyName: string; boardToken: string; websiteUrl?: string },
        @Request() req: any
    ) {
        return this.jobsService.addCompanySource({
            ...body,
            submittedById: req.user.id,
        });
    }

    @Patch('sources/:id/toggle')
    @ApiOperation({ summary: 'Admin: toggle company source active status' })
    async toggleSource(@Param('id') id: string) {
        return this.jobsService.toggleCompanySource(id);
    }

    @Delete('sources/:id')
    @ApiOperation({ summary: 'Admin: delete a company source' })
    async deleteSource(@Param('id') id: string) {
        return this.jobsService.deleteCompanySource(id);
    }
}
