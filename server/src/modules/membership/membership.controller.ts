import { Controller, Get, Query, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MembershipService } from './membership.service';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole, CommunityTier } from '../iam/enums/roles.enum';

@ApiTags('Admin Membership Center')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('membership-center')
export class MembershipController {
    constructor(private readonly membershipService: MembershipService) { }

    // --- Membership Tiers Endpoints ---

    @ApiOperation({ summary: 'Get all membership tiers' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Get('tiers')
    async getTiers() {
        return this.membershipService.getTiers();
    }

    @ApiOperation({ summary: 'Update a membership tier' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Patch('tiers/:id')
    async updateTier(@Param('id') id: string, @Body() dto: any) {
        return this.membershipService.updateTier(id, dto);
    }

    @ApiOperation({ summary: 'Create a membership tier' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Post('tiers')
    async createTier(@Body() dto: any) {
        return this.membershipService.createTier(dto);
    }

    @ApiOperation({ summary: 'Delete a membership tier' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Delete('tiers/:id')
    async removeTier(@Param('id') id: string) {
        return this.membershipService.removeTier(id);
    }

    // --- Discounts Endpoints ---

    @ApiOperation({ summary: 'Get all discounts' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Get('discounts')
    async getDiscounts() {
        return this.membershipService.getDiscounts();
    }

    @ApiOperation({ summary: 'Create a new discount/promo' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Post('discounts')
    async createDiscount(@Body() dto: any) {
        return this.membershipService.createDiscount(dto);
    }

    @ApiOperation({ summary: 'Update a discount' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Patch('discounts/:id')
    async updateDiscount(@Param('id') id: string, @Body() dto: any) {
        return this.membershipService.updateDiscount(id, dto);
    }

    @ApiOperation({ summary: 'Delete a discount' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Delete('discounts/:id')
    async removeDiscount(@Param('id') id: string) {
        return this.membershipService.removeDiscount(id);
    }

    // --- Subscribed Members Endpoints ---

    @ApiOperation({ summary: 'Get a filtered list of subscribed members' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Get('subscribers')
    async getSubscribedMembers(
        @Query('chapterId') chapterId?: string,
        @Query('tier') tier?: CommunityTier,
        @Query('billingCycle') billingCycle?: 'MONTHLY' | 'YEARLY',
        @Query('search') search?: string,
        @Query('role') role?: 'COMMUNITY_MEMBER' | 'STAFF',
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        const filters = { chapterId, tier, billingCycle, search, role, page: Number(page), limit: Number(limit) };
        return this.membershipService.getSubscribedMembers(filters);
    }

    @ApiOperation({ summary: 'Get membership growth analytics' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Get('analytics')
    async getAnalytics() {
        return this.membershipService.getMembershipAnalytics();
    }

    @ApiOperation({ summary: 'Get all chapters for filtering' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Get('chapters')
    async getChapters() {
        return this.membershipService.getChapters();
    }

    @ApiOperation({ summary: 'Bulk archive members' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Post('bulk-archive')
    async bulkArchive(@Body() body: { memberIds: string[] }) {
        return this.membershipService.bulkArchive(body.memberIds);
    }

    @ApiOperation({ summary: 'Bulk reassign members to a tier' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Post('bulk-reassign')
    async bulkReassign(@Body() body: { memberIds: string[], targetTier?: string }) {
        return this.membershipService.bulkReassign(body.memberIds, body.targetTier);
    }
}
