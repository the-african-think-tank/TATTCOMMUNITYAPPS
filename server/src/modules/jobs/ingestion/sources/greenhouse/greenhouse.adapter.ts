import { Injectable, Logger } from '@nestjs/common';
import { JobSourceAdapter, NormalizedJobPayload, SourceSeedCompany } from '../../interfaces/job-source.interface';
import { LocationFilterService } from '../../services/location-filter.service';
import { JobCategoryClassifierService } from '../../services/job-category-classifier.service';
import { GreenhouseApiResponse } from './greenhouse.types';
import { GREENHOUSE_SEED_COMPANIES } from './greenhouse.seed';

@Injectable()
export class GreenhouseJobAdapter implements JobSourceAdapter {
    readonly sourceId = 'greenhouse';
    private readonly logger = new Logger(GreenhouseJobAdapter.name);

    constructor(
        private readonly locationFilter: LocationFilterService,
        private readonly categoryClassifier: JobCategoryClassifierService
    ) {}

    /**
     * Exposes Greenhouse seed organizations for the registry.
     */
    getInitialSeedCompanies(): SourceSeedCompany[] {
        return GREENHOUSE_SEED_COMPANIES;
    }

    /**
     * Fetches and normalizes all open jobs from a company's Greenhouse board.
     */
    async fetchJobsForCompany(boardToken: string, companyNameFallback?: string): Promise<NormalizedJobPayload[]> {
        const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'TATT-Job-Aggregator/1.0 (Community Career Platform)',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(15000),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    this.logger.warn(`Greenhouse board token '${boardToken}' returned 404 (inactive or moved).`);
                    return [];
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = (await response.json()) as GreenhouseApiResponse;
            const rawJobs = data?.jobs ?? [];
            const normalizedJobs: NormalizedJobPayload[] = [];

            for (const raw of rawJobs) {
                const companyName = raw.company_name?.trim() || companyNameFallback || boardToken;
                const rawLocation = raw.location?.name ?? '';

                // 1. Geographic Scope Filter (US & Africa)
                const geoMatch = this.locationFilter.classifyLocation(rawLocation, raw.offices);
                if (!geoMatch.isMatch) {
                    continue; // Skip positions outside US/Africa
                }

                // 2. Decode and Clean HTML Content
                const cleanDescription = this.decodeHtml(raw.content ?? '');

                // 3. Multi-sector Category & Employment Type Classification
                const primaryDept = raw.departments?.[0]?.name;
                const category = this.categoryClassifier.classifyCategory(raw.title, primaryDept);
                const employmentType = this.categoryClassifier.classifyEmploymentType(
                    raw.title,
                    undefined,
                    cleanDescription
                );

                // 4. Deterministic Cross-Source Content Fingerprint
                const fingerprint = this.categoryClassifier.generateFingerprint(
                    companyName,
                    raw.title,
                    geoMatch.region
                );

                normalizedJobs.push({
                    externalId: String(raw.id),
                    source: this.sourceId,
                    title: raw.title.trim().slice(0, 500),
                    companyName,
                    location: (rawLocation || geoMatch.region).slice(0, 1000),
                    region: geoMatch.region,
                    type: employmentType.slice(0, 100),
                    category: category.slice(0, 200),
                    description: cleanDescription,
                    externalUrl: raw.absolute_url,
                    companyWebsite: undefined,
                    postedAt: raw.first_published || raw.updated_at ? new Date(raw.first_published ?? raw.updated_at!) : undefined,
                    fingerprint,
                    rawMetadata: {
                        boardToken,
                        requisitionId: (raw as any).requisition_id,
                        departments: raw.departments,
                        offices: raw.offices,
                    },
                });
            }

            return normalizedJobs;
        } catch (error: any) {
            const status = error?.response?.status;
            if (status === 404) {
                this.logger.warn(`Greenhouse board token '${boardToken}' returned 404 (inactive or moved).`);
            } else {
                this.logger.error(`Error fetching Greenhouse jobs for '${boardToken}': ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Decodes HTML entities and strips malicious script/iframe tags.
     */
    private decodeHtml(rawHtml: string): string {
        if (!rawHtml) return '';

        let decoded = rawHtml
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');

        decoded = decoded
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

        return decoded.trim();
    }
}
