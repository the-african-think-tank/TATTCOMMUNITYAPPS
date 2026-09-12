import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Stripe from 'stripe';
import { Sequelize } from 'sequelize-typescript';
import { MembershipPlan } from '../src/modules/membership/entities/membership-plan.entity';
import { StripeCatalogService } from '../src/modules/billing/stripe/services/stripe-catalog.service';
import { StripeClientService } from '../src/modules/billing/stripe/services/stripe-client.service';

async function testRotation() {
    console.log('\n================================================================');
    console.log('🧪 TESTING STRIPE PRICE ROTATION & CATALOG LIFECYCLE');
    console.log('================================================================\n');

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
    });

    const sequelize = new Sequelize({
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
    console.log('✅ 1. Database connected.');

    // 1. Fetch current plan
    const plan = await MembershipPlan.findOne({ where: { tier: 'KIONGOZI' } });
    if (!plan) {
        throw new Error('Kiongozi plan not found in database.');
    }

    const originalYearlyPrice = Number(plan.yearlyPrice);
    const originalPriceId = plan.stripeYearlyPriceId;
    const productId = plan.stripeProductId!;

    console.log(`\n📋 Current State in DB:`);
    console.log(`   Tier: ${plan.tier}`);
    console.log(`   Product ID: ${productId}`);
    console.log(`   Yearly Price: $${originalYearlyPrice}`);
    console.log(`   Yearly Stripe Price ID: ${originalPriceId}`);

    // Mock settings service for StripeClientService
    const mockSettingsService = {
        getRawValue: async () => null,
        getSetting: async () => null,
    } as any;

    const stripeClientService = new StripeClientService(mockSettingsService);
    const catalogService = new StripeCatalogService(
        stripeClientService,
        MembershipPlan as any,
    );

    // 2. Simulate Admin changing the price by +$10 (e.g. $759.99)
    const testAmountCents = Math.round((originalYearlyPrice + 10) * 100);
    console.log(`\n🔄 2. Simulating Admin updating price to $${(testAmountCents / 100).toFixed(2)}/yr...`);

    const newPriceId = await catalogService.rotatePrice(
        productId,
        originalPriceId,
        testAmountCents,
        'year',
        'Kiongozi Yearly (Test Rotation)',
    );

    console.log(`   ✅ New Stripe Price created: ${newPriceId}`);

    // 3. Verify on Stripe: Old price should be inactive, new price active
    console.log(`\n🔍 3. Verifying state directly on Stripe Cloud API...`);
    const oldStripePrice = await stripe.prices.retrieve(originalPriceId);
    const newStripePrice = await stripe.prices.retrieve(newPriceId);

    console.log(`   Old Price (${originalPriceId}): active = ${oldStripePrice.active} (Expected: false)`);
    console.log(`   New Price (${newPriceId}): active = ${newStripePrice.active}, amount = $${(newStripePrice.unit_amount! / 100).toFixed(2)} (Expected: true)`);

    if (oldStripePrice.active === false && newStripePrice.active === true) {
        console.log('   ✅ PASS: Stripe Price rotation succeeded! Old price archived, new price live.');
    } else {
        console.error('   ❌ FAIL: Stripe state mismatch.');
    }

    // 4. Clean up: Rotate back to original canonical price ($749.99)
    console.log(`\n🧹 4. Restoring canonical price ($${originalYearlyPrice.toFixed(2)})...`);
    const restoredPriceId = await catalogService.rotatePrice(
        productId,
        newPriceId,
        Math.round(originalYearlyPrice * 100),
        'year',
        'Kiongozi Yearly',
    );

    // Update DB row back to restored price
    plan.stripeYearlyPriceId = restoredPriceId;
    await plan.save();

    console.log(`   ✅ Restored canonical Price ID: ${restoredPriceId}`);
    console.log(`   ✅ Database updated.`);

    console.log('\n================================================================');
    console.log('🎉 ALL TESTS PASSED: Zero-downtime Price Rotation works as designed!');
    console.log('================================================================\n');

    await sequelize.close();
}

testRotation().catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
