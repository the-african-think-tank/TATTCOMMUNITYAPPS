import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportFaq } from './entities/support-faq.entity';
import { SupportFaqCategory } from './entities/support-faq-category.entity';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { User } from '../iam/entities/user.entity';
import { SupportMessage } from './entities/support-message.entity';

@Module({
    imports: [SequelizeModule.forFeature([SupportTicket, SupportFaqCategory, SupportFaq, User, SupportMessage])],
    controllers: [SupportController],
    providers: [SupportService],
    exports: [SupportService]
})
export class SupportModule {
    onModuleInit() {
        console.log('[SupportModule] Initialized - controllers registered.');
    }
}
