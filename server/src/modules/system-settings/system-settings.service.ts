import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SystemSetting } from './entities/system-setting.entity';
import * as crypto from 'crypto';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SystemSettingsService {
    private readonly logger = new Logger(SystemSettingsService.name);
    private readonly algorithm = 'aes-256-gcm';
    private readonly secretKey: Buffer;
    private readonly ivLength = 12;

    constructor(
        @InjectModel(SystemSetting) private settingRepo: typeof SystemSetting,
    ) {
        if (!process.env.APP_SECRET) {
            throw new Error('APP_SECRET environment variable is not defined.');
        }
        this.secretKey = crypto.scryptSync(process.env.APP_SECRET, 'salt', 32);
    }

    private encrypt(text: string): string {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }

    private decrypt(encryptedText: string): string {
        try {
            const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (e) {
            this.logger.error(`Failed to decrypt setting value. Returning raw.`);
            return encryptedText;
        }
    }

    async findAll() {
        const settings = await this.settingRepo.findAll();
        return settings.map(s => {
            const val = s.isSecret ? '••••••••' : s.value; // Mask secrets for list
            return { ...s.toJSON(), value: val };
        });
    }

    async findByKey(key: string, decryptSecret: boolean = false) {
        const setting = await this.settingRepo.findOne({ where: { key } });
        if (!setting) return null;

        if (setting.isSecret && decryptSecret) {
            return { ...setting.toJSON(), value: this.decrypt(setting.value) };
        }
        return setting.toJSON();
    }

    async getRawValue(key: string): Promise<string | null> {
        const setting = await this.settingRepo.findOne({ where: { key } });
        if (!setting || !setting.value) return process.env[key] || null;

        let val = setting.value;
        if (setting.isSecret) {
            val = this.decrypt(setting.value);
        }

        const isPlaceholder = !val || val.includes('placeholder') || val.includes('your_') || val.includes('*****') || val.includes('dummy');
        if (isPlaceholder && process.env[key]) {
            return process.env[key] || null;
        }

        return val || process.env[key] || null;
    }

    async update(key: string, value: string, category: string = 'GENERAL', description?: string, isSecret: boolean = false) {
        let setting = await this.settingRepo.findOne({ where: { key } });
        
        let finalValue = value;
        if (isSecret) {
            finalValue = this.encrypt(value);
        }

        if (setting) {
            await setting.update({ value: finalValue, category, description, isSecret });
        } else {
            setting = await this.settingRepo.create({ key, value: finalValue, category, description, isSecret });
        }
        return setting;
    }

    async remove(key: string) {
        const setting = await this.settingRepo.findOne({ where: { key } });
        if (!setting) throw new NotFoundException('Setting not found');
        return setting.destroy();
    }

    async getStripeInstance(): Promise<Stripe> {
        const secretKey = await this.getRawValue('STRIPE_SECRET_KEY');
        if (!secretKey) {
            this.logger.warn('STRIPE_SECRET_KEY not found in settings or env. Billing may fail.');
        }
        return new Stripe(secretKey || 'sk_test_placeholder', {
            timeout: 8000,
            maxNetworkRetries: 1,
            apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
        });
    }

    async getStripeWebhookSecret(): Promise<string> {
        return (await this.getRawValue('STRIPE_WEBHOOK_SECRET')) || 'whsec_placeholder';
    }

    async testSmtpConnection(testEmail: string): Promise<{ success: boolean; message: string }> {
        try {
            const host = await this.getRawValue('MAIL_HOST');
            const port = parseInt(await this.getRawValue('MAIL_PORT') || '587', 10);
            const user = await this.getRawValue('MAIL_USER');
            const pass = await this.getRawValue('MAIL_PASS');
            const from = await this.getRawValue('MAIL_FROM') || 'no-reply@tatt.org';

            const mailSecure = (await this.getRawValue('MAIL_SECURE')) === 'true';
            const mailRequireTLS = (await this.getRawValue('MAIL_REQUIRE_TLS')) === 'true';
            const mailRejectUnauthorized = (await this.getRawValue('MAIL_REJECT_UNAUTHORIZED')) === 'true';
            const mailTLSMinVersion = (await this.getRawValue('MAIL_TLS_MIN_VERSION')) || 'TLSv1.2';

            const transporter = nodemailer.createTransport({
                host,
                port,
                secure: mailSecure,
                requireTLS: mailRequireTLS,
                auth: { user, pass },
                tls: {
                    rejectUnauthorized: mailRejectUnauthorized,
                    minVersion: mailTLSMinVersion as any, // This one is specialized type in nodemailer
                },
            });

            await transporter.verify();

            await transporter.sendMail({
                from,
                envelope: {
                    from: user, // Use the authenticated user for the envelope
                    to: [testEmail],
                },
                to: testEmail,
                subject: 'TATT SMTP Configuration Test',
                text: 'This is a test email from your TATT platform configuration page. If you are reading this, your SMTP settings are correct.',
                html: '<h3>TATT SMTP Test Success</h3><p>Your platform configuration for outgoing mail is valid and functional.</p>'
            });

            return { success: true, message: 'SMTP connection verified and test email sent.' };
        } catch (error) {
            const err = error as Error;
            this.logger.error(`SMTP Test Failed: ${err.message}`);
            return { success: false, message: err.message };
        }
    }
}
