import {
    IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsUrl,
    IsInt, Min, Max, MaxLength, ArrayMaxSize, IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType, ResourceVisibility } from '../entities/resource.entity';
import { CommunityTier } from '../../iam/enums/roles.enum';

// ─── CREATE RESOURCE ─────────────────────────────────────────────────────────

export class CreateResourceDto {
    @ApiProperty({ description: 'Name of the resource/partnership', example: 'Legal Guide: Contracts 101', maxLength: 255 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title: string;

    @ApiProperty({ enum: ResourceType, description: 'Resource type: GUIDE | DOCUMENT | VIDEO | PARTNERSHIP' })
    @IsEnum(ResourceType)
    type: ResourceType;

    @ApiPropertyOptional({ description: 'Brief summary (HTML supported)', example: '<p>Essential contract clauses for startups.</p>', maxLength: 1000 })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({ description: 'URL to document, video, or partnership portal', example: 'https://example.com/guide' })
    @IsOptional()
    @IsUrl()
    contentUrl?: string;

    @ApiPropertyOptional({ description: 'Cover image URL for the resource card', example: 'https://example.com/thumb.jpg' })
    @IsOptional()
    @IsUrl()
    thumbnailUrl?: string;

    @ApiPropertyOptional({ description: 'Limit to a specific chapter (UUID). Omit for global resource.', example: 'b2c9f1a0-4e8d-4f71-bf14-01e23f4a5678' })
    @IsOptional()
    @IsString()
    chapterId?: string;

    @ApiPropertyOptional({
        enum: ResourceVisibility,
        default: ResourceVisibility.PUBLIC,
        description: 'PUBLIC = everyone sees card in list; RESTRICTED = only eligible tier (and chapter if set) sees card.',
    })
    @IsOptional()
    @IsEnum(ResourceVisibility)
    visibility?: ResourceVisibility = ResourceVisibility.PUBLIC;

    @ApiPropertyOptional({
        enum: CommunityTier,
        default: CommunityTier.FREE,
        description: 'Minimum tier required to see (RESTRICTED) or access this resource. FREE < UBUNTU < IMANI < KIONGOZI.',
    })
    @IsOptional()
    @IsEnum(CommunityTier)
    minTier?: CommunityTier = CommunityTier.FREE;

    @ApiPropertyOptional({ type: [String], description: 'Specific allowed membership tiers' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    allowedTiers?: string[];

    @ApiPropertyOptional({ type: [String], description: 'Topics for categorization', example: ['Legal', 'Tech', 'Deals'], maxItems: 20 })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    tags?: string[] = [];

    @ApiPropertyOptional({ description: 'Type-specific data (e.g. video duration, partnership expiry)' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

// ─── UPDATE RESOURCE ─────────────────────────────────────────────────────────

export class UpdateResourceDto {
    @ApiPropertyOptional({ description: 'Name of the resource/partnership', maxLength: 255 })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string;

    @ApiPropertyOptional({ enum: ResourceType })
    @IsOptional()
    @IsEnum(ResourceType)
    type?: ResourceType;

    @ApiPropertyOptional({ description: 'Brief summary (HTML supported)', maxLength: 1000 })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({ description: 'URL to document, video, or partnership portal' })
    @IsOptional()
    @IsUrl()
    contentUrl?: string;

    @ApiPropertyOptional({ description: 'Cover image URL for the resource card' })
    @IsOptional()
    @IsUrl()
    thumbnailUrl?: string;

    @ApiPropertyOptional({ description: 'Chapter UUID; set to null to make global' })
    @IsOptional()
    @IsString()
    chapterId?: string;

    @ApiPropertyOptional({ enum: ResourceVisibility })
    @IsOptional()
    @IsEnum(ResourceVisibility)
    visibility?: ResourceVisibility;

    @ApiPropertyOptional({ enum: CommunityTier })
    @IsOptional()
    @IsEnum(CommunityTier)
    minTier?: CommunityTier;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    allowedTiers?: string[];

    @ApiPropertyOptional({ type: [String], maxItems: 20 })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    tags?: string[];

    @ApiPropertyOptional({ description: 'Type-specific metadata' })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

// ─── LIST QUERY ──────────────────────────────────────────────────────────────

export class ResourceListQueryDto {
    @ApiPropertyOptional({ enum: ResourceType, description: 'Filter by resource type' })
    @IsOptional()
    @IsEnum(ResourceType)
    type?: ResourceType;

    @ApiPropertyOptional({ description: 'Filter by chapter UUID' })
    @IsOptional()
    @IsString()
    chapterId?: string;

    @ApiPropertyOptional({ description: 'Filter by tag (e.g. Legal, Tech)' })
    @IsOptional()
    @IsString()
    tag?: string;

    @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Results per page (1–50)', example: 20, minimum: 1, maximum: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 20;
}
