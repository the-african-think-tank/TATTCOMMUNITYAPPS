import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CommunityIndustry } from './entities/industry.entity';

const DEFAULT_INDUSTRIES = [
    'Technology & Software',
    'Healthcare & Medicine',
    'Finance & Banking',
    'Education & Academia',
    'Agriculture & Agribusiness',
    'Real Estate & Construction',
    'Media, Creative & Entertainment',
    'Energy & Sustainability',
    'Consulting & Professional Services',
    'Retail & E-commerce',
    'Manufacturing & Engineering',
    'Non-Profit & Social Impact',
    'Hospitality & Tourism',
    'Legal & Public Policy',
    'Logistics & Supply Chain',
];

@Injectable()
export class IndustrySeederService implements OnApplicationBootstrap {
    private readonly logger = new Logger(IndustrySeederService.name);

    constructor(
        @InjectModel(CommunityIndustry) private industryRepo: typeof CommunityIndustry,
    ) { }

    async onApplicationBootstrap() {
        try {
            const count = await this.industryRepo.count();
            if (count === 0) {
                this.logger.log('No industries found in database. Seeding default industry sectors...');
                for (const name of DEFAULT_INDUSTRIES) {
                    await this.industryRepo.findOrCreate({ where: { name } });
                }
                this.logger.log(`Successfully seeded ${DEFAULT_INDUSTRIES.length} default industry sectors.`);
            }
        } catch (error) {
            this.logger.error('Failed to seed default industries:', error);
        }
    }
}
