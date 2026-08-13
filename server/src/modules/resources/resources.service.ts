import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { Resource, ResourceVisibility } from './entities/resource.entity';
import { ResourceInteraction, ResourceInteractionAction } from './entities/resource-interaction.entity';
import { User } from '../iam/entities/user.entity';
import { CommunityTier, SystemRole } from '../iam/enums/roles.enum';
import { CreateResourceDto, UpdateResourceDto, ResourceListQueryDto } from './dto/resources.dto';

// ─── Tier hierarchy: FREE < UBUNTU < IMANI < KIONGOZI ─────────────────────────

const TIER_ORDER: Record<CommunityTier, number> = {
    [CommunityTier.FREE]: 0,
    [CommunityTier.UBUNTU]: 1,
    [CommunityTier.IMANI]: 2,
    [CommunityTier.KIONGOZI]: 3,
};

function tierOrder(tier: CommunityTier): number {
    return TIER_ORDER[tier] ?? 0;
}

/** True if user's tier is at least the resource's minTier */
function meetsTierRequirement(userTier: CommunityTier, resourceMinTier: CommunityTier): boolean {
    return tierOrder(userTier) >= tierOrder(resourceMinTier);
}

/** Content admin roles: full CRUD and visibility/access rules */
const CONTENT_ADMIN_ROLES: SystemRole[] = [
    SystemRole.CONTENT_ADMIN,
    SystemRole.ADMIN,
    SystemRole.SUPERADMIN,
];

function isContentAdmin(user: User): boolean {
    return CONTENT_ADMIN_ROLES.includes(user.systemRole);
}

/** For view/read/activate: user must meet minTier and (if resource has chapterId) belong to that chapter */
function canAccessResource(user: User, resource: Resource): boolean {
    if (resource.allowedTiers && resource.allowedTiers.length > 0) {
        if (!resource.allowedTiers.includes(user.communityTier)) {
            return false;
        }
    } else {
        if (!meetsTierRequirement(user.communityTier, resource.minTier)) {
            return false;
        }
    }
    if (resource.chapterId != null) {
        return user.chapterId === resource.chapterId;
    }
    return true;
}

@Injectable()
export class ResourcesService {
    private readonly logger = new Logger(ResourcesService.name);

    constructor(
        @InjectModel(Resource) private resourceRepository: typeof Resource,
        @InjectModel(ResourceInteraction) private interactionRepository: typeof ResourceInteraction,
    ) { }

    async create(dto: CreateResourceDto, _user: User) {
        try {
            const resource = await this.resourceRepository.create({
                title: dto.title,
                type: dto.type,
                description: dto.description,
                contentUrl: dto.contentUrl,
                thumbnailUrl: dto.thumbnailUrl,
                chapterId: dto.chapterId ?? undefined,
                visibility: dto.visibility ?? ResourceVisibility.PUBLIC,
                minTier: dto.minTier ?? CommunityTier.FREE,
                allowedTiers: dto.allowedTiers ?? [],
                tags: dto.tags ?? [],
                metadata: dto.metadata,
            });
            return { message: 'Resource created successfully', data: this.toDetailSchema(resource) };
        } catch (err: any) {
            this.logger.error(`Resource create failed: ${err?.message}`, err?.stack);
            throw err;
        }
    }

