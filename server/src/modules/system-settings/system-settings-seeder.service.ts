import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { SystemSetting } from './entities/system-setting.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SystemSettingsSeeder implements OnModuleInit {
    private readonly logger = new Logger(SystemSettingsSeeder.name);

    constructor(
        private settingsService: SystemSettingsService,
        private configService: ConfigService,
    ) {}

    async onModuleInit() {
        if (this.configService.get('NODE_ENV') === 'production') {
            this.logger.log('Production environment detected. Skipping System Settings synchronization.');
            return;
        }
        this.logger.log('Synchronizing system configurations...');

        const initialSettings = [
            // GENERAL
            { key: 'APP_NAME', value: 'The African Think Tank', category: 'GENERAL', description: 'Global platform name.' },
            { key: 'FRONTEND_URL', value: 'http://localhost:3000', category: 'GENERAL', description: 'Public facing platform URL.' },
            { key: 'SHOW_BETA_NOTICE', value: 'true', category: 'GENERAL', description: 'Toggle visibility of the global Beta Testing banner and footer indicators.' },
            { key: 'BETA_BANNER_MESSAGE', value: 'Welcome to TATT Community Apps Beta. You are exploring early access.', category: 'GENERAL', description: 'Announcement text shown in the top beta banner.' },
            { key: 'BETA_VERSION_TAG', value: 'v0.9.0-beta', category: 'GENERAL', description: 'Version label displayed in footers.' },
            
            // SMTP
            { key: 'MAIL_HOST', value: process.env.MAIL_HOST || 'smtp.gmail.com', category: 'SMTP', description: 'Outgoing mail server host.' },
            { key: 'MAIL_PORT', value: process.env.MAIL_PORT || '587', category: 'SMTP', description: 'SMTP server port.' },
            { key: 'MAIL_USER', value: process.env.MAIL_USER || '', category: 'SMTP', description: 'System email account username.' },
            { key: 'MAIL_PASS', value: process.env.MAIL_PASS || '', category: 'SMTP', isSecret: true, description: 'SMTP password.' },
            { key: 'MAIL_FROM', value: process.env.MAIL_FROM || 'no-reply@tatt.org', category: 'SMTP', description: 'Sender address for transactional emails.' },
            { key: 'MAIL_SECURE', value: process.env.MAIL_SECURE || 'false', category: 'SMTP', description: 'Whether to use implicit SSL/TLS (true for port 465, false for 587).' },
            { key: 'MAIL_REQUIRE_TLS', value: 'false', category: 'SMTP', description: 'Whether to reject connections without STARTTLS support.' },
            { key: 'MAIL_REJECT_UNAUTHORIZED', value: 'false', category: 'SMTP', description: 'Whether to reject self-signed certificates.' },
            { key: 'MAIL_TLS_MIN_VERSION', value: 'TLSv1.2', category: 'SMTP', description: 'Minimum TLS version for SMTP handshake.' },

            // PAYMENT
            { key: 'STRIPE_PUBLIC_KEY', value: process.env.STRIPE_PUBLIC_KEY || '', category: 'PAYMENT', description: 'Stripe JS publishable key.' },
            { key: 'STRIPE_SECRET_KEY', value: process.env.STRIPE_SECRET_KEY || '', category: 'PAYMENT', isSecret: true, description: 'Stripe API secret key.' },
            { key: 'STRIPE_WEBHOOK_SECRET', value: process.env.STRIPE_WEBHOOK_SECRET || '', category: 'PAYMENT', isSecret: true, description: 'Webhooks signature verification secret.' },

            // SECURITY
            { key: 'PWD_MIN_LENGTH', value: '8', category: 'SECURITY', description: 'Minimum characters for org member passwords.' },
            { key: 'PWD_ROTATION_POLICY', value: 'NEVER', category: 'SECURITY', description: 'Password expiration interval (NEVER, MONTHLY, QUARTERLY, YEARLY).' },
            { key: 'PWD_PREVENT_REUSE_COUNT', value: '3', category: 'SECURITY', description: 'Number of previous passwords to prevent reuse.' },
            { key: 'REQUIRE_2FA_SUPERADMIN', value: 'false', category: 'SECURITY', description: 'Enforce two-factor authentication for Super Admins.' },
            { key: 'REQUIRE_2FA_ADMIN', value: 'false', category: 'SECURITY', description: 'Enforce two-factor authentication for standard Admins.' },
            { key: 'REQUIRE_2FA_ORG_MEMBER', value: 'false', category: 'SECURITY', description: 'Enforce two-factor authentication for Org Members.' },
        ];

        for (const s of initialSettings) {
            const existing = await this.settingsService.findByKey(s.key);
            if (!existing) {
                await this.settingsService.update(s.key, s.value, s.category, s.description, s.isSecret || false);
            }
        }

        this.logger.log('System configuration sync complete.');
    }
}
