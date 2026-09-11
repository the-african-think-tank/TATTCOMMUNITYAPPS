export interface NormalizedJobPayload {
    externalId: string;
    source: string;
    title: string;
    companyName: string;
    companyLogoUrl?: string;
    location: string;
    region: 'US' | 'Africa' | 'Remote-Global' | 'Other';
    type: string;           // 'Full-time', 'Part-time', 'Contract', 'Internship'
    category: string;       // Multi-sector: Healthcare, Agriculture, NGO, Finance, Admin, etc.
    description?: string;   // Clean decoded HTML
    requirements?: string;
    externalUrl: string;    // Direct apply link on company ATS
    companyWebsite?: string;
    salaryLabel?: string;
    salaryMin?: number;
    salaryMax?: number;
    postedAt?: Date;
    fingerprint: string;
    rawMetadata?: Record<string, any>;
}

export interface SourceSeedCompany {
    companyName: string;
    boardToken: string;
    websiteUrl?: string;
    targetRegions: string[];
}

export interface IngestionReport {
    sourceId: string;
    companiesProcessed: number;
    totalFetched: number;
    inScopeCount: number;
    insertedCount: number;
    updatedCount: number;
    deactivatedCount: number;
    skippedDuplicatesCount: number;
    errors: Array<{ company: string; error: string }>;
    durationMs: number;
}

export interface JobSourceAdapter {
    readonly sourceId: string;
    getInitialSeedCompanies?(): SourceSeedCompany[];
    fetchJobsForCompany(token: string, companyName?: string): Promise<NormalizedJobPayload[]>;
}
