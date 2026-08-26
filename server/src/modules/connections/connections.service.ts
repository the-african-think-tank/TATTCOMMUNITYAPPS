import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { Connection, ConnectionStatus } from './entities/connection.entity';
import { User } from '../iam/entities/user.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { CommunityTier, ConnectionPreference } from '../iam/enums/roles.enum';
import { ProfessionalInterest } from '../interests/entities/interest.entity';
import { CommunityIndustry } from '../industries/entities/industry.entity';
import { Post } from '../feed/entities/post.entity';
import { SendConnectionRequestDto, RespondToConnectionDto } from './dto/connection.dto';
import { MailService } from '../../common/mail/mail.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

/** Paid tiers that can initiate connection requests */
const PAID_TIERS: CommunityTier[] = [
    CommunityTier.UBUNTU,
    CommunityTier.IMANI,
    CommunityTier.KIONGOZI,
];

@Injectable()
export class ConnectionsService {
    constructor(
        @InjectModel(Connection) private connectionRepo: typeof Connection,
        @InjectModel(User) private userRepo: typeof User,
        private mailService: MailService,
        private notificationsService: NotificationsService,
    ) { }

    // ─── GUARD: Ensure requesting user is a paid member ─────────────────────────
    private assertPaidMember(user: User) {
        if (!PAID_TIERS.includes(user.communityTier)) {
            throw new ForbiddenException(
                'Only paid TATT members (Ubuntu, Imani or Kiongozi tier) can send connection requests.',
            );
        }
    }

    // ─── SEND CONNECTION REQUEST ─────────────────────────────────────────────────
    async sendRequest(requester: User, dto: SendConnectionRequestDto) {
        this.assertPaidMember(requester);

        if (requester.id === dto.recipientId) {
            throw new BadRequestException('You cannot send a connection request to yourself.');
        }

        const recipient = await this.userRepo.findByPk(dto.recipientId, {
            attributes: ['id', 'firstName', 'lastName', 'email', 'communityTier', 'isActive'],
        });

        if (!recipient || !recipient.isActive) {
            throw new NotFoundException('The member you are trying to connect with was not found.');
        }

        // Check for an existing active (non-withdrawn/non-declined) request between the pair
        const existing = await this.connectionRepo.findOne({
            where: {
                [Op.or]: [
                    { requesterId: requester.id, recipientId: dto.recipientId },
                    { requesterId: dto.recipientId, recipientId: requester.id },
                ],
                status: {
                    [Op.notIn]: [ConnectionStatus.DECLINED, ConnectionStatus.WITHDRAWN],
                },
            },
        });

        if (existing) {
            if (existing.status === ConnectionStatus.ACCEPTED) {
                throw new ConflictException('You are already connected with this member.');
            }
            throw new ConflictException('A pending connection request already exists between you and this member.');
        }

        const connection = await this.connectionRepo.create({
            requesterId: requester.id,
            recipientId: dto.recipientId,
            message: dto.message,
            status: ConnectionStatus.PENDING,
        });

        // Notify the recipient via email (non-blocking)
        this.mailService
            .sendConnectionRequest(
                recipient.email,
                recipient.firstName,
                `${requester.firstName} ${requester.lastName}`,
                dto.message,
            )
            .catch(() => { /* Silently swallow — connection was still created */ });

        // In-app notification
        this.notificationsService.create(
            dto.recipientId,
            NotificationType.CONNECTION_REQUEST,
            'New Connection Request',
            `${requester.firstName} ${requester.lastName} wants to connect with you.`,
            { connectionId: connection.id, requesterId: requester.id },
            false // Email already sent above
        ).catch(() => { });

        return {
            message: 'Connection request sent successfully.',
            connectionId: connection.id,
        };
    }

    // ─── RESPOND TO A REQUEST (ACCEPT / DECLINE) ─────────────────────────────────
    async respondToRequest(currentUser: User, connectionId: string, dto: RespondToConnectionDto) {
        const connection = await this.connectionRepo.findByPk(connectionId);

        if (!connection) {
            throw new NotFoundException('Connection request not found.');
        }

        if (connection.recipientId !== currentUser.id) {
            throw new ForbiddenException('You are not authorised to respond to this connection request.');
        }

        if (connection.status !== ConnectionStatus.PENDING) {
            throw new BadRequestException(
                `This request has already been ${connection.status.toLowerCase()} and cannot be updated.`,
            );
        }

        connection.status = dto.status;
        await connection.save();

        if (dto.status === ConnectionStatus.ACCEPTED) {
            this.notificationsService.create(
                connection.requesterId,
                NotificationType.CONNECTION_ACCEPTED,
                'Connection Request Accepted',
                `${currentUser.firstName} ${currentUser.lastName} accepted your connection request.`,
                { connectionId: connection.id, partnerId: currentUser.id },
                true // Notify via email as well
            ).catch(() => { });
        }

        return {
            message: `Connection request ${dto.status.toLowerCase()} successfully.`,
        };
    }

