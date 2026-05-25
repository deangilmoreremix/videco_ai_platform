/**
 * Netlify Function: Stripe Webhook Handler
 * Critical migration target from pages/api/stripe/webhooks.ts
 *
 * Usage:
 * - Set STRIPE_WEBHOOKS_SECRET and STRIPE_SECRET_KEY in Netlify env
 * - Update Stripe dashboard webhook URL to https://your-site.netlify.app/.netlify/functions/stripe-webhook
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Handler } from "@netlify/functions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOKS_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const partneroOptions = {
  method: "POST",
  url: "https://api.partnero.com/v1/transactions",
  headers: {
    accept: "application/json",
    "content-type": "application/json",
    Authorization: "Bearer " + process.env.PARTNERO_API_KEY,
  },
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"];
  const payload = event.body || "";

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(payload, sig!, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  const session = stripeEvent.data.object as any;

  try {
    if (
      stripeEvent.type === "invoice.payment_succeeded" ||
      stripeEvent.type === "payment_intent.succeeded"
    ) {
      const userId =
        stripeEvent.type === "payment_intent.succeeded"
          ? session.metadata?.userId
          : session.subscription_details?.metadata?.userId;

      await supabase
        .from("plan")
        .update({
          free_trial_start_date:
            stripeEvent.type === "payment_intent.succeeded"
              ? new Date().toISOString().slice(0, 10)
              : null,
          free_trial_ended: true,
          plan_name: session.subscription_details?.metadata?.plan_name,
          status:
            stripeEvent.type === "payment_intent.succeeded"
              ? "free_trial"
              : "active",
        })
        .eq("user_id", userId);

      await supabase
        .from("profiles")
        .update({ onboard_completed: true })
        .eq("id", userId);

      // Partnero tracking (non-blocking)
      if (process.env.PARTNERO_API_KEY) {
        fetch(partneroOptions.url, {
          method: "POST",
          headers: partneroOptions.headers as any,
          body: JSON.stringify({
            email: session.customer_email ?? "",
            customer: { email: session.customer_email ?? "" },
            key: session.customer_email ?? "",
            amount: session.amount_paid,
            product_type: "monthly",
            action: "sale",
          }),
        }).catch((e) => console.error("Partnero error", e));
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ received: true }),
      };
    }

    // Handle other events if needed (subscription updated, canceled, etc.)
    console.log(`Unhandled Stripe event type: ${stripeEvent.type}`);

    return { statusCode: 200, body: "ok" };
  } catch (err: any) {
    console.error("Stripe webhook processing error:", err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
