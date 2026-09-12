import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment files
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

import Stripe from 'stripe';
import { Sequelize } from 'sequelize-typescript';
import { MembershipPlan } from '../src/modules/membership/entities/membership-plan.entity';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_')) {
    console.error('❌ Error: STRIPE_SECRET_KEY is missing or invalid. Set it in .env or pass as an environment variable.');
    process.exit(1);
}

const isLive = STRIPE_SECRET_KEY.startsWith('sk_live_');
const modeName = isLive ? 'PRODUCTION (LIVE)' : 'SANDBOX (TEST)';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
});

interface PlanConfig {
    tier: string;
    name: string;
    description: string;
    monthlyPriceCents: number;
    yearlyPriceCents: number;
}

const PLANS: PlanConfig[] = [
    {
        tier: 'UBUNTU',
        name: 'Ubuntu',
        description: 'Community Ubuntu Tier with member directory and mentorship program access',
        monthlyPriceCents: 2499,
        yearlyPriceCents: 24999,
    },
    {
        tier: 'IMANI',
        name: 'Imani',
        description: 'Community Imani Tier with 1-on-1 mentorship and job board priority access',
        monthlyPriceCents: 4999,
        yearlyPriceCents: 49999,
    },
    {
        tier: 'KIONGOZI',
        name: 'Kiongozi',
        description: 'Leadership and legacy tier with VIP seating and mastermind groups',
        monthlyPriceCents: 7499,
        yearlyPriceCents: 74999,
    },
];

async function run() {
    console.log('\n================================================================');
    console.log(`🚀 TATT STRIPE CATALOG BOOTSTRAP TOOL [${modeName}]`);
    console.log('================================================================\n');

    // 1. Connect to Database if available
    let sequelize: Sequelize | null = null;
    try {
        sequelize = new Sequelize({
            dialect: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASS || 'postgres',
            database: process.env.DB_NAME || 'tatt_db',
            models: [MembershipPlan],
            logging: false,
        });
        await sequelize.authenticate();
        console.log('✅ Connected to database for plan catalog synchronization.');
    } catch (dbErr: any) {
        console.warn('⚠️  Could not connect to PostgreSQL directly (skipping DB updates, continuing Stripe setup).');
    }

    const envLines: string[] = [];

    // 2. Provision each product and price
    for (const plan of PLANS) {
        console.log(`\n📦 Provisioning Tier: ${plan.tier} (${plan.name})...`);

        // A. Find or create Product
        let productId: string;
        const existingProducts = await stripe.products.list({ limit: 50, active: true });
        const matchedProduct = existingProducts.data.find(
            p => p.metadata?.tier === plan.tier || p.name === `TATT ${plan.name} Membership`,
        );

        if (matchedProduct) {
            productId = matchedProduct.id;
            console.log(`   Found existing Product: ${productId}`);
        } else {
            const created = await stripe.products.create({
                name: `TATT ${plan.name} Membership`,
                description: plan.description,
                metadata: { tier: plan.tier },
            });
            productId = created.id;
            console.log(`   Created new Product: ${productId}`);
        }

        envLines.push(`STRIPE_PRODUCT_${plan.tier}=${productId}`);

        // B. Find or create Monthly Price
        const existingPrices = await stripe.prices.list({ product: productId, active: true, limit: 50 });
        let monthlyPriceId: string;
        const matchedMonthly = existingPrices.data.find(
            p => p.recurring?.interval === 'month' && p.unit_amount === plan.monthlyPriceCents,
        );

        if (matchedMonthly) {
            monthlyPriceId = matchedMonthly.id;
            console.log(`   Found existing Monthly Price ($${plan.monthlyPriceCents / 100}): ${monthlyPriceId}`);
        } else {
            const createdMo = await stripe.prices.create({
                product: productId,
                unit_amount: plan.monthlyPriceCents,
                currency: 'usd',
                recurring: { interval: 'month' },
                nickname: `${plan.name} Monthly`,
            });
            monthlyPriceId = createdMo.id;
            console.log(`   Created Monthly Price ($${plan.monthlyPriceCents / 100}): ${monthlyPriceId}`);
        }

        envLines.push(`STRIPE_PRICE_${plan.tier}_MONTHLY=${monthlyPriceId}`);

        // C. Find or create Yearly Price
        let yearlyPriceId: string;
        const matchedYearly = existingPrices.data.find(
            p => p.recurring?.interval === 'year' && p.unit_amount === plan.yearlyPriceCents,
        );

        if (matchedYearly) {
            yearlyPriceId = matchedYearly.id;
            console.log(`   Found existing Yearly Price ($${plan.yearlyPriceCents / 100}): ${yearlyPriceId}`);
        } else {
            const createdYr = await stripe.prices.create({
                product: productId,
                unit_amount: plan.yearlyPriceCents,
                currency: 'usd',
                recurring: { interval: 'year' },
                nickname: `${plan.name} Yearly`,
            });
            yearlyPriceId = createdYr.id;
            console.log(`   Created Yearly Price ($${plan.yearlyPriceCents / 100}): ${yearlyPriceId}`);
        }

        envLines.push(`STRIPE_PRICE_${plan.tier}_YEARLY=${yearlyPriceId}`);

        // D. Update DB if connected
        if (sequelize) {
            try {
                const dbPlan = await MembershipPlan.findOne({ where: { tier: plan.tier } });
                if (dbPlan) {
                    dbPlan.stripeProductId = productId;
                    dbPlan.stripeMonthlyPriceId = monthlyPriceId;
                    dbPlan.stripeYearlyPriceId = yearlyPriceId;
                    await dbPlan.save();
                    console.log(`   Synced IDs to PostgreSQL database row for ${plan.tier}.`);
                }
            } catch (err: any) {
                console.warn(`   Could not update DB for ${plan.tier}: ${err.message}`);
            }
        }
    }

    // 3. Webhook Endpoint Check / Registration
    console.log('\n🔔 Checking Webhook Endpoints on Stripe...');
    const webhookUrl = isLive
        ? 'https://community.theafricanthinktank.com/api/billing/webhook/stripe'
        : 'https://staff.theafricanthinktank.org/api/billing/webhook/stripe';

    const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    const matchedWebhook = existingWebhooks.data.find(w => w.url === webhookUrl);

    if (matchedWebhook) {
        console.log(`   Found existing Webhook Endpoint for ${webhookUrl}: ${matchedWebhook.id}`);
        console.log('   (Note: Existing webhook signing secret was displayed upon creation)');
    } else {
        const createdWebhook = await stripe.webhookEndpoints.create({
            url: webhookUrl,
            description: `TATT Community Apps Webhook (${isLive ? 'Production' : 'Staging'})`,
            enabled_events: [
                'checkout.session.completed',
                'invoice.payment_succeeded',
                'invoice.payment_failed',
                'invoice.upcoming',
                'customer.subscription.updated',
                'customer.subscription.deleted',
            ],
        });
        console.log(`   Created Webhook Endpoint: ${createdWebhook.id}`);
        console.log(`   Webhook Signing Secret: ${createdWebhook.secret}`);
        envLines.push(`STRIPE_WEBHOOK_SECRET=${createdWebhook.secret}`);
    }

    console.log('\n================================================================');
    console.log(`✅ SETUP COMPLETE FOR ${modeName}`);
    console.log('================================================================');
    console.log('\nPaste the following into your .env or .env.production:\n');
    console.log(envLines.join('\n'));
    console.log('\n================================================================\n');

    if (sequelize) {
        await sequelize.close();
    }
}

run().catch(err => {
    console.error('Fatal Bootstrap Error:', err);
    process.exit(1);
});