    // ─── WITHDRAW A SENT REQUEST ─────────────────────────────────────────────────
    async withdrawRequest(currentUser: User, connectionId: string) {
        const connection = await this.connectionRepo.findByPk(connectionId);

        if (!connection) {
            throw new NotFoundException('Connection request not found.');
        }

        if (connection.requesterId !== currentUser.id) {
            throw new ForbiddenException('You can only withdraw your own connection requests.');
        }

        if (connection.status !== ConnectionStatus.PENDING) {
            throw new BadRequestException(
                `You can only withdraw pending requests. This request is already ${connection.status.toLowerCase()}.`,
            );
        }

        connection.status = ConnectionStatus.WITHDRAWN;
        await connection.save();

        return { message: 'Connection request withdrawn.' };
    }

    // ─── REMOVE A CONNECTION (DISCONNECT) ────────────────────────────────────────
    async removeConnection(currentUser: User, connectionId: string) {
        const connection = await this.connectionRepo.findByPk(connectionId);

        if (!connection) {
            throw new NotFoundException('Connection not found.');
        }

        const isParticipant =
            connection.requesterId === currentUser.id ||
            connection.recipientId === currentUser.id;

        if (!isParticipant) {
            throw new ForbiddenException('You are not part of this connection.');
        }

        if (connection.status !== ConnectionStatus.ACCEPTED) {
            throw new BadRequestException('You can only remove an active connection.');
        }

        await connection.destroy();

        return { message: 'Connection removed successfully.' };
    }

    // ─── GET MY NETWORK (ACCEPTED CONNECTIONS) ───────────────────────────────────
    async getMyNetwork(currentUser: User) {
        const connections = await this.connectionRepo.findAll({
            where: {
                [Op.or]: [
                    { requesterId: currentUser.id },
                    { recipientId: currentUser.id },
                ],
                status: ConnectionStatus.ACCEPTED,
            },
            include: [
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle', 'companyName', 'location', 'tattMemberId', 'communityTier'],
                },
                {
                    model: User,
                    as: 'recipient',
                    attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle', 'companyName', 'location', 'tattMemberId', 'communityTier'],
                },
            ],
        });

