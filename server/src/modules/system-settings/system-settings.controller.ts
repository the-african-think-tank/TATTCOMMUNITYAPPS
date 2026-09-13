import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, NotFoundException } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SystemRole } from '../iam/enums/roles.enum';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemSettingsController {
    constructor(private readonly settingsService: SystemSettingsService) { }

    @Public()
    @Get('public')
    async getPublicConfig(): Promise<{
        showBetaNotice: boolean;
        betaBannerMessage: string;
        betaVersionTag: string;
    }> {
        const showNotice = await this.settingsService.getRawValue('SHOW_BETA_NOTICE');
        const bannerMessage = await this.settingsService.getRawValue('BETA_BANNER_MESSAGE');
        const versionTag = await this.settingsService.getRawValue('BETA_VERSION_TAG');

        return {
            showBetaNotice: showNotice !== 'false',
            betaBannerMessage: bannerMessage || 'Welcome to TATT Community Apps Beta. You are exploring early access.',
            betaVersionTag: versionTag || 'v0.9.0-beta',
        };
    }

    @Get('telemetry')
    @Roles(SystemRole.SUPERADMIN, SystemRole.ADMIN)
    async getTelemetry(): Promise<{ totalEmailsSent: number; serverTime: string; status: string; error?: string }> {
        try {
            const totalEmails = await this.settingsService.getRawValue('TOTAL_EMAILS_SENT');
            return {
                totalEmailsSent: parseInt(totalEmails || '0', 10),
                serverTime: new Date().toISOString(),
                status: 'OPERATIONAL'
            };
        } catch (error) {
            return {
                totalEmailsSent: 0,
                serverTime: new Date().toISOString(),
                status: 'DEGRADED',
                error: (error as Error).message
            };
        }
    }

    @Get()
    @Roles(SystemRole.SUPERADMIN, SystemRole.ADMIN)
    async findAll() {
        return this.settingsService.findAll();
    }

    @Put(':key')
    @Roles(SystemRole.SUPERADMIN, SystemRole.ADMIN)
    async update(
        @Param('key') key: string,
        @Body() body: { value: string; category?: string; description?: string, isSecret?: boolean },
    ) {
        return this.settingsService.update(key, body.value, body.category || 'GENERAL', body.description, body.isSecret);
    }
    
    @Delete(':key')
    @Roles(SystemRole.SUPERADMIN)
    async remove(@Param('key') key: string) {
        return this.settingsService.remove(key);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Post('test-smtp')
    @Roles(SystemRole.SUPERADMIN)
    async testSmtp(@Body('email') email: string) {
        return this.settingsService.testSmtpConnection(email);
    }
}
