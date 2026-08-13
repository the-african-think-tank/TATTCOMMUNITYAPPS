import {
    Table, Column, Model, DataType, Default,
    ForeignKey, BelongsTo, HasMany,
} from 'sequelize-typescript';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { CommunityTier } from '../../iam/enums/roles.enum';
import { ResourceInteraction } from './resource-interaction.entity';

export enum ResourceType {
    GUIDE = 'GUIDE',
    DOCUMENT = 'DOCUMENT',
    VIDEO = 'VIDEO',
    PARTNERSHIP = 'PARTNERSHIP',
}

export enum ResourceVisibility {
    PUBLIC = 'PUBLIC',
    RESTRICTED = 'RESTRICTED',
}

@Table({
    tableName: 'resources',
    timestamps: true,
    paranoid: true, // Soft-delete / Archive
})
export class Resource extends Model<Resource> {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    title: string;

    @Column({
        type: DataType.ENUM(...Object.values(ResourceType)),
        allowNull: false,
    })
    type: ResourceType;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    description?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    contentUrl?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    thumbnailUrl?: string;

    @ForeignKey(() => Chapter)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    chapterId?: string;

    @BelongsTo(() => Chapter, 'chapterId')
    chapter: Chapter;

    @Default(ResourceVisibility.PUBLIC)
    @Column({
        type: DataType.ENUM(...Object.values(ResourceVisibility)),
        allowNull: false,
    })
    visibility: ResourceVisibility;

    @Default(CommunityTier.FREE)
    @Column({
        type: DataType.ENUM(...Object.values(CommunityTier)),
        allowNull: false,
    })
    minTier: CommunityTier;

    @Column({
        type: DataType.ARRAY(DataType.STRING),
        allowNull: true,
        defaultValue: [],
    })
    allowedTiers?: string[];

    @Column({
        type: DataType.ARRAY(DataType.STRING),
        allowNull: false,
        defaultValue: [],
    })
    tags: string[];

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    metadata?: Record<string, unknown>;

    @HasMany(() => ResourceInteraction, 'resourceId')
    interactions: ResourceInteraction[];
}
