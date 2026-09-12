import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { User } from '../iam/entities/user.entity';
import { EventRegistration } from '../events/entities/event-registration.entity';
import { MembershipPlan } from '../membership/entities/membership-plan.entity';
import { Discount } from '../membership/entities/discount.entity';
import { FinancialTransaction } from '../revenue/entities/financial-transaction.entity';
import { Order } from '../store/entities/order.entity';

// Clean Architecture Stripe Services & Handlers
import { StripeClientService } from './stripe/services/stripe-client.service';
import { StripeCatalogService } from './stripe/services/stripe-catalog.service';
import { StripeWebhookDispatcher } from './stripe/services/stripe-webhook-dispatcher';
import { CheckoutCompletedHandler } from './stripe/handlers/checkout-completed.handler';
import { InvoicePaymentSucceededHandler } from './stripe/handlers/invoice-payment-succeeded.handler';
import { InvoicePaymentFailedHandler } from './stripe/handlers/invoice-payment-failed.handler';
import { InvoiceUpcomingHandler } from './stripe/handlers/invoice-upcoming.handler';
import { SubscriptionUpdatedHandler } from './stripe/handlers/subscription-updated.handler';
import { SubscriptionDeletedHandler } from './stripe/handlers/subscription-deleted.handler';
import { BillingTransactionService } from './services/billing-transaction.service';

@Module({
    imports: [
        SequelizeModule.forFeature([
            User,
            EventRegistration,
            MembershipPlan,
            Discount,
            FinancialTransaction,
            Order,
        ]),
    ],
    controllers: [BillingController],
    providers: [
        // Infrastructure
        StripeClientService,
        StripeCatalogService,
        BillingTransactionService,

        // Webhook Handlers
        CheckoutCompletedHandler,
        InvoicePaymentSucceededHandler,
        InvoicePaymentFailedHandler,
        InvoiceUpcomingHandler,
        SubscriptionUpdatedHandler,
        SubscriptionDeletedHandler,

        // Webhook Dispatcher
        StripeWebhookDispatcher,

        // High-level application facade
        BillingService,
    ],
    exports: [
        BillingService,
        StripeClientService,
        StripeCatalogService,
        BillingTransactionService,
    ],
})
export class BillingModule {}
