import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../iam/entities/user.entity';

@Table({
    tableName: 'job_company_sources',
    timestamps: true,
})
export class JobCompanySource extends Model<JobCompanySource> {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    id: string;

    @Column({
        type: DataType.STRING(64),
        allowNull: false,
        defaultValue: 'greenhouse',
    })
    adapter: string; // 'greenhouse', etc.

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
    })
    companyName: string;

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
    })
    boardToken: string; // e.g. 'oneacrefund', 'moniepoint', 'stripe'

    @Column({
        type: DataType.STRING(512),
        allowNull: true,
    })
    websiteUrl?: string;

    @Column({
        type: DataType.ARRAY(DataType.STRING),
        defaultValue: ['US', 'Africa'],
    })
    targetRegions: string[];

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive: boolean;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    lastHarvestedAt?: Date;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    lastJobCount: number;

    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    failureCount: number;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    lastErrorMessage?: string;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    submittedById?: string;

    @BelongsTo(() => User, 'submittedById')
    submittedBy?: User;
}