    async update(id: string, dto: UpdateResourceDto, _user: User) {
        const resource = await this.getResourceById(id);
        await resource.update({
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.type !== undefined && { type: dto.type }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.contentUrl !== undefined && { contentUrl: dto.contentUrl }),
            ...(dto.thumbnailUrl !== undefined && { thumbnailUrl: dto.thumbnailUrl }),
            ...(dto.chapterId !== undefined && { chapterId: dto.chapterId || null }),
            ...(dto.visibility !== undefined && { visibility: dto.visibility }),
            ...(dto.minTier !== undefined && { minTier: dto.minTier }),
            ...(dto.allowedTiers !== undefined && { allowedTiers: dto.allowedTiers }),
            ...(dto.tags !== undefined && { tags: dto.tags }),
            ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        });
        return { message: 'Resource updated successfully', data: this.toDetailSchema(resource) };
    }

    async getStats(_user: User) {
        const [total, videos, guides] = await Promise.all([
            this.resourceRepository.count(),
            this.resourceRepository.count({ where: { type: 'VIDEO' } }),
            this.resourceRepository.count({ where: { type: 'GUIDE' } }),
        ]);
        return { total, videos, guides };
    }

    async remove(id: string, _user: User) {
        const resource = await this.getResourceById(id);
        await resource.destroy(); // paranoid: soft-delete
        return { message: 'Resource archived successfully' };
    }

    async list(user: User, query: ResourceListQueryDto) {
        try {
            const { type, chapterId, tag, page = 1, limit = 20 } = query;
            const offset = (page - 1) * limit;

            const where: WhereOptions<Resource> = {};
            if (type) where.type = type;
            if (chapterId) where.chapterId = chapterId;
            if (tag) where.tags = { [Op.contains]: [tag] };

            // Layer A: Visibility — for non-admins, show PUBLIC resources always;
            // RESTRICTED resources are filtered by member tier.
            if (!isContentAdmin(user)) {
                const allowedMinTiers = (Object.values(CommunityTier) as CommunityTier[]).filter(
                    (t) => tierOrder(t) <= tierOrder(user.communityTier),
                );
                const visibilityCondition = user.chapterId
                    ? {
                        [Op.or]: [
                            { visibility: ResourceVisibility.PUBLIC },
                            {
                                visibility: ResourceVisibility.RESTRICTED,
                                [Op.and]: [
                                    {
                                        [Op.or]: [
                                            { minTier: { [Op.in]: allowedMinTiers } },
                                            { allowedTiers: { [Op.overlap]: [user.communityTier] } },
                                        ],
                                    },
                                    {
                                        [Op.or]: [{ chapterId: null }, { chapterId: user.chapterId }],
                                    }
                                ]
                            },
                        ],
                    }
                    : {
                        [Op.or]: [
                            { visibility: ResourceVisibility.PUBLIC },
                            {
                                visibility: ResourceVisibility.RESTRICTED,
                                [Op.and]: [
                                    {
                                        [Op.or]: [
                                            { minTier: { [Op.in]: allowedMinTiers } },
                                            { allowedTiers: { [Op.overlap]: [user.communityTier] } },
                                        ],
                                    },
                                    {
                                        chapterId: null,
                                    }
                                ]
                            },
                        ],
                    };
                where[Op.and] = [visibilityCondition];
            }

            const { rows, count } = await this.resourceRepository.findAndCountAll({
                where,
                limit,
                offset,
                order: [['createdAt', 'DESC']],
            });

            const totalPages = Math.ceil(count / limit) || 0;
            return {
                data: rows.map((r) => this.toCardSchema(r, user)),
                meta: { total: count, page, limit, totalPages },
            };
        } catch (err: any) {
            this.logger.error(`Resource list failed: ${err?.message}`, err?.stack);
            throw err;
        }
    }

    async getById(id: string, user: User) {
        const resource = await this.resourceRepository.findByPk(id);
        if (!resource) {
            throw new NotFoundException('Resource not found');
        }

        // Admins can always access
        if (isContentAdmin(user)) {
            await this.logInteraction(resource.id, user.id, ResourceInteractionAction.VIEW);
            return { data: this.toDetailSchema(resource) };
        }

        // Layer B: Access — must meet tier (and chapter if set)
        if (!canAccessResource(user, resource)) {
            const typeLabel = resource.type.charAt(0) + resource.type.slice(1).toLowerCase();
            throw new ForbiddenException(
                `Your current membership does not include access to this ${typeLabel}. Upgrade to ${resource.minTier} to unlock.`,
            );
        }

        await this.logInteraction(resource.id, user.id, ResourceInteractionAction.VIEW);
        return { data: this.toDetailSchema(resource) };
    }

    private async getResourceById(id: string): Promise<Resource> {
        const resource = await this.resourceRepository.findByPk(id);
        if (!resource) {
            throw new NotFoundException('Resource not found');
        }
        return resource;
    }

    private async logInteraction(resourceId: string, userId: string, action: ResourceInteractionAction): Promise<void> {
        try {
            await this.interactionRepository.create({ resourceId, userId, action });
        } catch {
            // Optional analytics; do not fail the request
        }
    }

    private toCardSchema(resource: Resource, user?: User) {
        const isLocked = user
            ? !canAccessResource(user, resource)
            : false;
        return {
            id: resource.id,
            title: resource.title,
            type: resource.type,
            description: resource.description ?? null,
            thumbnailUrl: resource.thumbnailUrl ?? null,
            chapterId: resource.chapterId ?? null,
            visibility: resource.visibility,
            minTier: resource.minTier,
            allowedTiers: resource.allowedTiers ?? [],
            tags: resource.tags ?? [],
            isLocked,
            createdAt: resource.createdAt?.toISOString(),
        };
    }

    private toDetailSchema(resource: Resource) {
        return {
            ...this.toCardSchema(resource),
            contentUrl: resource.contentUrl ?? null,
            metadata: resource.metadata ?? null,
        };
    }
}
