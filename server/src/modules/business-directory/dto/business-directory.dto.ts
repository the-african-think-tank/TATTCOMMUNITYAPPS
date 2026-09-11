import { IsString, IsEmail, IsNotEmpty, IsOptional, IsUrl, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateBusinessApplicationDto {
    @ApiProperty({ example: 'Onyx Collective' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Architecture & Design' })
    @IsString()
    @IsNotEmpty()
    category: string;

    @ApiProperty({ example: 2024 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty({ message: 'Founding year is required' })
    foundingYear: number;

    @ApiProperty({ example: 'https://onyx.com' })
    @Transform(({ value }) => value === '' ? null : value)
    @IsUrl({}, { message: 'Website must be a valid URL' })
    @IsNotEmpty({ message: 'Website or social link is required' })
    website: string;

    @ApiProperty({ example: 'Nairobi, Kenya' })
    @IsString()
    @IsNotEmpty({ message: 'Location is required' })
    locationText: string;

    @ApiProperty({ example: 'UUID of chapter' })
    @Transform(({ value }) => value === '' ? null : value)
    @IsUUID()
    @IsOptional()
    chapterId?: string;

    @ApiProperty({ example: 'We align by...' })
    @IsString()
    @IsNotEmpty({ message: 'Mission alignment statement is required' })
    missionAlignment: string;

    @ApiProperty({ example: '15% discount for members' })
    @IsString()
    @IsNotEmpty({ message: 'Offer description is required' })
    perkOffer: string;

    @ApiProperty({ example: 'https://link-to-logo.png' })
    @IsString()
    @IsNotEmpty({ message: 'Brand logo is required' })
    logoUrl: string;

    @ApiProperty({ example: 'Premium Partner' })
    @IsString()
    @IsOptional()
    tierRequested?: string;

    @ApiProperty({ example: 'contact@business.com' })
    @IsEmail({}, { message: 'Contact email must be a valid email address' })
    @IsNotEmpty({ message: 'Contact email is required' })
    contactEmail: string;

    @ApiProperty({ example: '+254123456789' })
    @IsString()
    @IsNotEmpty({ message: 'Contact phone number is required' })
    contactPhone: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty({ message: 'Contact name is required' })
    contactName: string;

    @ApiProperty({ example: true })
    @IsOptional()
    isVolunteer?: boolean;

    @ApiProperty({ example: 'We serve local entrepreneurs...' })
    @IsString()
    @IsNotEmpty({ message: 'Business description is required' })
    description: string;

    @ApiProperty({ example: 'Black-owned' })
    @IsString()
    @IsNotEmpty({ message: 'Ownership type is required' })
    ownershipType: string;

    @ApiProperty({ example: 'To support the community' })
    @IsString()
    @IsNotEmpty({ message: 'Partnership reason is required' })
    partnershipReason: string;

    @ApiProperty({ example: 'Percentage discount' })
    @IsString()
    @IsNotEmpty({ message: 'Benefit type is required' })
    benefitType: string;

    @ApiProperty({ example: '12 months' })
    @IsString()
    @IsNotEmpty({ message: 'Offer duration is required' })
    offerDuration: string;

    @ApiProperty({ example: 'Sponsorships' })
    @IsString()
    @IsNotEmpty({ message: 'Typical community engagement is required' })
    typicalEngagement: string;

    @ApiProperty({ example: 'Any other info' })
    @IsString()
    @IsOptional()
    additionalInfo?: string;

    @ApiProperty({ example: true })
    @IsNotEmpty({ message: 'You must agree to values alignment' })
    valuesAlignmentAgreed: boolean;

    @ApiProperty({ example: true })
    @IsNotEmpty({ message: 'You must agree to be contacted' })
    contactAgreed: boolean;
}

export class UpdateBusinessStatusDto {
    @ApiProperty({ enum: ['APPROVED', 'DECLINED', 'INACTIVE'] })
    @IsString()
    @IsNotEmpty()
    status: 'APPROVED' | 'DECLINED' | 'INACTIVE';

    @ApiProperty({ example: 'Missing documents' })
    @IsString()
    @IsOptional()
    adminNotes?: string;
}

export class UpdateBusinessAdminDto {
    @ApiProperty({ example: 'https://link-to-logo.png' })
    @IsString()
    @IsOptional()
    logoUrl?: string;

    @ApiProperty({ example: 'Onyx Collective' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: 'Architecture & Design' })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiProperty({ example: 'https://onyx.com' })
    @IsString()
    @IsOptional()
    website?: string;

    @ApiProperty({ example: 'Nairobi, Kenya' })
    @IsString()
    @IsOptional()
    locationText?: string;
}
