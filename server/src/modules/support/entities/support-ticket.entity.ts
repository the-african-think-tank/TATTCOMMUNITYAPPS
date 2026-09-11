import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from '../../iam/entities/user.entity';
import { SupportMessage } from './support-message.entity';

export enum TicketStatus {
    NEW = 'NEW',
    OPEN = 'OPEN',
    PENDING = 'PENDING',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED'
}

export enum TicketCategory {
    BILLING = 'BILLING',
    TECHNICAL = 'TECHNICAL',
    MEMBERSHIP = 'MEMBERSHIP',
    EVENTS = 'EVENTS',
    PARTNERSHIP = 'PARTNERSHIP',
    OTHER = 'OTHER'
}

@Table({ tableName: 'support_tickets', timestamps: true, paranoid: true })
export class SupportTicket extends Model<SupportTicket> {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    id: string;

    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    ticketNumber: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    userId: string;

    @BelongsTo(() => User, 'userId')
    user: User;

    @Column({ type: DataType.STRING, allowNull: false })
    subject: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    description: string;

    @Default(TicketCategory.OTHER)
    @Column({ type: DataType.STRING })
    category: TicketCategory;

    @Default(TicketStatus.NEW)
    @Column({ type: DataType.STRING })
    status: TicketStatus;
    
    @Column({ type: DataType.TEXT, allowNull: true })
    adminNotes: string;

    @Column({ type: DataType.JSON, allowNull: true })
    attachments: string[];

    @Column({ type: DataType.DATE, allowNull: true })
    resolvedAt: Date;

    @HasMany(() => SupportMessage, { as: 'messages' })
    messages: SupportMessage[];
}
