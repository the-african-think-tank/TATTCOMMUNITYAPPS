import { Table, Column, Model, DataType, HasMany, BelongsToMany } from 'sequelize-typescript';
import { EventType } from '../enums/event-type.enum';
import { CommunityTier } from '../../iam/enums/roles.enum';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { EventChapter } from './event-chapter.entity';
import { User } from '../../iam/entities/user.entity';
import { EventGuest } from './event-guest.entity';
import { EventRegistration } from './event-registration.entity';

@Table({
    tableName: 'events',
    timestamps: true,
    paranoid: true,
})
export class Event extends Model<Event> {
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
        type: DataType.TEXT,
        allowNull: false,
    })
    description: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    dateTime: Date;

    @Column({
        type: DataType.ENUM(...Object.values(EventType)),
        allowNull: false,
    })
    type: EventType;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    imageUrl?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: 'America/Los_Angeles',
    })
    timezone?: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isForAllMembers: boolean;

    @Column({
        type: DataType.DECIMAL(10, 2),
        defaultValue: 0,
    })
    basePrice: number;

    @Column({
        type: DataType.ARRAY(DataType.STRING),
        allowNull: true,
    })
    targetMembershipTiers?: CommunityTier[];

    @BelongsToMany(() => Chapter, () => EventChapter)
    chapters: Chapter[];

    @HasMany(() => EventChapter)
    locations: EventChapter[];

    @BelongsToMany(() => User, () => EventGuest)
    featuredGuests: User[];

    @HasMany(() => EventRegistration)
    registrations: EventRegistration[];
}
