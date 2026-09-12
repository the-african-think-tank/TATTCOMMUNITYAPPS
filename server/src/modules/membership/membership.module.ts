import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { MembershipTier } from './entities/membership-tier.entity';
import { MembershipPlan } from './entities/membership-plan.entity';
import { Discount } from './entities/discount.entity';
import { User } from '../iam/entities/user.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        NotificationsModule,
        forwardRef(() => BillingModule),
        SequelizeModule.forFeature([
            MembershipTier,
            MembershipPlan,
            Discount,
            User,
            Chapter
        ])
    ],
    controllers: [MembershipController],
    providers: [MembershipService],
    exports: [MembershipService]
})
export class MembershipModule { }
