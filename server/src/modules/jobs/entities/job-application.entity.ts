import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../../iam/entities/user.entity';
import { JobListing } from './job-listing.entity';

@Table({
    tableName: 'job_applications',
    timestamps: true,
})
export class JobApplication extends Model<JobApplication> {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    id: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    userId: string;

    @BelongsTo(() => User, { as: 'applicant', foreignKey: 'userId' })
    applicant: User;

    @ForeignKey(() => JobListing)
    @Column({ type: DataType.UUID, allowNull: false })
    jobId: string;

    @BelongsTo(() => JobListing)
    job: JobListing;

    @Column({ type: DataType.STRING, allowNull: false })
    fullName: string;

    @Column({ type: DataType.STRING, allowNull: false })
    email: string;

    @Column({ type: DataType.STRING, allowNull: true })
    phone: string;

    @Column({ type: DataType.STRING, allowNull: true })
    resumeUrl: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    coverLetter: string;
}
