import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { JobListing } from '../../entities/job-listing.entity';
import { JobIngestionService } from './job-ingestion.service';

@Injectable()
export class JobSchedulerService implements OnApplicationBootstrap {
    private readonly logger = new Logger(JobSchedulerService.name);
    // Unique 64-bit advisory lock integer identifier for job harvest
    private readonly ADVISORY_LOCK_ID = 847291;

    constructor(
        private readonly ingestionService: JobIngestionService,
        private readonly sequelize: Sequelize,
        @InjectModel(JobListing)
        private readonly jobListingModel: typeof JobListing
    ) {}

    /**
     * Executes when application bootstrap completes.
     * If the database has zero active job listings, initiates an automated background harvest
     * so newly deployed production environments immediately contain job opportunities.
     */
    async onApplicationBootstrap(): Promise<void> {
        try {
            const count = await this.jobListingModel.count();
            if (count === 0) {
                this.logger.log(
                    'Zero job listings detected in database on application boot. Scheduling initial automated harvest in background...'
                );
                // Non-blocking background trigger 5s after boot
                setTimeout(async () => {
                    try {
                        this.logger.log('Starting initial automated background harvest...');
                        await this.runHarvestWithLock();
                        this.logger.log('Initial automated background harvest completed successfully.');
                    } catch (err: any) {
                        this.logger.error(`Initial background harvest encountered an error: ${err?.message}`, err?.stack);
                    }
                }, 5000);
            } else {
                this.logger.log(`JobSchedulerService booted with ${count} existing listings. Regular harvest will run at 2:00 AM UTC.`);
            }
        } catch (error: any) {
            this.logger.warn(`Could not verify initial job count on bootstrap: ${error?.message}`);
        }
    }

    /**
     * Daily Cron execution at 2:00 AM UTC.
     * Uses PostgreSQL advisory lock to prevent concurrent runs across replicas.
     */
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async handleDailyHarvest(): Promise<void> {
        this.logger.log('Daily job harvest triggered by cron scheduler.');
        await this.runHarvestWithLock();
    }

    /**
     * Executes the harvest ensuring single-instance execution via Postgres Advisory Lock.
     */
    async runHarvestWithLock(companySlug?: string): Promise<any> {
        const hasLock = await this.tryAcquireLock();

        if (!hasLock) {
            this.logger.warn('Job harvest is currently in progress on another server instance. Skipping duplicate run.');
            return { skipped: true, reason: 'Lock already held by another replica.' };
        }

        try {
            this.logger.log('Acquired PostgreSQL advisory lock. Running harvest...');
            const report = await this.ingestionService.runHarvest(companySlug);
            return report;
        } catch (error: any) {
            this.logger.error(`Failed during scheduled job harvest: ${error.message}`, error.stack);
            throw error;
        } finally {
            await this.releaseLock();
            this.logger.log('Released PostgreSQL advisory lock.');
        }
    }

    private async tryAcquireLock(): Promise<boolean> {
        try {
            const [results] = await this.sequelize.query(
                `SELECT pg_try_advisory_lock(${this.ADVISORY_LOCK_ID}) AS acquired;`
            );
            const row = (results as any[])?.[0];
            return row?.acquired === true || row?.acquired === 'true';
        } catch (err: any) {
            this.logger.warn(`Could not test Postgres advisory lock (${err.message}). Proceeding without distributed lock.`);
            return true;
        }
    }

    private async releaseLock(): Promise<void> {
        try {
            await this.sequelize.query(`SELECT pg_advisory_unlock(${this.ADVISORY_LOCK_ID});`);
        } catch (err: any) {
            this.logger.warn(`Could not release Postgres advisory lock: ${err.message}`);
        }
    }
}
