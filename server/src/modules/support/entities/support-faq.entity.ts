import { Table, Column, Model, DataType, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { SupportFaqCategory } from './support-faq-category.entity';

export enum FaqCategory {
    MEMBERSHIP = 'MEMBERSHIP',
    EVENTS = 'EVENTS',
    TECHNICAL = 'TECHNICAL',
    GENERAL = 'GENERAL'
}

@Table({ tableName: 'support_faqs', timestamps: true })
export class SupportFaq extends Model<SupportFaq> {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    question: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    answer: string;

    @ForeignKey(() => SupportFaqCategory)
    @Column({ type: DataType.UUID, allowNull: true })
    categoryId: string;

    @BelongsTo(() => SupportFaqCategory)
    category: SupportFaqCategory;

    @Default(true)
    @Column({ type: DataType.BOOLEAN })
    isActive: boolean;
}
