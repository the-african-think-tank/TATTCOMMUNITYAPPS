import {
    Controller, Post, Get, Patch, Delete, Param, Body, Query,
    UseGuards, Request, HttpCode, HttpStatus, ParseIntPipe, DefaultValuePipe, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiExtraModels, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto, UpdateChapterDto } from './dto/chapters.dto';
import { ChapterSchema } from './dto/chapters.schemas';
import { CreateChapterActivityDto, UpdateChapterActivityDto } from './dto/chapter-activity.dto';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../iam/enums/roles.enum';

@ApiTags('Chapters')
@ApiExtraModels(ChapterSchema)
@Controller('chapters')
export class ChaptersController {
    private readonly logger = new Logger(ChaptersController.name);
    constructor(private readonly chaptersService: ChaptersService) { }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all chapter activities across all regions (Admin only)' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN, SystemRole.REGIONAL_ADMIN)
    @Get('all-activities')
    async getAllActivities(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.chaptersService.getAllActivities(page, limit);
    }

    @ApiOperation({ summary: 'Get all chapters' })
    @ApiResponse({ status: 200, description: 'List of chapters.', type: [ChapterSchema] })
    @Get()
    @HttpCode(HttpStatus.OK)
    async findAll() {
        return this.chaptersService.getAllChapters();
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get chapter members' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @ApiQuery({ name: 'excludeSelf', required: false, type: Boolean })
    @UseGuards(JwtAuthGuard)
    @Get(':id/members')
    async getMembers(
        @Param('id') id: string,
        @Request() req,
        @Query('excludeSelf') excludeSelf?: string,
    ) {
        return this.chaptersService.getChapterMembers(id, req.user?.id, excludeSelf === 'true');
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get chapter volunteers (Admin only)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN, SystemRole.REGIONAL_ADMIN)
    @Get(':id/volunteers')
    async getVolunteers(@Param('id') id: string) {
        this.logger.log(`Fetching volunteers for chapter: ${id}`);
        try {
            const result = await this.chaptersService.getChapterVolunteers(id);
            this.logger.log(`Successfully fetched volunteers for ${id}`);
            return result;
        } catch (error) {
            this.logger.error(`Error fetching volunteers for ${id}:`, error);
            throw error;
        }
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get chapter activities (news/events/announcements)' })
    @ApiParam({ name: 'id', format: 'uuid', description: 'Chapter UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @UseGuards(JwtAuthGuard)
    @Get(':id/activities')
    async getActivities(
        @Param('id') id: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('visibility') visibility?: string,
    ) {
        return this.chaptersService.getChapterActivities(id, page, limit, visibility);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get chapter member posts feed' })
    @ApiParam({ name: 'id', format: 'uuid', description: 'Chapter UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'excludeSelf', required: false, type: Boolean })
    @UseGuards(JwtAuthGuard)
    @Get(':id/feed')
    async getChapterFeed(
        @Param('id') id: string,
        @Request() req,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('excludeSelf') excludeSelf?: string,
    ) {
        return this.chaptersService.getChapterFeed(id, req.user, page, limit, excludeSelf === 'true');
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get chapter by ID' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.chaptersService.getChapterById(id);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a chapter (Admin only)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateChapterDto: UpdateChapterDto) {
        return this.chaptersService.updateChapter(id, updateChapterDto);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a chapter (Superadmin only)' })
    @ApiParam({ name: 'id', format: 'uuid' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(SystemRole.SUPERADMIN)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.chaptersService.deleteChapter(id);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new chapter (Admin only)' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createChapterDto: CreateChapterDto) {
        return this.chaptersService.createChapter(createChapterDto);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update regional manager for a chapter (Admin only)' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Patch(':id/manager')
    async updateManager(@Param('id') id: string, @Body('managerId') managerId: string) {
        return this.chaptersService.updateChapterManager(id, managerId);
    }

    // ── CHAPTER ACTIVITIES ──────────────────────────────────────────────────────


    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a chapter activity (Admin only)' })
    @ApiParam({ name: 'id', format: 'uuid', description: 'Chapter UUID' })
    @UseGuards(JwtAuthGuard)
    @Post(':id/activities')
    @HttpCode(HttpStatus.CREATED)
    async createActivity(
        @Param('id') id: string,
        @Body() dto: CreateChapterActivityDto,
        @Request() req,
    ) {
        return this.chaptersService.createChapterActivity(id, req.user, dto);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a chapter activity (Admin only)' })
    @UseGuards(JwtAuthGuard)
    @Patch(':id/activities/:activityId')
    async updateActivity(
        @Param('activityId') activityId: string,
        @Body() dto: UpdateChapterActivityDto,
        @Request() req,
    ) {
        return this.chaptersService.updateChapterActivity(activityId, req.user, dto);
    }

    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a chapter activity (Admin only)' })
    @UseGuards(JwtAuthGuard)
    @Delete(':id/activities/:activityId')
    async deleteActivity(@Param('activityId') activityId: string, @Request() req) {
        return this.chaptersService.deleteChapterActivity(activityId, req.user);
    }


    // ── CHAPTER MEMBER FEED (posts by members of this chapter) ──────────────────

}
