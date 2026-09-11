import { Sequelize } from 'sequelize-typescript';
import { JobListing } from '../src/modules/jobs/entities/job-listing.entity';
import { JobCompanySource } from '../src/modules/jobs/entities/job-company-source.entity';
import { JobApplication } from '../src/modules/jobs/entities/job-application.entity';
import { SavedJob } from '../src/modules/jobs/entities/saved-job.entity';
import { User } from '../src/modules/iam/entities/user.entity';
import { Chapter } from '../src/modules/chapters/entities/chapter.entity';
import { ProfessionalInterest } from '../src/modules/interests/entities/interest.entity';
import { UserInterest } from '../src/modules/interests/entities/user-interest.entity';
import { Connection } from '../src/modules/connections/entities/connection.entity';
import { SecurityPolicy } from '../src/modules/security/entities/security-policy.entity';
import { PasswordHistory } from '../src/modules/security/entities/password-history.entity';
import { EmailOtp } from '../src/modules/security/entities/email-otp.entity';
import { Post } from '../src/modules/feed/entities/post.entity';
import { PostLike } from '../src/modules/feed/entities/post-like.entity';
import { PostComment } from '../src/modules/feed/entities/post-comment.entity';
import { PostBookmark } from '../src/modules/feed/entities/post-bookmark.entity';
import { PostUpvote } from '../src/modules/feed/entities/post-upvote.entity';
import { PostReport } from '../src/modules/feed/entities/post-report.entity';
import { FeedInsight } from '../src/modules/feed/entities/feed-insight.entity';
import { FeedPrompt } from '../src/modules/feed/entities/feed-prompt.entity';
import { FeedTopic } from '../src/modules/feed/entities/feed-topic.entity';
import { DirectMessage } from '../src/modules/messages/entities/direct-message.entity';
import { Resource } from '../src/modules/resources/entities/resource.entity';
import { ResourceInteraction } from '../src/modules/resources/entities/resource-interaction.entity';
import { Notification } from '../src/modules/notifications/entities/notification.entity';
import { CommunityIndustry } from '../src/modules/industries/entities/industry.entity';
import { SystemSetting } from '../src/modules/system-settings/entities/system-setting.entity';
import { PlatformTerms } from '../src/modules/system-settings/entities/platform-terms.entity';
import { MembershipTier } from '../src/modules/membership/entities/membership-tier.entity';
import { MembershipPlan } from '../src/modules/membership/entities/membership-plan.entity';
import { Discount } from '../src/modules/membership/entities/discount.entity';
import { Event } from '../src/modules/events/entities/event.entity';
import { EventChapter } from '../src/modules/events/entities/event-chapter.entity';
import { EventGuest } from '../src/modules/events/entities/event-guest.entity';
import { EventRegistration } from '../src/modules/events/entities/event-registration.entity';
import { VolunteerRole } from '../src/modules/volunteers/entities/volunteer-role.entity';
import { VolunteerActivity } from '../src/modules/volunteers/entities/volunteer-activity.entity';
import { VolunteerApplication } from '../src/modules/volunteers/entities/volunteer-application.entity';
import { VolunteerStat } from '../src/modules/volunteers/entities/volunteer-stat.entity';
import { VolunteerTrainingResource } from '../src/modules/volunteers/entities/volunteer-training.entity';
import { Product } from '../src/modules/store/entities/product.entity';
import { ProductVariant } from '../src/modules/store/entities/product-variant.entity';
import { Order } from '../src/modules/store/entities/order.entity';
import { OrderItem } from '../src/modules/store/entities/order-item.entity';
import { Partnership } from '../src/modules/partnerships/entities/partnership.entity';
import { SupportTicket } from '../src/modules/support/entities/support-ticket.entity';
import { SupportFaq } from '../src/modules/support/entities/support-faq.entity';
import { SupportFaqCategory } from '../src/modules/support/entities/support-faq-category.entity';
import { SupportMessage } from '../src/modules/support/entities/support-message.entity';

import { JobCategoryClassifierService } from '../src/modules/jobs/ingestion/services/job-category-classifier.service';
import { LocationFilterService } from '../src/modules/jobs/ingestion/services/location-filter.service';

async function reclassifyExistingJobs() {
    console.log('🔄 Reclassifying existing database job listings to Canonical Categories & Regions...');

    const sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'postgres',
        database: process.env.DB_NAME || 'tatt_db',
        models: [
            User, Chapter, ProfessionalInterest, UserInterest, Connection,
            SecurityPolicy, PasswordHistory, EmailOtp,
            Post, PostLike, PostComment, PostUpvote, PostBookmark, PostReport, 
            FeedInsight, FeedPrompt, FeedTopic,
            DirectMessage,
            Resource, ResourceInteraction, Notification,
            MembershipPlan, MembershipTier, Discount,
            Event, EventChapter, EventGuest, EventRegistration,
            JobListing, JobApplication, SavedJob, JobCompanySource,
            VolunteerRole, VolunteerActivity, VolunteerApplication, VolunteerStat, VolunteerTrainingResource,
            Product, ProductVariant, Order, OrderItem, Partnership,
            SupportMessage, SupportTicket, SupportFaqCategory, SupportFaq,
            CommunityIndustry, SystemSetting, PlatformTerms,
        ],
        logging: false,
    });

    await sequelize.authenticate();
    const classifier = new JobCategoryClassifierService();
    const locationFilter = new LocationFilterService();

    const jobs = await JobListing.findAll();
    console.log(`Found ${jobs.length} jobs to inspect/update...`);

    let updatedCount = 0;
    for (const job of jobs) {
        const rawDept = job.rawMetadata?.departments?.[0]?.name;
        const newCategory = classifier.classifyCategory(job.title, rawDept);
        const geo = locationFilter.classifyLocation(job.location, job.rawMetadata?.offices);

        let needsUpdate = false;
        const updates: any = {};

        if (job.category !== newCategory) {
            updates.category = newCategory;
            needsUpdate = true;
        }

        if (geo.isMatch && job.region !== geo.region) {
            updates.region = geo.region;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await job.update(updates);
            updatedCount++;
        }
    }

    console.log(`✅ Successfully reclassified ${updatedCount} jobs!`);

    // Print breakdown
    const stats: any[] = await sequelize.query(`
        SELECT category, count(*) as count 
        FROM job_listings 
        GROUP BY category 
        ORDER BY count DESC;
    `, { type: 'SELECT' as any });

    console.log('\n📊 Updated Canonical Category Distribution in PostgreSQL:');
    stats.forEach(s => {
        console.log(`   - ${String(s.category).padEnd(30)}: ${s.count} listings`);
    });

    await sequelize.close();
}

reclassifyExistingJobs().catch(console.error);
