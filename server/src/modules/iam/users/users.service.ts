import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../entities/user.entity';
import { SystemRole, CommunityTier, AccountFlags } from '../enums/roles.enum';
import { Op } from 'sequelize';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { ProfessionalInterest } from '../../interests/entities/interest.entity';
import { CommunityIndustry } from '../../industries/entities/industry.entity';
import { UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);
    constructor(
        @InjectModel(User) private userRepository: typeof User,
    ) { }

    async findAllOrgMembers(query: { search?: string; role?: string; isActive?: boolean; chapterId?: string }) {
        const where: any = {
            systemRole: { [Op.ne]: SystemRole.COMMUNITY_MEMBER },
        };

        if (query.search) {
            where[Op.or] = [
                { firstName: { [Op.iLike]: `%${query.search}%` } },
                { lastName: { [Op.iLike]: `%${query.search}%` } },
                { email: { [Op.iLike]: `%${query.search}%` } },
            ];
        }

        if (query.role) {
            where.systemRole = query.role;
        }

        if (query.isActive !== undefined) {
            where.isActive = query.isActive;
        }

        if (query.chapterId) {
            where.chapterId = query.chapterId;
        }

        return this.userRepository.findAll({
            where,
            include: [{ model: Chapter, attributes: ['id', 'name', 'code'] }],
            order: [['createdAt', 'DESC']],
        });
    }

    async findOne(id: string) {
        const user = await this.userRepository.findByPk(id, {
            include: [{ model: Chapter, attributes: ['id', 'name', 'code'] }],
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async update(id: string, updateData: Partial<User>) {
        const user = await this.findOne(id);
        return user.update(updateData);
    }

    async remove(id: string) {
        const user = await this.findOne(id);
        await user.destroy();
        return { message: 'User permanently deleted' };
    }

    async getProfile(userId: string) {
        const user = await this.userRepository.findByPk(userId, {
            include: [
                { model: Chapter, attributes: ['id', 'name', 'code'] },
                { model: CommunityIndustry, as: 'industry', attributes: ['id', 'name'] },
                { model: ProfessionalInterest, as: 'interests', attributes: ['id', 'name'], through: { attributes: [] } }
            ],
            attributes: { exclude: ['password', 'twoFactorSecret', 'pendingTotpSecret'] }
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const user = await this.userRepository.findByPk(userId);
        if (!user) throw new NotFoundException('User not found');

        const { interests, ...profileData } = dto;

        // Security: only Kiongozi can manage business info
        if (user.communityTier !== CommunityTier.KIONGOZI) {
            delete (profileData as any).businessName;
            delete (profileData as any).businessRole;
            delete (profileData as any).businessProfileLink;
        }

        // Convert empty chapterId/industryId to null for database compatibility
        if (profileData.chapterId === '') {
            profileData.chapterId = null as any;
        }
        if (profileData.industryId === '') {
            profileData.industryId = null as any;
        }

        await user.update(profileData);

        if (interests) {
            await (user as any).setInterests(interests);
        }

        // --- Profile Completion Checker ---
        // Check if mandatory fields are present to mark profile as complete
        const updatedUser = await this.userRepository.findByPk(userId, {
            include: [{ model: ProfessionalInterest, as: 'interests', attributes: ['id'] }]
        });

        if (updatedUser) {
            const hasBasicInfo = !!(updatedUser.firstName && updatedUser.lastName);
            const hasProfessionalInfo = !!(updatedUser.professionTitle && updatedUser.industryId);
            const hasBio = !!(updatedUser.professionalHighlight && updatedUser.professionalHighlight.length > 2);
            const hasInterests = !!(updatedUser.interests && updatedUser.interests.length > 0);

            // Logic: Basic + Professional + (Bio OR Interests) is enough to consider "setup"
            if (hasBasicInfo && hasProfessionalInfo && (hasBio || hasInterests)) {
                if (!updatedUser.flags.includes(AccountFlags.PROFILE_COMPLETED)) {
                    const newFlags = [...updatedUser.flags, AccountFlags.PROFILE_COMPLETED];
                    updatedUser.set('flags', newFlags);
                    await updatedUser.save();
                    this.logger.log(`User ${userId} marked as PROFILE_COMPLETED`);
                }
            } else {
                // Remove flag if they clear mandatory fields
                if (updatedUser.flags.includes(AccountFlags.PROFILE_COMPLETED)) {
                    const newFlags = updatedUser.flags.filter(f => f !== AccountFlags.PROFILE_COMPLETED);
                    updatedUser.set('flags', newFlags);
                    await updatedUser.save();
                }
            }
        }

        return this.getProfile(userId);
    }

    async requestDeletion(userId: string) {
        const user = await this.userRepository.findByPk(userId);
        if (!user) throw new NotFoundException('User not found');

        user.deletionRequestedAt = new Date();
        await user.save();

        return { message: 'Account scheduled for deletion. You have 14 days to cancel this request.' };
    }

    async cancelDeletion(userId: string) {
        const user = await this.userRepository.findByPk(userId);
        if (!user) throw new NotFoundException('User not found');

        user.deletionRequestedAt = null;
        await user.save();

        return { message: 'Account deletion request cancelled.' };
    }

    async getStats() {
        const totalStaff = await this.userRepository.count({
            where: { systemRole: { [Op.ne]: SystemRole.COMMUNITY_MEMBER } },
        });

        const activeAdmins = await this.userRepository.count({
            where: {
                systemRole: { [Op.in]: [SystemRole.ADMIN, SystemRole.SUPERADMIN] },
                isActive: true,
            },
        });

        const pendingApprovals = await this.userRepository.count({
            where: { isActive: false, systemRole: { [Op.ne]: SystemRole.COMMUNITY_MEMBER } },
        });

        const regionalChapters = await Chapter.count();

        return {
            totalStaff,
            activeAdmins,
            pendingApprovals,
            regionalChapters,
        };
    }
}
