import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../iam/enums/roles.enum';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @ApiOperation({ summary: 'Get dashboard overview statistics' })
    @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully.' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN, SystemRole.REGIONAL_ADMIN)
    @Get('overview')
    async getOverview() {
        return this.dashboardService.getDashboardOverview();
    }
}
