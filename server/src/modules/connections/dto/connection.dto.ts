import { IsString, IsUUID, IsNotEmpty, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConnectionStatus } from '../entities/connection.entity';

// ─── REQUEST DTOs ─────────────────────────────────────────────────────────────

export class SendConnectionRequestDto {
    @ApiProperty({
        description: 'UUID of the member you want to connect with',
        example: 'b2c9f1a0-4e8d-4f71-bf14-01e23f4a5678',
        format: 'uuid',
    })
    @IsUUID()
    @IsNotEmpty()
    recipientId: string;

    @ApiProperty({
        description:
            'A personalised message to accompany the request — this is shown to the recipient so they can decide whether to connect.',
        example: 'Hi Jane, I would love to connect!',
        minLength: 1,
        maxLength: 500,
    })
    @IsString()
    @IsNotEmpty({ message: 'Your connection message is required.' })
    @MinLength(1, { message: 'Your connection message is required.' })
    @MaxLength(500, { message: 'Your connection message cannot exceed 500 characters.' })
    message: string;
}

export class RespondToConnectionDto {
    @ApiProperty({
        description: 'Your decision on the connection request.',
        enum: [ConnectionStatus.ACCEPTED, ConnectionStatus.DECLINED],
        example: ConnectionStatus.ACCEPTED,
    })
    @IsEnum([ConnectionStatus.ACCEPTED, ConnectionStatus.DECLINED], {
        message: 'Response must be either ACCEPTED or DECLINED.',
    })
    status: ConnectionStatus.ACCEPTED | ConnectionStatus.DECLINED;
}

// ─── RESPONSE SCHEMAS (for Swagger documentation only) ───────────────────────

export class MemberSummarySchema {
    @ApiProperty({ example: 'b2c9f1a0-4e8d-4f71-bf14-01e23f4a5678', format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Jane' })
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    lastName: string;

    @ApiProperty({ example: 'https://cdn.example.com/avatars/jane.jpg', nullable: true })
    profilePicture: string | null;

    @ApiProperty({ example: 'Senior Strategy Consultant', nullable: true })
    professionTitle: string | null;

    @ApiProperty({ example: 'AfriGrowth Capital', nullable: true })
    companyName: string | null;

    @ApiProperty({ example: 'Nairobi, Kenya', nullable: true })
    location: string | null;

    @ApiProperty({ example: 'TATT-NBO-0042' })
    tattMemberId: string;

    @ApiProperty({ example: 'UBUNTU', enum: ['FREE', 'UBUNTU', 'IMANI', 'KIONGOZI'] })
    communityTier: string;
}

export class NetworkConnectionSchema {
    @ApiProperty({ example: 'c3d4e5f6-0001-4444-aaaa-bbbbccccdddd', format: 'uuid' })
    connectionId: string;

    @ApiProperty({ example: '2026-02-20T10:30:00.000Z', format: 'date-time' })
    connectedSince: string;

    @ApiProperty({ type: () => MemberSummarySchema })
    member: MemberSummarySchema;
}

export class IncomingRequestSchema {
    @ApiProperty({ example: 'a1b2c3d4-eeee-ffff-0000-111122223333', format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Hi Jane, I loved your Nairobi summit talk!', minLength: 20, maxLength: 500 })
    message: string;

    @ApiProperty({ example: 'PENDING', enum: Object.values(ConnectionStatus) })
    status: ConnectionStatus;

    @ApiProperty({ example: '2026-02-22T08:00:00.000Z', format: 'date-time' })
    createdAt: string;

    @ApiProperty({ type: () => MemberSummarySchema })
    requester: MemberSummarySchema;
}

export class SentRequestSchema {
    @ApiProperty({ example: 'd4e5f6a7-1111-2222-3333-444455556666', format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Hi John! Let\'s connect through TATT.', minLength: 20, maxLength: 500 })
    message: string;

    @ApiProperty({ example: 'PENDING', enum: Object.values(ConnectionStatus) })
    status: ConnectionStatus;

    @ApiProperty({ example: '2026-02-21T14:00:00.000Z', format: 'date-time' })
    createdAt: string;

    @ApiProperty({ type: () => MemberSummarySchema })
    recipient: MemberSummarySchema;
}

export class ConnectionStatusSchema {
    @ApiProperty({
        description: 'Current relationship status from the perspective of the calling user',
        enum: [...Object.values(ConnectionStatus), 'NOT_CONNECTED'],
        example: 'PENDING',
    })
    status: string;

    @ApiProperty({ example: 'a1b2c3d4-eeee-ffff-0000-111122223333', format: 'uuid', nullable: true })
    connectionId: string | null;

    @ApiProperty({
        description: 'Who initiated the request — only present when a request exists',
        enum: ['ME', 'THEM'],
        example: 'ME',
        required: false,
        nullable: true,
    })
    initiatedBy?: 'ME' | 'THEM';
}

export class ConnectionMessageResponseSchema {
    @ApiProperty({ example: 'Connection request sent successfully.' })
    message: string;

    @ApiProperty({ example: 'c3d4e5f6-0001-4444-aaaa-bbbbccccdddd', format: 'uuid', required: false })
    connectionId?: string;
}
