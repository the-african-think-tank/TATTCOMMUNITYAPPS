import { Controller, Get, Post, Query, UseGuards, Param, Patch, Body, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UpdateUserDto, CreateUserWithPasswordDto } from './dto/users.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SystemRole } from '../enums/roles.enum';

@ApiTags('Users Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @ApiOperation({ summary: 'Get organization member statistics' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Get('stats')
    async getStats() {
        return this.usersService.getStats();
    }

    @ApiOperation({ summary: 'List all organization members' })
    @ApiQuery({ name: 'search', required: false, description: 'Search query for first name, last name, or email' })
    @ApiQuery({ name: 'role', required: false, enum: SystemRole, description: 'Filter by specific SystemRole' })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
    @ApiQuery({ name: 'chapterId', required: false, description: 'Filter by regional chapter UUID' })
    @ApiResponse({ status: 200, description: 'Organization members retrieved.' })
    @Roles(
        SystemRole.ADMIN, 
        SystemRole.SUPERADMIN,
        SystemRole.REGIONAL_ADMIN,
        SystemRole.MODERATOR,
        SystemRole.CONTENT_ADMIN,
        SystemRole.SALES,
        SystemRole.VOLUNTEER_ADMIN
    )
    @Get('org-members')
    async findAllOrgMembers(
        @Query('search') search?: string,
        @Query('role') role?: string,
        @Query('isActive') isActive?: string,
        @Query('chapterId') chapterId?: string,
    ) {
        return this.usersService.findAllOrgMembers({
            search,
            role,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            chapterId,
        });
    }

    @ApiOperation({ summary: 'Get user details' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @ApiOperation({ summary: 'Update user (e.g. role, flags, chapter)' })
    @ApiResponse({ status: 200, description: 'User updated successfully.' })
    @Roles(SystemRole.ADMIN, SystemRole.SUPERADMIN)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateData: UpdateUserDto) {
        return this.usersService.update(id, updateData);
    }

    @ApiOperation({ summary: 'Delete user' })
    @ApiResponse({ status: 200, description: 'User deleted successfully.' })
    @Roles(SystemRole.SUPERADMIN)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    @ApiOperation({ summary: 'Create user with auto-generated credentials (SUPERADMIN only)' })
    @ApiResponse({ status: 201, description: 'User created successfully with generated credentials.' })
    @Roles(SystemRole.SUPERADMIN)
    @Post('create-with-password')
    async createWithPassword(@Body() dto: CreateUserWithPasswordDto) {
        return this.usersService.createWithPassword(dto);
    }
}
