'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createSubscriptionCheckoutSession({
  tier,
  isYearly,
  amount,
  currency,
  userEmail,
  userId,
}: {
  tier: string;
  isYearly: boolean;
  amount: number;
  currency: string;
  userEmail: string;
  userId: string;
}) {
  // Validation
  if (!userEmail || !userEmail.includes('@')) {
    throw new Error('Adresse email invalide.');
  }
  if (!amount || amount <= 0) {
    throw new Error('Montant invalide.');
  }

  // Look up existing Stripe Customer by email to reuse saved payment methods
  let customerId: string | undefined;
  try {
    const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
    const firstCustomer = existingCustomers.data[0];
    if (firstCustomer) {
      customerId = firstCustomer.id;
    }
  } catch (err) {
    console.warn('Could not list Stripe customers:', err);
  }

  // Création de la session Checkout (récurrente / abonnement)
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: currency || 'usd',
          product_data: {
            name: `TATT ${tier} Membership - ${isYearly ? 'Yearly' : 'Monthly'}`,
            description: `Accès au plan ${tier}`,
          },
          unit_amount: amount, // Montant en centimes
          recurring: {
            interval: isYearly ? 'year' : 'month',
          },
        },
        quantity: 1,
      },
    ],
    ui_mode: 'embedded_page',
    redirect_on_completion: 'never',
    ...(customerId ? { customer: customerId } : { customer_email: userEmail }),
    saved_payment_method_options: {
      payment_method_save: 'enabled',
    },
    metadata: {
      userId,
      tier,
      billingCycle: isYearly ? 'YEARLY' : 'MONTHLY',
    },
  });

  return {
    clientSecret: session.client_secret,
    sessionId: session.id,
  };
}