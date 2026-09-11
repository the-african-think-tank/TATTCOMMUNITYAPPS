import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { User } from '../iam/entities/user.entity';
import { Post } from '../feed/entities/post.entity';
import { PostReport, ReportStatus } from '../feed/entities/post-report.entity';
import { VolunteerApplication, ApplicationStatus } from '../volunteers/entities/volunteer-application.entity';
import { SystemRole, CommunityTier } from '../iam/enums/roles.enum';
import { Sequelize } from 'sequelize-typescript';
import { RevenueService } from '../revenue/revenue.service';

@Injectable()
export class DashboardService {
    constructor(
        @InjectModel(User) private readonly userModel: typeof User,
        @InjectModel(Post) private readonly postModel: typeof Post,
        @InjectModel(PostReport) private readonly reportModel: typeof PostReport,
        @InjectModel(VolunteerApplication) private readonly volunteerModel: typeof VolunteerApplication,
        private readonly revenueService: RevenueService,
    ) { }

    async getDashboardOverview() {
        /** 1. Key Performance Indicators */
        const totalMembers = await this.userModel.count({
            where: { systemRole: SystemRole.COMMUNITY_MEMBER }
        });

        const activeSubscriptions = await this.userModel.count({
            where: {
                systemRole: SystemRole.COMMUNITY_MEMBER,
                communityTier: { [Op.ne]: CommunityTier.FREE },
            }
        });

        // 3. Monthly Revenue (Fetch stats for the last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const revenueStats = await this.revenueService.getStats({ startDate: thirtyDaysAgo });
        const monthlyRevenue = revenueStats.totalRevenue;

        const volunteerCount = await this.volunteerModel.count({
            where: { status: ApplicationStatus.APPROVED }
        });

        /** 2. Subscriber Tier Breakdown */
        const freeCount = await this.userModel.count({ where: { systemRole: SystemRole.COMMUNITY_MEMBER, communityTier: CommunityTier.FREE } });
        const ubuntuCount = await this.userModel.count({ where: { systemRole: SystemRole.COMMUNITY_MEMBER, communityTier: CommunityTier.UBUNTU } });
        const imaniCount = await this.userModel.count({ where: { systemRole: SystemRole.COMMUNITY_MEMBER, communityTier: CommunityTier.IMANI } });
        const kiongoziCount = await this.userModel.count({ where: { systemRole: SystemRole.COMMUNITY_MEMBER, communityTier: CommunityTier.KIONGOZI } });

        const premiumCount = imaniCount + kiongoziCount; // Aggregating top-tier for simplicity in the basic frontend UI, or passing distinct.
        const totalSubscribers = Math.max(1, totalMembers);

        const subscriberBreakdown = {
            freeTier: `${Math.round((freeCount / totalSubscribers) * 100)}%`,
            ubuntuTier: `${Math.round((ubuntuCount / totalSubscribers) * 100)}%`,
            imaniTier: `${Math.round((imaniCount / totalSubscribers) * 100)}%`,
            kiongoziTier: `${Math.round((kiongoziCount / totalSubscribers) * 100)}%`,
        };

        /** 3. Pending Moderation Items */
        const pendingReports = await this.reportModel.findAll({
            where: { status: ReportStatus.PENDING },
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'reporter', attributes: ['firstName', 'lastName', 'communityTier', 'profilePicture'] }]
        });

        const moderationItems = pendingReports.map((report: any) => ({
            id: report.id,
            user: {
                name: `${report.reporter?.firstName} ${report.reporter?.lastName}`,
                initials: `${report.reporter?.firstName?.charAt(0) || ''}${report.reporter?.lastName?.charAt(0) || ''}`,
                tier: report.reporter?.communityTier?.toString().replace('_', ' ') || 'Member',
                profilePicture: report.reporter?.profilePicture,
            },
            issue: report.reason || report.suggestedAction,
            time: report.createdAt, // Frontend handles "x mins ago"
        }));

        /** 4. Recent Platform Activity (Latest generic activity for the feed overlay) */
        const recentUsers = await this.userModel.findAll({
            where: { systemRole: SystemRole.COMMUNITY_MEMBER },
            limit: 2,
            order: [['createdAt', 'DESC']],
        });

        const recentPosts = await this.postModel.findAll({
            limit: 2,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'author', attributes: ['firstName', 'lastName'] }]
        });

        const activities = [];
        for (const user of recentUsers) {
            activities.push({
                type: 'NEW_MEMBER',
                title: `New Member: ${user.firstName} ${user.lastName}`,
                desc: `Joined ${user.communityTier} Tier • ${user.location || 'Unknown Location'}`,
                time: user.createdAt,
            });
        }
        for (const post of recentPosts) {
            activities.push({
                type: 'NEW_POST',
                title: `New Post Published`,
                desc: `By ${(post as any).author?.firstName} ${(post as any).author?.lastName}`,
                time: post.createdAt,
            });
        }

        // Sort activities combined by descending time
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        // Dummy Community Growth historical data mapping for now (6 months ago -> today). Can aggregate directly from SQL by EXTRACT(month FROM createdAt).
        const currentMonth = new Date().getMonth();
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const growthLabels = [];
        // Past 6 months
        for (let i = 5; i >= 0; i--) {
            growthLabels.push(months[(currentMonth - i + 12) % 12]);
        }

        // For actual data aggregation per month
        const monthlyMemberCounts = await this.userModel.findAll({
            attributes: [
                [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt')), 'month'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            where: {
                systemRole: SystemRole.COMMUNITY_MEMBER,
                createdAt: {
                    [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 5))
                }
            },
            group: [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt'))],
            order: [[Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt')), 'ASC']]
        });

        // Hydrate data into months array... fallback mock values if DB is empty for aesthetics in testing
        let dataCounts = [10, 32, 25, 15, 20, 10];
        if (monthlyMemberCounts.length > 0) {
            // Very primitive mock logic injection
            const dbCounts = monthlyMemberCounts.map((m: any) => parseInt(m.dataValues.count, 10));
            while (dbCounts.length < 6) dbCounts.unshift(0); // Pad start
            dataCounts = dbCounts.slice(-6);
        }

        return {
            kpis: {
                totalMembers: {
                    value: `${totalMembers.toLocaleString()}`,
                    trend: '+12.5%', // Hardcoded trend logic for UI aesthetic purposes as requested.
                    trendType: 'up',
                },
                activeSubscriptions: {
                    value: `${activeSubscriptions.toLocaleString()}`,
                    trend: '+5.2%',
                    trendType: 'up',
                },
                monthlyRevenue: {
                    value: `$${monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    trend: '+8.0%',
                    trendType: 'up',
                },
                volunteerCount: {
                    value: `${volunteerCount.toLocaleString()}`,
                    trend: 'Stable',
                    trendType: 'neutral',
                }
            },
            communityGrowth: {
                labels: growthLabels,
                data: dataCounts,
            },
            subscriberBreakdown,
            activities: activities.slice(0, 4), // cap at latest 4
            moderationItems,
        };
    }
}
