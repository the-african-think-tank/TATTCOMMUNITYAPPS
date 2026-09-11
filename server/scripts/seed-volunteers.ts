import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-12345';
process.env.APP_SECRET = process.env.APP_SECRET || 'dev-app-secret-12345';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_dummy_seeding_key';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.DB_NAME = process.env.DB_NAME || 'tatt_db';

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/iam/entities/user.entity';
import { Chapter } from '../src/modules/chapters/entities/chapter.entity';
import { VolunteerRole } from '../src/modules/volunteers/entities/volunteer-role.entity';
import { VolunteerApplication, ApplicationStatus } from '../src/modules/volunteers/entities/volunteer-application.entity';
import { VolunteerStat, VolunteerGrade, VolunteerStatus } from '../src/modules/volunteers/entities/volunteer-stat.entity';
import { VolunteerActivity, ActivityStatus } from '../src/modules/volunteers/entities/volunteer-activity.entity';
import { AccountFlags } from '../src/modules/iam/enums/roles.enum';
import * as bcrypt from 'bcryptjs';

async function seedVolunteers() {
    console.log('\n========================================');
    console.log('  Seeding Dummy Volunteers & Impact Data  ');
    console.log('========================================\n');

    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

    try {
        // 1. Get Chapters
        const chapters = await Chapter.findAll();
        if (chapters.length === 0) {
            console.log('⚠️ No chapters found. Please seed chapters first.');
            await app.close();
            return;
        }

        const mainChapter = chapters[0];

        // 2. Fetch or Create Volunteer Users
        const passwordHash = await bcrypt.hash('Volunteer123!', 10);
        const dummyVolunteerData = [
            {
                email: 'kwame.mensah.volunteer@tatt.org',
                firstName: 'Kwame',
                lastName: 'Mensah',
                headline: 'Community Lead & Diaspora Youth Mentor',
                communityTier: 'IMANI',
                chapterId: mainChapter.id,
                bio: 'Passionate about Pan-African youth empowerment, trade initiatives, and community organizing.',
                profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
            },
            {
                email: 'zara.okafor.volunteer@tatt.org',
                firstName: 'Zara',
                lastName: 'Okafor',
                headline: 'Digital Content Creator & Event Organizer',
                communityTier: 'UBUNTU',
                chapterId: mainChapter.id,
                bio: 'Managing digital engagement and storytelling for diaspora impact projects.',
                profilePicture: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
            },
            {
                email: 'tariq.almansoor.volunteer@tatt.org',
                firstName: 'Tariq',
                lastName: 'Al-Mansoor',
                headline: 'Strategic Partnerships & Logistics Specialist',
                communityTier: 'KIONGOZI',
                chapterId: mainChapter.id,
                bio: 'Coordinating cross-chapter logistical support and volunteer onboarding programs.',
                profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
            },
            {
                email: 'amara.diop.volunteer@tatt.org',
                firstName: 'Amara',
                lastName: 'Diop',
                headline: 'Education & Knowledge Base Coordinator',
                communityTier: 'IMANI',
                chapterId: mainChapter.id,
                bio: 'Curating training modules and guiding new volunteer applicants through onboarding.',
                profilePicture: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
            },
        ];

        const volunteerUsers: User[] = [];

        for (const data of dummyVolunteerData) {
            let user = await User.findOne({ where: { email: data.email } });
            if (!user) {
                user = await User.create({
                    ...data,
                    passwordHash,
                    isEmailVerified: true,
                    flags: [AccountFlags.VOLUNTEER],
                } as any);
                console.log(`✅ Created Volunteer User: ${user.firstName} ${user.lastName} (${user.email})`);
            } else {
                let flags = user.flags || [];
                if (!flags.includes(AccountFlags.VOLUNTEER)) {
                    flags.push(AccountFlags.VOLUNTEER);
                    user.flags = flags;
                    await user.save();
                }
                console.log(`ℹ️ Found Existing Volunteer User: ${user.firstName} ${user.lastName}`);
            }
            volunteerUsers.push(user);
        }

        // 3. Create Volunteer Roles
        const dummyRoles = [
            {
                name: 'Community Outreach Lead',
                location: 'Nairobi / Hybrid',
                chapterId: mainChapter.id,
                weeklyHours: 5,
                durationMonths: 6,
                description: 'Lead outreach campaigns, manage chapter member check-ins, and foster active participation.',
                responsibilities: ['Organize monthly member meetups', 'Engage diaspora networks', 'Coordinate volunteer check-ins'],
                requiredSkills: ['Community Management', 'Public Speaking', 'Event Planning'],
                spotsNeeded: 3,
                openUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                isActive: true,
                grade: 'Lead',
                createdBy: volunteerUsers[0].id,
            },
            {
                name: 'Digital Media & Storyteller',
                location: 'Remote',
                chapterId: mainChapter.id,
                weeklyHours: 4,
                durationMonths: 4,
                description: 'Produce captivating visual and written content highlighting TATT initiatives across Africa and the Diaspora.',
                responsibilities: ['Draft spotlight articles', 'Create social graphics', 'Interview active members'],
                requiredSkills: ['Content Writing', 'Canva / Figma', 'Social Media Strategy'],
                spotsNeeded: 2,
                openUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                isActive: true,
                grade: 'Contributor',
                createdBy: volunteerUsers[0].id,
            },
            {
                name: 'Event Logistics Coordinator',
                location: 'In-Person (Regional)',
                chapterId: mainChapter.id,
                weeklyHours: 6,
                durationMonths: 3,
                description: 'Ensure seamless venue coordination, attendee check-in, and guest reception for regional mixers.',
                responsibilities: ['Coordinate venue staff', 'Manage attendee registration desk', 'Facilitate Q&A sessions'],
                requiredSkills: ['Event Operations', 'Logistics', 'Problem Solving'],
                spotsNeeded: 4,
                openUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                isActive: true,
                grade: 'Coordinator',
                createdBy: volunteerUsers[0].id,
            },
        ];

        const createdRoles: VolunteerRole[] = [];
        for (const r of dummyRoles) {
            let role = await VolunteerRole.findOne({ where: { name: r.name, chapterId: r.chapterId } });
            if (!role) {
                role = await VolunteerRole.create(r as any);
                console.log(`✅ Created Volunteer Role: ${role.name}`);
            } else {
                console.log(`ℹ️ Role already exists: ${role.name}`);
            }
            createdRoles.push(role);
        }

        // 4. Create Volunteer Applications
        const sampleApplications = [
            {
                userId: volunteerUsers[0].id,
                roleId: createdRoles[0].id,
                interestsAndSkills: ['Community Outreach', 'Mentorship', 'Leadership'],
                weeklyAvailability: { monday: ['17:00-19:00'], saturday: ['10:00-14:00'] },
                hoursAvailablePerWeek: 6,
                reasonForApplying: 'Driven to connect young African professionals and create sustainable impact.',
                phoneNumber: '+254712345678',
                status: ApplicationStatus.APPROVED,
            },
            {
                userId: volunteerUsers[1].id,
                roleId: createdRoles[1].id,
                interestsAndSkills: ['Graphic Design', 'Copywriting', 'Social Media'],
                weeklyAvailability: { tuesday: ['18:00-20:00'], thursday: ['18:00-20:00'] },
                hoursAvailablePerWeek: 4,
                reasonForApplying: 'Eager to leverage digital storytelling to amplify African innovation.',
                phoneNumber: '+254723456789',
                status: ApplicationStatus.APPROVED,
            },
            {
                userId: volunteerUsers[2].id,
                roleId: createdRoles[2].id,
                interestsAndSkills: ['Logistics', 'Event Planning', 'Operations'],
                weeklyAvailability: { friday: ['16:00-20:00'], saturday: ['09:00-17:00'] },
                hoursAvailablePerWeek: 8,
                reasonForApplying: 'Looking forward to organizing impactful in-person summits.',
                phoneNumber: '+254734567890',
                status: ApplicationStatus.INTERVIEW_SCHEDULED,
                interviewTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            },
            {
                userId: volunteerUsers[3].id,
                roleId: createdRoles[0].id,
                interestsAndSkills: ['Training', 'Education', 'Knowledge Hub'],
                weeklyAvailability: { wednesday: ['14:00-18:00'] },
                hoursAvailablePerWeek: 4,
                reasonForApplying: 'Excited to support volunteer onboarding and educational resources.',
                phoneNumber: '+254745678901',
                status: ApplicationStatus.PENDING,
            },
        ];

        for (const appData of sampleApplications) {
            const existing = await VolunteerApplication.findOne({
                where: { userId: appData.userId, roleId: appData.roleId }
            });
            if (!existing) {
                await VolunteerApplication.create(appData as any);
                console.log(`✅ Created Volunteer Application for User ID: ${appData.userId}`);
            }
        }

        // 5. Create Volunteer Stats for Active Volunteers
        const statsData = [
            {
                userId: volunteerUsers[0].id,
                totalHours: 42.5,
                impactPoints: 850,
                eventsCompleted: 8,
                attendanceRate: 98.0,
                currentRoleId: createdRoles[0].id,
                chapterRank: 1,
                chapterTotal: 15,
                rating: 4.9,
                ratingCount: 12,
                grade: VolunteerGrade.GOLD,
                status: VolunteerStatus.ACTIVE,
                certifications: [
                    { name: 'Pan-African Leadership & Governance', status: 'VERIFIED', issuedAt: '2025-11-10' },
                    { name: 'Community Emergency First Aid', status: 'VERIFIED', issuedAt: '2026-02-15' },
                ],
                phone: '+254712345678',
                languages: 'English, Swahili',
                emergencyContactName: 'Kofi Mensah (+254700000001)',
            },
            {
                userId: volunteerUsers[1].id,
                totalHours: 28.0,
                impactPoints: 520,
                eventsCompleted: 5,
                attendanceRate: 95.0,
                currentRoleId: createdRoles[1].id,
                chapterRank: 2,
                chapterTotal: 15,
                rating: 4.8,
                ratingCount: 8,
                grade: VolunteerGrade.SILVER,
                status: VolunteerStatus.ACTIVE,
                certifications: [
                    { name: 'Digital Content Strategy', status: 'VERIFIED', issuedAt: '2026-01-20' },
                ],
                phone: '+254723456789',
                languages: 'English, Yoruba',
                emergencyContactName: 'Bisi Okafor (+254700000002)',
            },
            {
                userId: volunteerUsers[2].id,
                totalHours: 14.5,
                impactPoints: 290,
                eventsCompleted: 3,
                attendanceRate: 92.0,
                currentRoleId: createdRoles[2].id,
                chapterRank: 4,
                chapterTotal: 15,
                rating: 4.7,
                ratingCount: 4,
                grade: VolunteerGrade.BRONZE,
                status: VolunteerStatus.TRAINING,
                certifications: [],
                phone: '+254734567890',
                languages: 'English, Arabic',
                emergencyContactName: 'Fatima Al-Mansoor (+254700000003)',
            },
        ];

        for (const stat of statsData) {
            const existing = await VolunteerStat.findOne({ where: { userId: stat.userId } });
            if (!existing) {
                await VolunteerStat.create(stat as any);
                console.log(`✅ Seeded Volunteer Stat for User ID: ${stat.userId}`);
            } else {
                await existing.update(stat as any);
                console.log(`ℹ️ Updated Volunteer Stat for User ID: ${stat.userId}`);
            }
        }

        // 6. Create Sample Activities
        const activitiesData = [
            {
                title: 'Led Nairobi Chapter Youth Leadership Workshop',
                description: 'Facilitated interactive breakout sessions for 45 young founders.',
                chapterId: mainChapter.id,
                assignedToId: volunteerUsers[0].id,
                dueDate: new Date('2026-08-15'),
                status: ActivityStatus.COMPLETED,
            },
            {
                title: 'Designed Pan-African Summit Social Media Campaign',
                description: 'Created 12 graphic assets generating 10,000+ organic impressions.',
                chapterId: mainChapter.id,
                assignedToId: volunteerUsers[1].id,
                dueDate: new Date('2026-08-20'),
                status: ActivityStatus.COMPLETED,
            },
        ];

        for (const act of activitiesData) {
            const existing = await VolunteerActivity.findOne({
                where: { assignedToId: act.assignedToId, title: act.title }
            });
            if (!existing) {
                await VolunteerActivity.create(act as any);
                console.log(`✅ Created Volunteer Activity: ${act.title}`);
            }
        }

        console.log('\n🎉 Dummy Volunteer Data Seeded Successfully!\n');
    } catch (error) {
        console.error('❌ Failed to seed volunteers:', error);
    } finally {
        await app.close();
    }
}

seedVolunteers();
