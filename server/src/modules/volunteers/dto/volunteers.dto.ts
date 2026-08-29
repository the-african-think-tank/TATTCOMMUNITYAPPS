import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsArray, IsUUID, IsDateString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApplicationStatus } from '../entities/volunteer-application.entity';
import { ActivityStatus } from '../entities/volunteer-activity.entity';
import { VolunteerGrade, VolunteerStatus } from '../entities/volunteer-stat.entity';

export class CreateVolunteerRoleDto {
    @ApiProperty({ example: 'Youth Mentor' })
    @IsString() @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Accra, Ghana' })
    @IsString() @IsNotEmpty()
    location: string;

    @ApiProperty({ example: 'uuid-of-chapter' })
    @IsUUID() @IsNotEmpty()
    chapterId: string;

    @ApiProperty({ example: 4 })
    @IsInt() @IsNotEmpty()
    weeklyHours: number;

    @ApiProperty({ example: 6 })
    @IsInt() @IsNotEmpty()
    durationMonths: number;

    @ApiProperty({ example: 'Support local youth in their career development.' })
    @IsString() @IsNotEmpty()
    description: string;

    @ApiProperty({ example: ['Hold weekly sessions', 'Review resumes'] })
    @IsArray() @IsString({ each: true })
    responsibilities: string[];

    @ApiProperty({ example: ['Communication', 'Career Coaching'] })
    @IsArray() @IsString({ each: true })
    requiredSkills: string[];

    @ApiProperty({ example: '2026-12-31' })
    @IsDateString() @IsNotEmpty()
    openUntil: string;

    @ApiPropertyOptional({ example: 'Lead' })
    @IsString() @IsOptional()
    grade?: string;
}

export class ApplyVolunteerDto {
    @ApiPropertyOptional({ example: 'uuid-of-role' })
    @IsUUID() @IsOptional()
    roleId?: string;

    @ApiProperty({ example: ['Project Management', 'Public Speaking'] })
    @IsArray() @IsString({ each: true })
    interestsAndSkills: string[];

    @ApiProperty({ example: { monday: ['09:00-12:00'] } })
    @IsNotEmpty()
    weeklyAvailability: any;

    @ApiProperty({ example: 10 })
    @IsInt() @IsNotEmpty()
    hoursAvailablePerWeek: number;

    @ApiProperty({ example: 'I want to give back to my community.' })
    @IsString() @IsNotEmpty()
    reasonForApplying: string;

    @ApiPropertyOptional({ example: 'How do I access training?' })
    @IsString() @IsOptional()
    questionsForAdmin?: string;

    @ApiPropertyOptional({ example: '+233 24 000 0000' })
    @IsString() @IsOptional()
    phoneNumber?: string;

    @ApiPropertyOptional({ example: '1995-12-31' })
    @IsDateString() @IsOptional()
    birthDate?: string;
}

export class UpdateApplicationStatusDto {
    @ApiProperty({ enum: ApplicationStatus })
    @IsEnum(ApplicationStatus)
    status: ApplicationStatus;

    @ApiPropertyOptional()
    @IsDateString() @IsOptional()
    interviewTime?: string;

    @ApiPropertyOptional()
    @IsString() @IsOptional()
    adminNotes?: string;
}

export class CreateActivityDto {
    @ApiProperty({ example: 'Organize Chapter Meetup' })
    @IsString() @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'Plan and coordinate the next chapter meeting.' })
    @IsString() @IsNotEmpty()
    description: string;

    @ApiProperty({ example: 'uuid-of-chapter' })
    @IsUUID() @IsNotEmpty()
    chapterId: string;

    @ApiProperty({ example: 'uuid-of-volunteer' })
    @IsUUID() @IsNotEmpty()
    assignedToId: string;

    @ApiProperty({ example: '2026-03-15' })
    @IsDateString() @IsNotEmpty()
    dueDate: string;

    @ApiProperty({ example: 5 })
    @IsInt() @IsNotEmpty()
    estimatedHours: number;

    @ApiProperty({ example: 50 })
    @IsInt() @IsNotEmpty()
    impactPoints: number;
}

export class UpdateActivityStatusDto {
    @ApiProperty({ enum: ActivityStatus })
    @IsEnum(ActivityStatus)
    status: ActivityStatus;

    @ApiPropertyOptional()
    @IsString() @IsOptional()
    declineReason?: string;
}

export class CreateTrainingResourceDto {
    @ApiProperty({ example: 'Volunteer Handbook' })
    @IsString() @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'Detailed instructions on platform use.' })
    @IsString() @IsNotEmpty()
    content: string;

    @ApiPropertyOptional({ example: ['https://s3.amazon.com/training.pdf'] })
    @IsArray() @IsString({ each: true }) @IsOptional()
    mediaUrls?: string[];
}

export class AddVolunteerFeedbackDto {
    @ApiProperty({ example: 4 })
    @IsInt() @IsNotEmpty()
    rating: number;

    @ApiProperty({ example: 'Great job!' })
    @IsString() @IsNotEmpty()
    comment: string;

    @ApiPropertyOptional({ example: 'Food Drive' })
    @IsString() @IsOptional()
    eventLabel?: string;
}

export class UpdateVolunteerStatsDto {
    @ApiPropertyOptional()
    @IsOptional()
    totalHours?: number;

    @ApiPropertyOptional()
    @IsOptional()
    impactPoints?: number;

    @ApiPropertyOptional()
    @IsOptional()
    eventsCompleted?: number;

    @ApiPropertyOptional()
    @IsOptional()
    attendanceRate?: number;

    @ApiPropertyOptional({ enum: VolunteerGrade })
    @IsEnum(VolunteerGrade)
    @IsOptional()
    grade?: VolunteerGrade;

    @ApiPropertyOptional({ enum: VolunteerStatus })
    @IsEnum(VolunteerStatus)
    @IsOptional()
    status?: VolunteerStatus;

    @ApiPropertyOptional()
    @IsOptional()
    certifications?: any[];

    @ApiPropertyOptional()
    @IsString() @IsOptional()
    phone?: string;

    @ApiPropertyOptional()
    @IsString() @IsOptional()
    languages?: string;

    @ApiPropertyOptional()
    @IsString() @IsOptional()
    emergencyContactName?: string;

    @ApiPropertyOptional()
    @IsString() @IsOptional()
    emergencyContactRelation?: string;

    @ApiPropertyOptional()
    @IsString() @IsOptional()
    emergencyContactPhone?: string;

    @ApiPropertyOptional()
    @IsString() @IsOptional()
    adminNotes?: string;

    @ApiPropertyOptional()
    @IsUUID() @IsOptional()
    currentRoleId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    rating?: number;
}
