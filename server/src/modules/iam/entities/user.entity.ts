import { Table, Column, Model, DataType, Default, BelongsTo, BelongsToMany, ForeignKey, AfterCreate, BeforeCreate, HasMany } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { SystemRole, CommunityTier, AccountFlags, ConnectionPreference } from '../enums/roles.enum';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { ProfessionalInterest } from '../../interests/entities/interest.entity';
import { UserInterest } from '../../interests/entities/user-interest.entity';
import { Connection } from '../../connections/entities/connection.entity';
import { Post } from '../../feed/entities/post.entity';
import { PostLike } from '../../feed/entities/post-like.entity';
import { PostComment } from '../../feed/entities/post-comment.entity';
import { DirectMessage } from '../../messages/entities/direct-message.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { VolunteerStat } from '../../volunteers/entities/volunteer-stat.entity';
import { VolunteerApplication } from '../../volunteers/entities/volunteer-application.entity';
import { HasOne } from 'sequelize-typescript';
import { CommunityIndustry } from '../../industries/entities/industry.entity';

@Table({
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Soft deletes (Account Management: No account removal by default)
})
export class User extends Model<User> {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    id: string;

    @BeforeCreate
    static async assignSequenceNumber(instance: User) {
        if (instance.sequenceNumber != null) return;
        const rows = await User.sequelize!.query<{ max: number }>(
            'SELECT COALESCE(MAX("sequenceNumber"), 0) + 1 AS max FROM users',
            { type: QueryTypes.SELECT },
        );
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
        instance.sequenceNumber = (row && (row as any).max) ? (row as any).max : 1;
    }

    @AfterCreate
    static async generateMemberId(instance: User) {
        if (instance.chapterId) {
            const chap = await Chapter.findByPk(instance.chapterId);
            if (chap) {
                instance.tattMemberId = `TATT-${chap.code}-${instance.sequenceNumber}`;
                await instance.save();
            }
        } else {
            instance.tattMemberId = `TATT-XXXX-${instance.sequenceNumber}`;
            await instance.save();
        }
    }

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    email: string;

    @Column({
        type: DataType.STRING,
        allowNull: true, // Nullable for OAuth accounts
    })
    password?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    firstName: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    lastName: string;

    @Column(DataType.STRING)
    profilePicture?: string;

    @Column(DataType.STRING)
    companyName?: string;

    @Column(DataType.TEXT)
    professionalHighlight?: string;

    // INTEGER + BeforeCreate (not SERIAL) so Sequelize sync never emits ALTER TYPE SERIAL (invalid in PostgreSQL)
    @Column({
        type: DataType.INTEGER,
        allowNull: true, // set in BeforeCreate
        unique: true,
    })
    sequenceNumber: number;

    @Column(DataType.STRING)
    tattMemberId?: string;

    @Column(DataType.STRING)
    phoneNumber?: string;

    @Column(DataType.STRING)
    professionTitle?: string;

    @Column(DataType.STRING)
    location?: string;

    @Column(DataType.STRING)
    countryOfOrigin?: string;

    @Column(DataType.STRING)
    countryOfResidence?: string;

    @Column(DataType.DATEONLY)
    dateOfBirth?: string;

    @ForeignKey(() => CommunityIndustry)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    industryId?: string;

    @BelongsTo(() => CommunityIndustry, 'industryId')
    industry: CommunityIndustry;

    // -- ACTIVATION & INVITATION --
    @Default(true)
    @Column(DataType.BOOLEAN)
    isActive: boolean; // False for org members until they set password

    @Column(DataType.STRING)
    inviteToken?: string;

    @Column(DataType.STRING)
    resetPasswordToken?: string;

    @Column(DataType.DATE)
    resetPasswordExpiresAt?: Date;

    // -- ACCESS CONTROL & SEGMENTS --
    @Default(SystemRole.COMMUNITY_MEMBER)
    @Column({
        type: DataType.ENUM(...Object.values(SystemRole)),
    })
    systemRole: SystemRole;

    @Default(CommunityTier.FREE)
    @Column({
        type: DataType.ENUM(...Object.values(CommunityTier)),
    })
    communityTier: CommunityTier;

    @Column({
        type: DataType.ARRAY(DataType.STRING),
        defaultValue: [],
    })
    flags: AccountFlags[];

