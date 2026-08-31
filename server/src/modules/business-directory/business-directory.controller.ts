import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BusinessDirectoryService } from './business-directory.service';
import { CreateBusinessApplicationDto, UpdateBusinessStatusDto } from './dto/business-directory.dto';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SystemRole } from '../iam/enums/roles.enum';

@ApiTags('Business Directory & Partnerships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('business-directory')
export class BusinessDirectoryController {
    private readonly logger = new Logger(BusinessDirectoryController.name);

    constructor(private readonly businessDirectoryService: BusinessDirectoryService) {
        this.logger.log('BusinessDirectoryController initialized and registered to /business-directory');
    }
    
    @Public()
    @Get('ping-status')
    ping() {
        return { status: 'ok', server: 'BusinessDirectory' };
    }

    @Get('profile-managed')
    @Roles(SystemRole.COMMUNITY_MEMBER, SystemRole.ADMIN, SystemRole.SUPERADMIN, SystemRole.MODERATOR)
    @ApiOperation({ summary: 'Get the authenticated user\'s own business profile' })
    async getMyProfile(@Request() req: any) {
        this.logger.log(`[Diagnostic] getMyProfile called for userId: ${req.user.id}`);
        return this.businessDirectoryService.getMyBusiness(req.user.id);
    }

    @Post('profile-managed')
    @Roles(SystemRole.COMMUNITY_MEMBER, SystemRole.ADMIN, SystemRole.SUPERADMIN, SystemRole.MODERATOR)
    @ApiOperation({ summary: 'Create or update the authenticated user\'s own business profile (auto-approves if Kiongozi)' })
    async upsertMyProfile(@Body() dto: CreateBusinessApplicationDto, @Request() req: any) {
        return this.businessDirectoryService.upsertMyBusiness(req.user.id, dto, req.user.communityTier);
    }

    @Public()
    @Post('apply')
    @ApiOperation({ summary: 'Submit a business application for the TATT directory (Public Intake)' })
    async apply(@Body() dto: CreateBusinessApplicationDto, @Request() req: any) {
        const userId = req.user?.id;
        this.logger.log(`Public intake application submitted. Identified user: ${userId || 'guest'}`);
        return this.businessDirectoryService.apply(dto, userId);
    }

    @Get('all')
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN, SystemRole.MODERATOR)
    @ApiOperation({ summary: 'List all business partners for management (moderators and admins only)' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'chapterId', required: false })
    async findAllForAdmin(
        @Query('status') status?: string,
        @Query('category') category?: string,
        @Query('chapterId') chapterId?: string,
    ) {
        return this.businessDirectoryService.findAll(status, category, chapterId, true);
    }

    @Get('list')
    @Roles(SystemRole.COMMUNITY_MEMBER, SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @ApiOperation({ summary: 'List approved business partners in the public directory' })
    @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'chapterId', required: false })
    async findAllForMembers(
        @Query('category') category?: string,
        @Query('chapterId') chapterId?: string,
    ) {
        return this.businessDirectoryService.findAll('APPROVED', category, chapterId);
    }

    @Get('stats')
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN, SystemRole.MODERATOR)
    @ApiOperation({ summary: 'Get business directory stats for the dashboard' })
    async getStats() {
        return this.businessDirectoryService.getStats();
    }

    @Get(':id')
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN, SystemRole.MODERATOR, SystemRole.COMMUNITY_MEMBER)
    @ApiOperation({ summary: 'Get business details' })
    async findOne(@Param('id') id: string) {
        return this.businessDirectoryService.findOne(id);
    }

    @Patch(':id/status')
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN, SystemRole.MODERATOR)
    @ApiOperation({ summary: 'Update application status (Approve / Decline)' })
    async updateStatus(@Param('id') id: string, @Body() dto: UpdateBusinessStatusDto) {
        this.logger.log(`Updating status for ${id} to ${dto.status} by moderator/admin`);
        return this.businessDirectoryService.updateStatus(id, dto);
    }

    @Post(':id/click')
    @Roles(SystemRole.COMMUNITY_MEMBER, SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @ApiOperation({ summary: 'Track a click/redemption for a business perk' })
    async trackClick(@Param('id') id: string) {
        return this.businessDirectoryService.trackClick(id);
    }


}
