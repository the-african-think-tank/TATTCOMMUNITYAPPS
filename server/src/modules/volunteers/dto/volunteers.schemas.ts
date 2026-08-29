import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '../entities/volunteer-application.entity';
import { ActivityStatus } from '../entities/volunteer-activity.entity';
import { VolunteerGrade } from '../entities/volunteer-stat.entity';

export class VolunteerRoleSchema {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Youth Mentor' })
    name: string;

    @ApiProperty({ example: 'Accra, Ghana' })
    location: string;

    @ApiProperty({ example: 4 })
    weeklyHours: number;

    @ApiProperty({ example: 6 })
    durationMonths: number;

    @ApiProperty({ example: 'Support local youth in their career development.' })
    description: string;

    @ApiProperty({ type: [String] })
    responsibilities: string[];

    @ApiProperty({ type: [String] })
    requiredSkills: string[];



    @ApiProperty()
    openUntil: Date;

    @ApiProperty()
    isActive: boolean;
}

export class VolunteerApplicationSchema {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ enum: ApplicationStatus })
    status: ApplicationStatus;

    @ApiProperty({ type: [String] })
    interestsAndSkills: string[];

    @ApiProperty()
    weeklyAvailability: any;

    @ApiProperty()
    hoursAvailablePerWeek: number;

    @ApiProperty()
    reasonForApplying: string;

    @ApiProperty({ required: false })
    questionsForAdmin?: string;

    @ApiProperty({ required: false })
    interviewTime?: Date;

    @ApiProperty({ required: false })
    adminNotes?: string;
}

export class VolunteerActivitySchema {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Organize Chapter Meetup' })
    title: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    dueDate: Date;

    @ApiProperty({ example: 5 })
    estimatedHours: number;

    @ApiProperty({ example: 50 })
    impactPoints: number;

    @ApiProperty({ enum: ActivityStatus })
    status: ActivityStatus;

    @ApiProperty({ required: false })
    declineReason?: string;
}

export class VolunteerStatSchema {
    @ApiProperty({ example: 45.5 })
    totalHours: number;

    @ApiProperty({ example: 250 })
    impactPoints: number;

    @ApiProperty({ enum: VolunteerGrade })
    grade: VolunteerGrade;
}

export class TrainingResourceSchema {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty()
    title: string;

    @ApiProperty()
    content: string;

    @ApiProperty({ type: [String] })
    mediaUrls: string[];
}

export class VolunteerMessageResponseSchema {
    @ApiProperty({ example: 'Success' })
    message: string;
}
