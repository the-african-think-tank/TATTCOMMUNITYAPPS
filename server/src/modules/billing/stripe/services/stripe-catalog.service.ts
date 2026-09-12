import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StripeClientService } from './stripe-client.service';
import { MembershipPlan } from '../../../membership/entities/membership-plan.entity';
import { StripeCatalogException } from '../errors/stripe.errors';

@Injectable()
export class StripeCatalogService {
    private readonly logger = new Logger(StripeCatalogService.name);

    constructor(
        private readonly stripeClient: StripeClientService,
        @InjectModel(MembershipPlan) private readonly planRepo: typeof MembershipPlan,
    ) {}

    /**
     * Ensures a root Stripe Product exists for the given tier.
     */
    async ensureProduct(tier: string, name: string, description?: string): Promise<string> {
        const stripe = await this.stripeClient.getClient();

        // 1. Check if the plan in DB already has a stripeProductId
        const plan = await this.planRepo.findOne({ where: { tier } });
        if (plan?.stripeProductId) {
            try {
                const existingProd = await stripe.products.retrieve(plan.stripeProductId);
                if (existingProd && existingProd.active) {
                    return existingProd.id;
                }
            } catch (err: any) {
                this.logger.warn(`Could not retrieve product ${plan.stripeProductId} from Stripe. Searching by name...`);
            }
        }

        // 2. Search Stripe for existing active product with matching name or tier metadata
        try {
            const products = await stripe.products.list({ limit: 50, active: true });
            const matched = products.data.find(
                p => p.metadata?.tier === tier || p.name.toLowerCase().includes(name.toLowerCase()),
            );

            if (matched) {
                if (plan) {
                    plan.stripeProductId = matched.id;
                    await plan.save();
                }
                return matched.id;
            }

            // 3. Create canonical Product on Stripe
            const created = await stripe.products.create({
                name: `TATT ${name} Membership`,
                description: description || `Official TATT ${name} Community Tier`,
                metadata: { tier },
            });

            if (plan) {
                plan.stripeProductId = created.id;
                await plan.save();
            }

            this.logger.log(`Created canonical Stripe Product for ${tier}: ${created.id}`);
            return created.id;
        } catch (err: any) {
            this.logger.error(`Failed to ensure Stripe Product for ${tier}: ${err.message}`);
            throw new StripeCatalogException(`Failed to ensure product for ${tier}: ${err.message}`);
        }
    }

    /**
     * Rotates a recurring Price under a Product: creates the new Price and archives the old one.
     */
    async rotatePrice(
        productId: string,
        oldPriceId: string | null,
        amountCents: number,
        interval: 'month' | 'year',
        nickname?: string,
    ): Promise<string> {
        const stripe = await this.stripeClient.getClient();

        try {
            // 1. Create the new Price on Stripe
            const newPrice = await stripe.prices.create({
                product: productId,
                unit_amount: amountCents,
                currency: 'usd',
                recurring: { interval },
                nickname: nickname || `TATT ${interval === 'month' ? 'Monthly' : 'Yearly'}`,
            });

            this.logger.log(`Created new recurring Price: ${newPrice.id} ($${(amountCents / 100).toFixed(2)}/${interval})`);

            // 2. Archive the old Price so new checkouts no longer see it
            if (oldPriceId && oldPriceId.startsWith('price_')) {
                try {
                    await stripe.prices.update(oldPriceId, { active: false });
                    this.logger.log(`Archived previous Price: ${oldPriceId}`);
                } catch (archiveErr: any) {
                    this.logger.warn(`Could not archive previous price ${oldPriceId}: ${archiveErr.message}`);
                }
            }

            return newPrice.id;
        } catch (err: any) {
            this.logger.error(`Failed to rotate price for product ${productId}: ${err.message}`);
            throw new StripeCatalogException(`Failed to rotate price: ${err.message}`);
        }
    }

    /**
     * Resolves the active Price ID for a tier and cycle.
     */
    async getActivePriceId(tier: string, cycle: 'MONTHLY' | 'YEARLY'): Promise<string | null> {
        const plan = await this.planRepo.findOne({ where: { tier } });
        if (!plan) return null;

        const priceId = cycle === 'YEARLY' ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
        if (priceId && priceId.startsWith('price_')) {
            return priceId;
        }

        // Fallback to environment variables
        const envKey = `STRIPE_PRICE_${tier.toUpperCase()}_${cycle}`;
        return process.env[envKey] || null;
    }
}
