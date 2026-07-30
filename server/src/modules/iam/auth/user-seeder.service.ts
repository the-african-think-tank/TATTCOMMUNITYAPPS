import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';

import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { SystemRole, CommunityTier, AccountFlags } from '../enums/roles.enum';

@Injectable()
export class UserSeederService implements OnApplicationBootstrap {
    private readonly logger = new Logger(UserSeederService.name);

    constructor(
        @InjectModel(User) private userRepository: typeof User,
        private configService: ConfigService,
    ) { }

    async onApplicationBootstrap() {
        if (this.configService.get('NODE_ENV') === 'production') {
            this.logger.log('Production environment detected. Skipping User Seeding.');
            return;
        }
        this.logger.log('Starting User Seeding process...');
        await this.seedDefaultAdmin();
        await this.seedDefaultTestUser();
        await this.seedMembershipTestUsers();
    }

    private async seedMembershipTestUsers() {
        const tiers = [
            { 
                email: this.configService.get('TEST_USER_FREE_EMAIL', 'member-free@tatt.org'), 
                password: this.configService.get('TEST_USER_FREE_PASS', 'NewPassword123!'),
                tier: CommunityTier.FREE, 
                firstName: 'Free', 
                lastName: 'Member' 
            },
            { 
                email: this.configService.get('TEST_USER_UBUNTU_EMAIL', 'member-ubuntu@tatt.org'), 
                password: this.configService.get('TEST_USER_UBUNTU_PASS', 'NewPassword123!'),
                tier: CommunityTier.UBUNTU, 
                firstName: 'Ubuntu', 
                lastName: 'Member' 
            },
            { 
                email: this.configService.get('TEST_USER_IMANI_EMAIL', 'member-imani@tatt.org'), 
                password: this.configService.get('TEST_USER_IMANI_PASS', 'NewPassword123!'),
                tier: CommunityTier.IMANI, 
                firstName: 'Imani', 
                lastName: 'Member' 
            },
            { 
                email: this.configService.get('TEST_USER_KIONGOZI_EMAIL', 'member-kiongozi@tatt.org'), 
                password: this.configService.get('TEST_USER_KIONGOZI_PASS', 'NewPassword123!'),
                tier: CommunityTier.KIONGOZI, 
                firstName: 'Kiongozi', 
                lastName: 'Member' 
            },
        ];

        for (const { email, password, tier, firstName, lastName } of tiers) {
            try {
                const existingUser = await this.userRepository.findOne({ where: { email } });
                if (!existingUser) {
                    this.logger.log(`Seeding membership tier test user: ${email} (${tier})`);
                    const hashedPassword = await bcrypt.hash(password, 12);
                    await this.userRepository.create({
                        email,
                        password: hashedPassword,
                        firstName,
                        lastName,
                        systemRole: SystemRole.COMMUNITY_MEMBER,
                        communityTier: tier,
                        isActive: true,
                        isApproved: true,
                        flags: [AccountFlags.ONBOARDING_COMPLETED, AccountFlags.PROFILE_COMPLETED],
                        passwordChangedAt: new Date(),
                    } as any);
                }
            } catch (error) {
                this.logger.error(`Failed to seed ${tier} test user:`, error.message);
            }
        }
    }

    private async seedDefaultTestUser() {
        const email = this.configService.get<string>('TEST_USER_EMAIL');
        const password = this.configService.get<string>('TEST_USER_PASSWORD', 'TestUser@123!');
        const firstName = 'Test';
        const lastName = 'Member';

        if (!email) {
            this.logger.debug('Test user email not set. Skipping test user seeding.');
            return;
        }

        try {
            const existingUser = await this.userRepository.findOne({
                where: { email },
            });

            if (!existingUser) {
                this.logger.log(`Seeding default test user: ${email}`);
                const hashedPassword = await bcrypt.hash(password, 12);
                await this.userRepository.create({
                    email,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    systemRole: SystemRole.COMMUNITY_MEMBER,
                    communityTier: CommunityTier.FREE,
                    isActive: true,
                    isApproved: true,
                    flags: [AccountFlags.ONBOARDING_COMPLETED, AccountFlags.PROFILE_COMPLETED],
                    passwordChangedAt: new Date(),
                } as any);
                this.logger.log('Default test user created successfully.');
            }
        } catch (error) {
            this.logger.error('Failed to seed default test user:', error.message);
        }
    }


    private async seedDefaultAdmin() {
        const email = this.configService.get<string>('DEFAULT_ADMIN_EMAIL', 'admin@tatt.org');
        const password = this.configService.get<string>('DEFAULT_ADMIN_PASS', 'AdminPassword123!');
        const firstName = this.configService.get<string>('DEFAULT_ADMIN_FIRSTNAME', 'TATT');
        const lastName = this.configService.get<string>('DEFAULT_ADMIN_LASTNAME', 'Admin');

        try {
            const adminUser = await this.userRepository.findOne({
                where: { email },
            });

            if (!adminUser) {
                this.logger.log(`Seeding default admin user: ${email}`);
                const hashedPassword = await bcrypt.hash(password, 12);
                await this.userRepository.create({
                    email,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    systemRole: SystemRole.SUPERADMIN,
                    communityTier: CommunityTier.FREE,
                    isActive: true,
                    isApproved: true,
                    flags: [AccountFlags.ONBOARDING_COMPLETED, AccountFlags.PROFILE_COMPLETED],
                    passwordChangedAt: new Date(),
                } as any);
                this.logger.log('Default admin user created successfully.');
            } else {
                this.logger.debug('Default admin user already exists.');
            }
        } catch (error) {
            this.logger.error('Failed to seed default admin user:', error.message);
        }
    }
}
