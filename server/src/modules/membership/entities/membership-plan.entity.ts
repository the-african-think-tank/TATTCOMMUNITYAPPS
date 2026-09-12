import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'membership_plans' })
export class MembershipPlan extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    id: string;

    @Column({
        type: DataType.STRING,
        unique: true,
        allowNull: false,
    })
    tier: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    name: string;

    @Column(DataType.TEXT)
    tagline: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        defaultValue: 0,
    })
    monthlyPrice: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        defaultValue: 0,
    })
    yearlyPrice: number;

    @Column({
        type: DataType.ARRAY(DataType.STRING),
        defaultValue: [],
    })
    features: string[];

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isPopular: boolean;

    @Column(DataType.STRING)
    stripeProductId?: string;

    @Column(DataType.STRING)
    stripeMonthlyPriceId: string;

    @Column(DataType.STRING)
    stripeYearlyPriceId: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    hasYearlyDiscount: boolean;

    @Column({
        type: DataType.DECIMAL(5, 2),
        defaultValue: 15.00,
    })
    yearlyDiscountPercent: number;

    @Column({
        type: DataType.JSONB,
        defaultValue: [
            { title: 'Free Vendor Tables', subtitle: 'Exhibition and sales opportunities', enabled: false },
            { title: 'Pitch Event Access', subtitle: 'Priority invitation to funding sessions', enabled: false },
            { title: 'Talent Access', subtitle: 'Recruitment and networking priority', enabled: false },
            { title: 'TATT Job Board', subtitle: 'Exclusive Talent Matchmaking', enabled: false },
            { title: 'Premium Resource Library', subtitle: 'Research, Reports & Whitepapers', enabled: true }
        ],
    })
    accessControls: any;

    @Column({
        type: DataType.DECIMAL(5, 2),
        defaultValue: 25.00,
    })
    eventDiscountPercent: number;
}