        // Normalise: return the "other person" in each connection from the perspective of currentUser
        return connections.map((conn) => {
            const connectedMember =
                conn.requesterId === currentUser.id ? conn.recipient : conn.requester;
            return {
                connectionId: conn.id,
                connectedSince: conn.updatedAt,
                member: connectedMember,
            };
        });
    }

    // ─── GET PENDING REQUESTS (INCOMING) ─────────────────────────────────────────
    async getIncomingRequests(currentUser: User) {
        return this.connectionRepo.findAll({
            where: {
                recipientId: currentUser.id,
                status: ConnectionStatus.PENDING,
            },
            include: [
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle', 'companyName', 'location', 'tattMemberId', 'communityTier'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    // ─── GET SENT REQUESTS (OUTGOING) ────────────────────────────────────────────
    async getSentRequests(currentUser: User) {
        return this.connectionRepo.findAll({
            where: {
                requesterId: currentUser.id,
                status: ConnectionStatus.PENDING,
            },
            include: [
                {
                    model: User,
                    as: 'recipient',
                    attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle', 'companyName', 'location', 'tattMemberId', 'communityTier'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    // ─── CHECK CONNECTION STATUS WITH A SPECIFIC MEMBER ─────────────────────────
    async getConnectionStatus(currentUser: User, memberId: string) {
        const connection = await this.connectionRepo.findOne({
            where: {
                [Op.or]: [
                    { requesterId: currentUser.id, recipientId: memberId },
                    { requesterId: memberId, recipientId: currentUser.id },
                ],
            },
            order: [['createdAt', 'DESC']],
        });

        if (!connection) {
            return { status: 'NOT_CONNECTED', connectionId: null };
        }

        return {
            status: connection.status,
            connectionId: connection.id,
            initiatedBy: connection.requesterId === currentUser.id ? 'ME' : 'THEM',
        };
    }

    // ─── GET ALL MEMBERS (DIRECTORY) ─────────────────────────────────────────────
    async getAllMembers(query: any, currentUser?: User) {
        const { search, chapterId, industry, page, limit } = query;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const requestingUserId = currentUser?.id;
        const requestingUserChapterId = currentUser?.chapterId;

        const where: any = {
            isActive: true,
            ...(requestingUserId ? { id: { [Op.ne]: requestingUserId } } : {}),
        };

        const andConditions: any[] = [];

        // 1. Connection Preferences Logic
        andConditions.push({
            [Op.or]: [
                { connectionPreference: ConnectionPreference.OPEN },
                { connectionPreference: null },
                { connectionPreference: ConnectionPreference.CHAPTER_ONLY, chapterId: null },
                ...(requestingUserChapterId ? [{
                    connectionPreference: ConnectionPreference.CHAPTER_ONLY,
                    chapterId: requestingUserChapterId,
                }] : []),
            ],
        });

        // 2. Filters
        if (chapterId) {
            andConditions.push({ chapterId });
        }

        if (industry) {
            // Note: If this fails, it might be the association name or column naming.
            andConditions.push({ '$industry.name$': industry });
        }

        if (search) {
            const cleanSearch = search.trim();
            const searchTerms = cleanSearch.split(/\s+/).filter(Boolean);

            let tierSearch = cleanSearch.toUpperCase();
            if (tierSearch === "SANKOFA") tierSearch = "FREE";

            const searchOrConditions: any[] = [
                { firstName: { [Op.iLike]: `%${cleanSearch}%` } },
                { lastName: { [Op.iLike]: `%${cleanSearch}%` } },
                { professionTitle: { [Op.iLike]: `%${cleanSearch}%` } },
                { companyName: { [Op.iLike]: `%${cleanSearch}%` } },
                Sequelize.where(
                    Sequelize.cast(Sequelize.col('User.communityTier'), 'text'),
                    { [Op.iLike]: `%${tierSearch}%` }
                ),
                Sequelize.where(
                    Sequelize.fn('concat', Sequelize.col('User.firstName'), ' ', Sequelize.col('User.lastName')),
                    { [Op.iLike]: `%${cleanSearch}%` }
                )
            ];

            if (searchTerms.length > 1) {
                const termConditions = searchTerms.map(term => {
                    const cleanTerm = term.toUpperCase() === 'SANKOFA' ? 'FREE' : term;
                    return {
                        [Op.or]: [
                            { firstName: { [Op.iLike]: `%${term}%` } },
                            { lastName: { [Op.iLike]: `%${term}%` } },
                            { professionTitle: { [Op.iLike]: `%${term}%` } },
                            { companyName: { [Op.iLike]: `%${term}%` } },
                            Sequelize.where(
                                Sequelize.cast(Sequelize.col('User.communityTier'), 'text'),
                                { [Op.iLike]: `%${cleanTerm}%` }
                            ),
                        ]
                    };
                });
                searchOrConditions.push({ [Op.and]: termConditions });
            }

            andConditions.push({ [Op.or]: searchOrConditions });
        }

        if (andConditions.length > 0) {
            where[Op.and] = andConditions;
        }

        try {
            const { rows: members, count: total } = await this.userRepo.findAndCountAll({
                where,
                attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'professionTitle', 'companyName', 'location', 'tattMemberId', 'communityTier', 'industryId', 'chapterId'],
                include: [
                    {
                        model: Chapter,
                        as: 'chapter',
                        attributes: ['id', 'name', 'code'],
                        required: false,
                    },
                    {
                        model: CommunityIndustry,
                        as: 'industry',
                        attributes: ['id', 'name'],
                        required: false,
                    }
                ],
                limit: limitNum,
                offset,
                order: [['createdAt', 'DESC']],
                subQuery: false,
                distinct: true,
            });

            return {
                members,
                meta: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum),
                },
            };
        } catch (error) {
            throw error;
        }
    }

    // ─── GET MEMBER PUBLIC PROFILE ────────────────────────────────────────────────
    async getMemberProfile(memberId: string) {
        try {
            const member = await this.userRepo.findByPk(memberId, {
                attributes: [
                    'id', 'firstName', 'lastName', 'profilePicture', 'professionTitle',
                    'companyName', 'location', 'tattMemberId', 'communityTier',
                    'chapterId', 'professionalHighlight', 'isActive', 'linkedInProfileUrl',
                    'connectionPreference', 'expertise', 'businessName', 'businessRole',
                    'businessProfileLink', 'createdAt'
                ],
                include: [
                    {
                        model: Chapter,
                        as: 'chapter',
                        attributes: ['id', 'name', 'code'],
                        required: false,
                    },
                    {
                        model: CommunityIndustry,
                        as: 'industry',
                        attributes: ['id', 'name'],
                        required: false,
                    },
                    {
                        model: ProfessionalInterest,
                        as: 'interests',
                        attributes: ['name'],
                        through: { attributes: [] },
                        required: false,
                    },
                    {
                        model: Post,
                        as: 'posts',
                        required: false,
                        attributes: ['id', 'content', 'createdAt'],
                        limit: 5,
                        order: [['createdAt', 'DESC']]
                    }
                ],
            });

            if (!member || !member.isActive) {
                throw new NotFoundException('Member not found.');
            }

            const connectionCount = await this.connectionRepo.count({
                where: {
                    [Op.or]: [{ requesterId: memberId }, { recipientId: memberId }],
                    status: ConnectionStatus.ACCEPTED
                }
            });

            const memberData = member.toJSON();
            return {
                ...memberData,
                connectionCount
            };
        } catch (error) {
            console.error('[ConnectionsService] Error fetching member profile:', error);
            throw error;
        }
    }
}
