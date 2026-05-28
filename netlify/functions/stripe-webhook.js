require('events').EventEmitter.defaultMaxListeners = 100;
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOKS_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body || '',
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: 'Webhook Error' };
  }

  const session = stripeEvent.data.object;

  try {
    if (
      stripeEvent.type === 'invoice.payment_succeeded' ||
      stripeEvent.type === 'payment_intent.succeeded'
    ) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      await fetch(`${supabaseUrl}/rest/v1/plan`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          free_trial_start_date:
            stripeEvent.type === 'payment_intent.succeeded'
              ? new Date().toJSON().slice(0, 10)
              : null,
          free_trial_ended: true,
          plan_name: session.subscription_details?.metadata?.plan_name || 'active',
          status:
            stripeEvent.type === 'payment_intent.succeeded'
              ? 'free_trial'
              : 'active',
        }),
      });

      await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onboard_completed: true,
        }),
      });

      if (process.env.PARTNERO_API_KEY) {
        await fetch('https://api.partnero.com/v1/transactions', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            Authorization: `Bearer ${process.env.PARTNERO_API_KEY}`,
          },
          body: JSON.stringify({
            email: session?.customer_email || '',
            customer: { email: session?.customer_email || '' },
            key: session?.customer_email || '',
            amount: session?.amount_paid,
            product_type: 'monthly',
            action: 'sale',
          }),
        });
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ received: session.customer }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error('Webhook handler error:', error);
    return { statusCode: 500, body: 'Webhook handler error' };
  }
};