    // -- ACCOUNT INTEGRITY (Lockouts & Bans) --
    @Default(false)
    @Column(DataType.BOOLEAN)
    isApproved: boolean; // Approval by admins for critical roles

    @Default(0)
    @Column(DataType.INTEGER)
    suspensionStrikes: number; // Max 3 before permaban

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    jailUntil: Date; // Time-based suspensions

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    jailReason: string;

    // -- MFA --
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    isTwoFactorEnabled: boolean;

    /**
     * Which 2FA method the user has set up.
     * null  = not enabled
     * EMAIL = OTP sent to registered email
     * TOTP  = authenticator app (RFC 6238 TOTP)
     */
    @Column({
        type: DataType.ENUM('EMAIL', 'TOTP'),
        allowNull: true,
    })
    twoFactorMethod: 'EMAIL' | 'TOTP' | null;

    /** Confirmed TOTP secret (AES-encrypted at rest using APP_SECRET) */
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    twoFactorSecret?: string;

    /**
     * Pending (unconfirmed) TOTP secret shown during TOTP setup.
     * Cleared once the user confirms with their first valid OTP.
     */
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    pendingTotpSecret?: string;

    // -- PROVIDERS (Identity Integration) --
    @Column(DataType.STRING)
    googleId?: string;

    @Column(DataType.STRING)
    microsoftId?: string;

    @Column(DataType.STRING)
    appleId?: string;

    @ForeignKey(() => Chapter)
    @Column({
        type: DataType.UUID,
        allowNull: true, // Link to TATT Chapters
    })
    chapterId?: string;

    @BelongsTo(() => Chapter, 'chapterId')
    chapter: Chapter;

    @BelongsToMany(() => ProfessionalInterest, () => UserInterest)
    interests: ProfessionalInterest[];

    // Connections sent BY this user
    @HasMany(() => Connection, 'requesterId')
    sentConnections: Connection[];

    // Connections received BY this user
    @HasMany(() => Connection, 'recipientId')
    receivedConnections: Connection[];

    // Feed associations
    @HasMany(() => Post, 'authorId')
    posts: Post[];

    @HasMany(() => PostLike, 'userId')
    postLikes: PostLike[];

    @HasMany(() => PostComment, 'userId')
    postComments: PostComment[];

    @HasMany(() => DirectMessage, 'senderId')
    sentMessages: DirectMessage[];

    @HasMany(() => DirectMessage, 'receiverId')
    receivedMessages: DirectMessage[];

    @HasMany(() => Notification, 'userId')
    notifications: Notification[];

    @Column(DataType.STRING)
    stripeCustomerId?: string;

    @Column(DataType.DATE)
    subscriptionExpiresAt?: Date;

    @Column({
        type: DataType.ENUM('MONTHLY', 'YEARLY'),
        allowNull: true,
    })
    billingCycle?: 'MONTHLY' | 'YEARLY';

    @Default(true)
    @Column(DataType.BOOLEAN)
    hasAutoPayEnabled: boolean;

    @Default(ConnectionPreference.OPEN)
    @Column({
        type: DataType.ENUM(...Object.values(ConnectionPreference)),
    })
    connectionPreference: ConnectionPreference;

    @Column(DataType.TEXT)
    expertise?: string;

    // -- Kiongozi Tier Business Profile Section --
    @Column(DataType.STRING)
    businessName?: string;

    @Column(DataType.STRING)
    businessRole?: string;

    @Column(DataType.STRING)
    businessProfileLink?: string;

    @Column(DataType.STRING)
    linkedInProfileUrl?: string;

    // -- PASSWORD ROTATION TRACKING --

    /** When the user's current password was last set. Used for rotation policy. */
    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    passwordChangedAt?: Date;

    /**
     * Tracks when the last password-expiry warning email was sent
     * to avoid spamming: '30d' | '14d' | '7d' | null
     */
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    passwordExpiryNotifiedAt?: string;

    /** When the user requested account deletion. Full deletion occurs 14 days later. */
    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    deletionRequestedAt?: Date;

    @HasOne(() => VolunteerStat)
    volunteerStat?: VolunteerStat;

    @HasMany(() => VolunteerApplication)
    applications: VolunteerApplication[];
}
