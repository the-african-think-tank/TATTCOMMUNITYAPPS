import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { User } from '../../modules/iam/entities/user.entity';
import { Chapter } from '../../modules/chapters/entities/chapter.entity';
import { ProfessionalInterest } from '../../modules/interests/entities/interest.entity';
import { UserInterest } from '../../modules/interests/entities/user-interest.entity';
import { Connection } from '../../modules/connections/entities/connection.entity';
import { SecurityPolicy } from '../../modules/security/entities/security-policy.entity';
import { PasswordHistory } from '../../modules/security/entities/password-history.entity';
import { EmailOtp } from '../../modules/security/entities/email-otp.entity';
import { Post } from '../../modules/feed/entities/post.entity';
import { PostLike } from '../../modules/feed/entities/post-like.entity';
import { PostComment } from '../../modules/feed/entities/post-comment.entity';
import { PostBookmark } from '../../modules/feed/entities/post-bookmark.entity';
import { PostUpvote } from '../../modules/feed/entities/post-upvote.entity';
import { PostReport } from '../../modules/feed/entities/post-report.entity';
import { FeedInsight } from '../../modules/feed/entities/feed-insight.entity';
import { FeedPrompt } from '../../modules/feed/entities/feed-prompt.entity';
import { FeedTopic } from '../../modules/feed/entities/feed-topic.entity';
import { DirectMessage } from '../../modules/messages/entities/direct-message.entity';
import { Resource } from '../../modules/resources/entities/resource.entity';
import { ResourceInteraction } from '../../modules/resources/entities/resource-interaction.entity';
import { Notification } from '../../modules/notifications/entities/notification.entity';
import { CommunityIndustry } from '../../modules/industries/entities/industry.entity';
import { SystemSetting } from '../../modules/system-settings/entities/system-setting.entity';
import { PlatformTerms } from '../../modules/system-settings/entities/platform-terms.entity';
import { MembershipTier } from '../../modules/membership/entities/membership-tier.entity';
import { MembershipPlan } from '../../modules/membership/entities/membership-plan.entity';
import { Discount } from '../../modules/membership/entities/discount.entity';

import { Event } from '../../modules/events/entities/event.entity';
import { EventChapter } from '../../modules/events/entities/event-chapter.entity';
import { EventGuest } from '../../modules/events/entities/event-guest.entity';
import { EventRegistration } from '../../modules/events/entities/event-registration.entity';
import { JobListing } from '../../modules/jobs/entities/job-listing.entity';
import { JobApplication } from '../../modules/jobs/entities/job-application.entity';
import { SavedJob } from '../../modules/jobs/entities/saved-job.entity';
import { VolunteerRole } from '../../modules/volunteers/entities/volunteer-role.entity';
import { VolunteerActivity } from '../../modules/volunteers/entities/volunteer-activity.entity';
import { VolunteerApplication } from '../../modules/volunteers/entities/volunteer-application.entity';
import { VolunteerStat } from '../../modules/volunteers/entities/volunteer-stat.entity';
import { VolunteerTrainingResource } from '../../modules/volunteers/entities/volunteer-training.entity';
import { Product } from '../../modules/store/entities/product.entity';
import { ProductVariant } from '../../modules/store/entities/product-variant.entity';
import { Order } from '../../modules/store/entities/order.entity';
import { OrderItem } from '../../modules/store/entities/order-item.entity';
import { Partnership } from '../../modules/partnerships/entities/partnership.entity';
import { SupportTicket } from '../../modules/support/entities/support-ticket.entity';
import { SupportFaq } from '../../modules/support/entities/support-faq.entity';
import { SupportFaqCategory } from '../../modules/support/entities/support-faq-category.entity';
import { SupportMessage } from '../../modules/support/entities/support-message.entity';

@Module({
    imports: [
        SequelizeModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                dialect: 'postgres',
                host: config.get<string>('DB_HOST', 'localhost'),
                port: config.get<number>('DB_PORT', 5432),
                username: config.get<string>('DB_USER', 'postgres'),
                password: config.get<string>('DB_PASS', 'postgres'),
                database: config.get<string>('DB_NAME', 'tatt_db'),
                models: [
                    User, Chapter, ProfessionalInterest, UserInterest, Connection,
                    SecurityPolicy, PasswordHistory, EmailOtp,
                    Post, PostLike, PostComment, PostUpvote, PostBookmark, PostReport, 
                    FeedInsight, FeedPrompt, FeedTopic,
                    DirectMessage,
                    Resource, ResourceInteraction, Notification,
                    MembershipPlan, MembershipTier, Discount,
                    Event, EventChapter, EventGuest, EventRegistration,
                    JobListing, JobApplication, SavedJob,
                    VolunteerRole, VolunteerActivity, VolunteerApplication, VolunteerStat, VolunteerTrainingResource,
                    Product, ProductVariant, Order, OrderItem, Partnership,
                    SupportMessage, SupportTicket, SupportFaqCategory, SupportFaq,
                    CommunityIndustry, SystemSetting, PlatformTerms,
                ],
                synchronize: config.get<string | boolean>('DB_SYNC') !== 'false' && config.get<string | boolean>('DB_SYNC') !== false && config.get<string | boolean>('DB_SYNC') !== '0',
                autoLoadModels: true,
                alter: true,
                logging: config.get<string>('DB_LOGGING') === 'true' ? console.log : false,
            }),
        }),
    ],
})
export class DatabaseModule { }
