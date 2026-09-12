import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment configuration from all potential .env locations
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-12345';
process.env.APP_SECRET = process.env.APP_SECRET || 'dev-app-secret-12345';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_dummy_seeding_key';

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { JobIngestionService } from '../src/modules/jobs/ingestion/services/job-ingestion.service';
import { JobListing } from '../src/modules/jobs/entities/job-listing.entity';
import { JobCompanySource } from '../src/modules/jobs/entities/job-company-source.entity';
import { Sequelize } from 'sequelize-typescript';
import * as fs from 'fs';

/**
 * CLI Script: Standalone Job Harvest for Production / Staging / Local
 * 
 * Usage:
 *   pnpm run db:harvest-jobs
 *   or: make harvest-jobs
 *   or with a specific company: COMPANY=moniepoint pnpm run db:harvest-jobs
 */
async function run() {
    console.log('\n================================================================');
    console.log('🚀 TATT OPPORTUNITIES: STANDALONE JOB HARVEST TOOL');
    console.log('================================================================\n');

    console.log('1. Connecting to database via AppModule context...');
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

    try {
        const sequelize = app.get(Sequelize);

        // 1. Ensure SQL migrations are applied if needed
        console.log('2. Verifying database table schema & migrations...');
        await sequelize.sync({ alter: true });
        const migrationFile = path.join(__dirname, 'migrations', '20260911-job-ingestion.sql');
        if (fs.existsSync(migrationFile)) {
            const sql = fs.readFileSync(migrationFile, 'utf8');
            await sequelize.query(sql);
            console.log('   ✅ Migration 20260911-job-ingestion.sql applied.');
        }

        // 2. Initialize Seed Companies
        console.log('3. Registering employer career boards (Greenhouse)...');
        const ingestionService = app.get(JobIngestionService);
        const seeded = await ingestionService.ensureSeedCompanies();
        const totalSources = await JobCompanySource.count();
        console.log(`   ✅ Active employer boards: ${totalSources} (Newly initialized: ${seeded})`);

        // 3. Run Harvest
        const targetCompany = process.env.COMPANY?.trim() || undefined;
        if (targetCompany) {
            console.log(`\n4. Starting harvest for specific employer board: '${targetCompany}'...`);
        } else {
            console.log('\n4. Starting full harvest across registered employers (US & Africa)...');
        }

        const startTime = Date.now();
        const report = await ingestionService.runHarvest(targetCompany);
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n================================================================');
        console.log('📊 HARVEST SUMMARY REPORT');
        console.log('================================================================');
        console.log(`Employers Scanned:    ${report.companiesProcessed}`);
        console.log(`In-Scope Roles:       ${report.inScopeCount}`);
        console.log(`New Roles Inserted:   ${report.insertedCount}`);
        console.log(`Existing Roles Sync:  ${report.updatedCount}`);
        console.log(`Deactivated Roles:    ${report.deactivatedCount}`);
        console.log(`Execution Duration:   ${durationSec}s`);

        if (report.errors && report.errors.length > 0) {
            console.log(`\n⚠️  Encountered ${report.errors.length} notices during harvest:`);
            report.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
        }

        // 4. Overall Database Stats
        const totalInDb = await JobListing.count({ where: { isActive: true } });
        const africaCount = await JobListing.count({ where: { isActive: true, region: 'Africa' } });
        const usCount = await JobListing.count({ where: { isActive: true, region: 'US' } });
        const remoteCount = await JobListing.count({ where: { isActive: true, region: 'Remote-Global' } });

        console.log('\n================================================================');
        console.log('🎯 LIVE DATABASE TOTALS');
        console.log('================================================================');
        console.log(`Total Active Roles:   ${totalInDb}`);
        console.log(`Africa Region Roles:  ${africaCount}`);
        console.log(`US Region Roles:      ${usCount}`);
        console.log(`Global Remote Roles:  ${remoteCount}`);
        console.log('================================================================\n');
        console.log('✅ Harvest script completed successfully!\n');
    } catch (err: any) {
        console.error('\n❌ Harvest script failed:', err.message, err.stack);
        process.exit(1);
    } finally {
        await app.close();
    }
}

run();
