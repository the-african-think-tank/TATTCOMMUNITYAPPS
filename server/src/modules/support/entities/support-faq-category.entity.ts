import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { SupportFaq } from './support-faq.entity';

@Table({ tableName: 'support_faq_categories', timestamps: true })
export class SupportFaqCategory extends Model<SupportFaqCategory> {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    id: string;

    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    category: string;

    @HasMany(() => SupportFaq)
    questions: SupportFaq[];
}
