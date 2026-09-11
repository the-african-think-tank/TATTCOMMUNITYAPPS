import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JobListing } from './entities/job-listing.entity';
import { JobApplication } from './entities/job-application.entity';
import { SavedJob } from './entities/saved-job.entity';
import { JobAlert } from './entities/job-alert.entity';
import { JobCompanySource } from './entities/job-company-source.entity';
import { User } from '../iam/entities/user.entity';
import { JobsController, AdminJobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { LocationFilterService } from './ingestion/services/location-filter.service';
import { JobCategoryClassifierService } from './ingestion/services/job-category-classifier.service';
import { GreenhouseJobAdapter } from './ingestion/sources/greenhouse/greenhouse.adapter';
import { JobSourceRegistryService } from './ingestion/services/job-source-registry.service';
import { JobIngestionService } from './ingestion/services/job-ingestion.service';
import { JobSchedulerService } from './ingestion/services/job-scheduler.service';

@Module({
    imports: [
        SequelizeModule.forFeature([JobListing, JobApplication, SavedJob, JobAlert, JobCompanySource, User]),
        NotificationsModule,
    ],
    controllers: [JobsController, AdminJobsController],
    providers: [
        JobsService,
        LocationFilterService,
        JobCategoryClassifierService,
        GreenhouseJobAdapter,
        JobSourceRegistryService,
        JobIngestionService,
        JobSchedulerService,
    ],
    exports: [JobsService, JobIngestionService, JobSchedulerService, JobSourceRegistryService],
})
export class JobsModule {}
