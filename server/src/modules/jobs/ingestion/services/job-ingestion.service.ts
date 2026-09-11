import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { JobListing } from '../../entities/job-listing.entity';
import { JobCompanySource } from '../../entities/job-company-source.entity';
import { IngestionReport, NormalizedJobPayload } from '../interfaces/job-source.interface';
import { JobSourceRegistryService } from './job-source-registry.service';

@Injectable()
export class JobIngestionService {
    private readonly logger = new Logger(JobIngestionService.name);

    constructor(
        @InjectModel(JobListing)
        private readonly jobListingModel: typeof JobListing,
        @InjectModel(JobCompanySource)
        private readonly companySourceModel: typeof JobCompanySource,
        private readonly sourceRegistry: JobSourceRegistryService
    ) {}

    /**
     * Queries registered source adapters and populates initial seed organizations if table is empty.
     */
    async ensureSeedCompanies(): Promise<number> {
        const count = await this.companySourceModel.count();
        if (count > 0) return count;

        this.logger.log('Initializing company sources registry from registered adapters...');
        const adapters = this.sourceRegistry.getAllAdapters();
        let totalSeeded = 0;

        for (const adapter of adapters) {
            const seedList = adapter.getInitialSeedCompanies?.() ?? [];
            if (seedList.length === 0) continue;

            const records = seedList.map(c => ({
                adapter: adapter.sourceId,
                companyName: c.companyName,
                boardToken: c.boardToken,
                websiteUrl: c.websiteUrl,
                targetRegions: c.targetRegions,
                isActive: true,
                lastJobCount: 0,
                failureCount: 0,
            }));

            await this.companySourceModel.bulkCreate(records, { ignoreDuplicates: true });
            totalSeeded += seedList.length;
            this.logger.log(`Seeded ${seedList.length} companies for source '${adapter.sourceId}'.`);
        }

        return totalSeeded;
    }

    /**
     * Executes harvest across all active companies for a specified adapter (default 'greenhouse').
     */
    async runHarvest(companySlug?: string, sourceId = 'greenhouse'): Promise<IngestionReport> {
        const startTime = Date.now();
        await this.ensureSeedCompanies();

        const adapter = this.sourceRegistry.getAdapter(sourceId);
        if (!adapter) {
            throw new NotFoundException(`No registered adapter found for source '${sourceId}'.`);
        }

        const queryWhere: any = { isActive: true, adapter: sourceId };
        if (companySlug) {
            queryWhere.boardToken = companySlug.trim().toLowerCase();
        }

        const companies = await this.companySourceModel.findAll({
            where: queryWhere,
            order: [['companyName', 'ASC']],
        });

        const report: IngestionReport = {
            sourceId,
            companiesProcessed: 0,
            totalFetched: 0,
            inScopeCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            deactivatedCount: 0,
            skippedDuplicatesCount: 0,
            errors: [],
            durationMs: 0,
        };

        this.logger.log(`Starting [${sourceId}] harvest across ${companies.length} companies...`);

        for (const company of companies) {
            try {
                const normalizedJobs = await adapter.fetchJobsForCompany(
                    company.boardToken,
                    company.companyName
                );

                report.companiesProcessed++;
                report.inScopeCount += normalizedJobs.length;

                const processedExternalIds: string[] = [];

                for (const job of normalizedJobs) {
                    processedExternalIds.push(job.externalId);
                    const outcome = await this.upsertOrDeduplicateJob(job);
                    if (outcome === 'inserted') report.insertedCount++;
                    else if (outcome === 'updated') report.updatedCount++;
                    else if (outcome === 'duplicate_skipped') report.skippedDuplicatesCount++;
                }

                // Stale Job Cleanup: Deactivate jobs belonging to this board that were removed
                const deactivated = await this.deactivateStaleCompanyJobs(sourceId, company.companyName, processedExternalIds);
                report.deactivatedCount += deactivated;

                // Update company stats
                await company.update({
                    lastHarvestedAt: new Date(),
                    lastJobCount: normalizedJobs.length,
                    failureCount: 0,
                    lastErrorMessage: null,
                });

                // Short throttle delay to be gentle with rate limits
                await this.delay(100);
            } catch (err: any) {
                const errorMsg = err?.message ?? 'Unknown error';
                report.errors.push({ company: company.boardToken, error: errorMsg });

                await company.update({
                    failureCount: company.failureCount + 1,
                    lastErrorMessage: errorMsg,
                });
            }
        }

        report.durationMs = Date.now() - startTime;
        this.logger.log(
            `[${sourceId}] Harvest complete in ${report.durationMs}ms: ` +
            `${report.insertedCount} new, ${report.updatedCount} updated, ` +
            `${report.deactivatedCount} deactivated, ${report.skippedDuplicatesCount} cross-source duplicates skipped.`
        );

        return report;
    }

    /**
     * Implements Two-Tier Deduplication & Persistence:
     * Tier 1: Source & ExternalId match -> Update
     * Tier 2: Content fingerprint match from another source -> Skip
     * Else -> Insert brand new listing
     */
    private async upsertOrDeduplicateJob(payload: NormalizedJobPayload): Promise<'inserted' | 'updated' | 'duplicate_skipped'> {
        // Tier 1: Exact ATS match
        const existingSameSource = await this.jobListingModel.findOne({
            where: {
                source: payload.source,
                externalId: payload.externalId,
            },
        });

        if (existingSameSource) {
            await existingSameSource.update({
                title: payload.title,
                location: payload.location,
                region: payload.region,
                type: payload.type,
                category: payload.category,
                description: payload.description ?? existingSameSource.description,
                externalUrl: payload.externalUrl,
                fingerprint: payload.fingerprint,
                isActive: true,
                rawMetadata: payload.rawMetadata,
            });
            return 'updated';
        }

        // Tier 2: Cross-Source Content Fingerprint Deduplication
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const duplicateMatch = await this.jobListingModel.findOne({
            where: {
                fingerprint: payload.fingerprint,
                createdAt: { [Op.gte]: sixtyDaysAgo },
            },
        });

        if (duplicateMatch) {
            // Already listed from another source/board
            return 'duplicate_skipped';
        }

        // Tier 3: Insert new JobListing
        await this.jobListingModel.create({
            title: payload.title,
            companyName: payload.companyName,
            companyLogoUrl: payload.companyLogoUrl,
            location: payload.location,
            type: payload.type,
            category: payload.category,
            description: payload.description,
            companyWebsite: payload.companyWebsite,
            source: payload.source,
            externalId: payload.externalId,
            externalUrl: payload.externalUrl,
            fingerprint: payload.fingerprint,
            region: payload.region,
            rawMetadata: payload.rawMetadata,
            isNew: true,
            isActive: true,
        });

        return 'inserted';
    }

    /**
     * Soft-deactivates jobs from a company board that are missing from the latest pull.
     */
    private async deactivateStaleCompanyJobs(sourceId: string, companyName: string, activeExternalIds: string[]): Promise<number> {
        const [affectedCount] = await this.jobListingModel.update(
            { isActive: false },
            {
                where: {
                    source: sourceId,
                    companyName,
                    isActive: true,
                    externalId: { [Op.notIn]: activeExternalIds },
                },
            }
        );
        return affectedCount;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
