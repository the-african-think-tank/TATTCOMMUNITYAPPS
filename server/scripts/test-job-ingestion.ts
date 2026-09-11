import { LocationFilterService } from '../src/modules/jobs/ingestion/services/location-filter.service';
import { JobCategoryClassifierService } from '../src/modules/jobs/ingestion/services/job-category-classifier.service';
import { GreenhouseJobAdapter } from '../src/modules/jobs/ingestion/sources/greenhouse/greenhouse.adapter';

async function main() {
    console.log('====================================================');
    console.log('🚀 TESTING GREENHOUSE JOB INGESTION ENGINE (LIVE)');
    console.log('====================================================\n');

    const locationFilter = new LocationFilterService();
    const categoryClassifier = new JobCategoryClassifierService();
    const adapter = new GreenhouseJobAdapter(locationFilter, categoryClassifier);

    // Test a multi-sector selection:
    // 1. One Acre Fund (Agriculture & Non-Profit in Africa)
    // 2. FlyZipline (Healthcare & Logistics in Africa & US)
    // 3. Moniepoint (Finance & Banking in Africa)
    // 4. Figma (Design & Tech in US)
    const testCompanies = [
        { name: 'One Acre Fund', token: 'oneacrefund' },
        { name: 'Zipline', token: 'flyzipline' },
        { name: 'Moniepoint', token: 'moniepoint' },
        { name: 'Figma', token: 'figma' },
    ];

    let totalHarvested = 0;

    for (const company of testCompanies) {
        console.log(`📡 Fetching live jobs for [${company.name}] (board: '${company.token}')...`);
        try {
            const jobs = await adapter.fetchJobsForCompany(company.token, company.name);
            console.log(`   ✅ In-Scope (US & Africa) Jobs Found: ${jobs.length}`);
            totalHarvested += jobs.length;

            // Display top 3 sample jobs with classification
            const sample = jobs.slice(0, 3);
            sample.forEach((j, idx) => {
                console.log(`   [${idx + 1}] "${j.title}"`);
                console.log(`       📍 Location: ${j.location} (Region: ${j.region})`);
                console.log(`       🏷️ Sector:   ${j.category} | Type: ${j.type}`);
                console.log(`       🔗 Apply URL: ${j.externalUrl}`);
                console.log(`       🔑 Fingerprint: ${j.fingerprint.slice(0, 16)}...`);
            });
            console.log('');
        } catch (err: any) {
            console.error(`   ❌ Failed for ${company.name}:`, err.message);
        }
    }

    console.log('====================================================');
    console.log(`🎉 TEST SUMMARY: Successfully normalized ${totalHarvested} live roles`);
    console.log('   - Only US & African roles kept');
    console.log('   - Categorized across diverse sectors');
    console.log('   - Fingerprints generated for deduplication');
    console.log('====================================================');
}

main().catch(err => {
    console.error('Fatal error during test:', err);
    process.exit(1);
});
