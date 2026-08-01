import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CommunityIndustry } from './entities/industry.entity';
import { IndustriesService } from './industries.service';
import { IndustriesController } from './industries.controller';
import { IndustrySeederService } from './industry-seeder.service';

@Module({
    imports: [SequelizeModule.forFeature([CommunityIndustry])],
    providers: [IndustriesService, IndustrySeederService],
    controllers: [IndustriesController],
    exports: [IndustriesService],
})
export class IndustriesModule { }
