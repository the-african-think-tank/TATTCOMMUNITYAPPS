import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory } from '../entities/support-ticket.entity';
import { FaqCategory } from '../entities/support-faq.entity';

export class CreateTicketDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    subject: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ enum: TicketCategory })
    @IsEnum(TicketCategory)
    category: TicketCategory;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    attachments?: string[];
}

export class ResolveTicketDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    adminNotes?: string;
}

export class CreateFaqDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    question: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    answer: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class CreateCategoryDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    category: string;
}

export class UpdateCategoryDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    category: string;
}

export class DeleteCategoryDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    targetCategoryId?: string;
}
