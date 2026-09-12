import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
    FinancialTransaction,
    TransactionStatus,
    TransactionType,
} from '../../revenue/entities/financial-transaction.entity';

export interface CreateTransactionParams {
    userId?: string;
    chapterId?: string;
    type: TransactionType;
    amount: number;
    currency: string;
    status: TransactionStatus;
    stripePaymentIntentId?: string;
    referenceNumber: string;
    membershipTier?: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class BillingTransactionService {
    private readonly logger = new Logger(BillingTransactionService.name);

    constructor(
        @InjectModel(FinancialTransaction)
        private readonly transactionRepo: typeof FinancialTransaction,
    ) {}

    /**
     * Records a financial transaction idempotently.
     * If a transaction with the same referenceNumber or stripePaymentIntentId exists, it skips creation.
     */
    async recordTransaction(params: CreateTransactionParams): Promise<FinancialTransaction> {
        // 1. Check idempotency by stripePaymentIntentId
        if (params.stripePaymentIntentId) {
            const existingByIntent = await this.transactionRepo.findOne({
                where: { stripePaymentIntentId: params.stripePaymentIntentId },
            });
            if (existingByIntent) {
                this.logger.log(
                    `Idempotent skip: Transaction already recorded for payment_intent ${params.stripePaymentIntentId}`,
                );
                return existingByIntent;
            }
        }

        // 2. Check idempotency by referenceNumber
        if (params.referenceNumber) {
            const existingByRef = await this.transactionRepo.findOne({
                where: { referenceNumber: params.referenceNumber },
            });
            if (existingByRef) {
                this.logger.log(
                    `Idempotent skip: Transaction already recorded for reference ${params.referenceNumber}`,
                );
                return existingByRef;
            }
        }

        // 3. Create entry
        const transaction = await this.transactionRepo.create({
            userId: params.userId,
            chapterId: params.chapterId,
            type: params.type,
            amount: params.amount,
            currency: (params.currency || 'USD').toUpperCase(),
            status: params.status,
            stripePaymentIntentId: params.stripePaymentIntentId,
            referenceNumber: params.referenceNumber,
            membershipTier: params.membershipTier,
            metadata: params.metadata || {},
        } as any);

        this.logger.log(
            `Recorded FinancialTransaction #${transaction.id} [${params.type}] Amount: $${params.amount} ${params.currency}`,
        );
        return transaction;
    }
}
