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
import { Event } from '../src/modules/events/entities/event.entity';
import { EventType } from '../src/modules/events/enums/event-type.enum';
import { Chapter } from '../src/modules/chapters/entities/chapter.entity';
import { EventChapter } from '../src/modules/events/entities/event-chapter.entity';

async function seedFutureEvents() {
    console.log('\n--- Seeding Future Events & Mixers ---');
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

    try {
        const chapters = await Chapter.findAll();
        const firstChapterId = chapters.length > 0 ? chapters[0].id : null;

        const futureEvents = [
            {
                title: 'TATT Pan-African Leadership & Business Summit 2026',
                description: 'Annual gathering of African business leaders, policy influencers, and entrepreneurs to discuss economic growth, cross-border trade, and strategic partnerships.',
                dateTime: new Date('2026-09-15T14:00:00.000Z'),
                timezone: 'Africa/Nairobi',
                type: EventType.EVENT,
                imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1000',
                basePrice: 0,
                isForAllMembers: true,
                address: 'Nairobi International Convention Center, Nairobi, Kenya',
            },
            {
                title: 'Pan-African Founders & Executives Mixer',
                description: 'An exclusive networking mixer connecting startup founders, C-suite executives, and investors across the continent and Diaspora.',
                dateTime: new Date('2026-09-28T18:00:00.000Z'),
                timezone: 'America/Los_Angeles',
                type: EventType.MIXER,
                imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&q=80&w=1000',
                basePrice: 25.00,
                isForAllMembers: true,
                address: 'Radisson Blu Hotel, Upper Hill, Nairobi',
            },
            {
                title: 'Diaspora Trade & Investment Masterclass',
                description: 'Interactive workshop focused on capital deployment, real estate acquisition, and cross-border commercial ventures in Africa.',
                dateTime: new Date('2026-10-10T15:00:00.000Z'),
                timezone: 'Africa/Johannesburg',
                type: EventType.WORKSHOP,
                imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=1000',
                basePrice: 0,
                isForAllMembers: true,
                address: 'Virtual Hub & Innovation Center, Johannesburg',
            },
            {
                title: 'TATT Young Professionals Evening Mixer',
                description: 'A relaxed evening of networking, music, and peer mentorship for emerging African professionals and innovators.',
                dateTime: new Date('2026-10-24T19:00:00.000Z'),
                timezone: 'Africa/Lagos',
                type: EventType.MIXER,
                imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1000',
                basePrice: 15.00,
                isForAllMembers: true,
                address: 'Skyline Lounge, Lagos, Nigeria',
            },
            {
                title: 'African Think Tank Tech & AI Innovation Expo 2026',
                description: 'Showcasing high-impact artificial intelligence, fintech, and digital transformation initiatives originating from African tech hubs.',
                dateTime: new Date('2026-11-12T10:00:00.000Z'),
                timezone: 'Africa/Accra',
                type: EventType.EVENT,
                imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000',
                basePrice: 50.00,
                isForAllMembers: true,
                address: 'Convention Center, Accra, Ghana',
            },
            {
                title: 'TATT Global End of Year Gala & Networking Mixer',
                description: 'Celebrate community achievements, network with global chapter members, and honor outstanding leaders of 2026.',
                dateTime: new Date('2026-12-18T18:30:00.000Z'),
                timezone: 'America/New_York',
                type: EventType.MIXER,
                imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1000',
                basePrice: 75.00,
                isForAllMembers: true,
                address: 'The Westin Grand Hotel, Atlanta, GA, USA',
            },
            {
                title: '2027 Strategic Policy & Economic Outlook Conference',
                description: 'A forward-looking summit analyzing economic trends, policy updates, and key investment opportunities across Africa for 2027.',
                dateTime: new Date('2027-01-20T13:00:00.000Z'),
                timezone: 'Etc/GMT+8',
                type: EventType.EVENT,
                imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000',
                basePrice: 0,
                isForAllMembers: true,
                address: 'Global Virtual Summit & Headquarters Hub',
            },
        ];

        for (const item of futureEvents) {
            const { address, ...eventData } = item;
            const [event, created] = await Event.findOrCreate({
                where: { title: eventData.title },
                defaults: eventData as any,
            });

            if (!created) {
                await event.update(eventData);
                console.log(`- Updated future event: ${event.title} (${event.dateTime.toISOString().split('T')[0]})`);
            } else {
                console.log(`- Created future event: ${event.title} (${event.dateTime.toISOString().split('T')[0]})`);
            }

            if (firstChapterId && address) {
                await EventChapter.findOrCreate({
                    where: { eventId: event.id, chapterId: firstChapterId },
                    defaults: {
                        eventId: event.id,
                        chapterId: firstChapterId,
                        address,
                    },
                });
            }
        }

        console.log('\nFuture events and mixers seeded successfully.');
    } catch (error) {
        console.error('Seeding future events failed:', error);
    } finally {
        await app.close();
    }
}

seedFutureEvents();
