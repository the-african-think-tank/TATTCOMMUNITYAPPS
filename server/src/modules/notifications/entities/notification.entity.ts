import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Default } from 'sequelize-typescript';
import { User } from '../../iam/entities/user.entity';

export enum NotificationType {
    CONNECTION_REQUEST = 'CONNECTION_REQUEST',
    CONNECTION_ACCEPTED = 'CONNECTION_ACCEPTED',
    NEW_MESSAGE = 'NEW_MESSAGE',
    SUBSCRIPTION_RENEWAL = 'SUBSCRIPTION_RENEWAL',
    SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
    SUBSCRIPTION_DOWNGRADE = 'SUBSCRIPTION_DOWNGRADE',
    EVENT_REMINDER = 'EVENT_REMINDER',
    SYSTEM_ALERT = 'SYSTEM_ALERT',
    ACCOUNT = 'ACCOUNT',
    PROMOTION = 'PROMOTION',
    LOW_STOCK = 'LOW_STOCK',
    SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
    VOLUNTEER_ROLE = 'VOLUNTEER_ROLE',
    VOLUNTEER_ACTIVITY = 'VOLUNTEER_ACTIVITY',
    VOLUNTEER_APPLICATION = 'VOLUNTEER_APPLICATION',
    NEW_POST = 'NEW_POST',
    NEW_COMMENT = 'NEW_COMMENT',
    SUPPORT_TICKET_CREATED = 'SUPPORT_TICKET_CREATED',
    SUPPORT_MESSAGE_RECEIVED = 'SUPPORT_MESSAGE_RECEIVED',
    SUPPORT_TICKET_RESOLVED = 'SUPPORT_TICKET_RESOLVED',
}

@Table({
    tableName: 'notifications',
    timestamps: true,
    paranoid: true,
})
export class Notification extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    id: string;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    userId: string;

    @BelongsTo(() => User)
    user: User;

    @Column({
        type: DataType.ENUM(...Object.values(NotificationType)),
        allowNull: false,
    })
    type: NotificationType;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    title: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    message: string;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    data?: any;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    readAt?: Date | null;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    dismissedAt?: Date | null;

    @Default(false)
    @Column(DataType.BOOLEAN)
    isEmailSent: boolean;
}
