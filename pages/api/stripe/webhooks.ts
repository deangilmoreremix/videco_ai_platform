import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import {
    activePlanFields,
    getStripe,
    getSupabaseAdmin,
    savePlan,
} from "src/lib/stripeServer";

// Stripe signs the raw body, so Next must not parse it.
export const config = { api: { bodyParser: false } };

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

/** Videco user for a Stripe object: metadata first, then plan.stipe_id. */
async function userIdFor(
    metadata: Stripe.Metadata | null | undefined,
    customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
    if (metadata?.userId) return metadata.userId;
    const customerId = typeof customer === "string" ? customer : customer?.id;
    if (!customerId) return null;
    const { data } = await getSupabaseAdmin()
        .from("plan")
        .select("user_id")
        .eq("stipe_id", customerId)
        .limit(1)
        .maybeSingle();
    return (data?.user_id as string) || null;
}

/**
 * Stripe webhook (upstream pages/api/stripe/webhooks.ts): keeps the `plan`
 * row in sync with the subscription. Point a Stripe endpoint at
 * /api/stripe/webhooks with the events below and set STRIPE_WEBHOOKS_SECRET.
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).end();
    }
    const secret = process.env.STRIPE_WEBHOOKS_SECRET;
    if (!secret) return res.status(500).send("Webhook secret not configured");

    let event: Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(
            await readRawBody(req),
            req.headers["stripe-signature"] as string,
            secret,
        );
    } catch (err) {
        return res
            .status(400)
            .send(
                `Webhook signature verification failed: ${
                    (err as Error).message
                }`,
            );
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = await userIdFor(
                    session.metadata,
                    session.customer,
                );
                if (userId && session.metadata?.plan_name) {
                    await savePlan(userId, {
                        ...activePlanFields(session.metadata.plan_name),
                        stipe_id:
                            typeof session.customer === "string"
                                ? session.customer
                                : session.customer?.id,
                    });
                    await getSupabaseAdmin()
                        .from("profiles")
                        .update({ onboard_completed: true })
                        .eq("id", userId);
                }
                break;
            }
            case "customer.subscription.updated": {
                const sub = event.data.object as Stripe.Subscription;
                const userId = await userIdFor(sub.metadata, sub.customer);
                if (!userId) break;
                if (
                    ["active", "trialing"].includes(sub.status) &&
                    sub.metadata?.plan_name
                ) {
                    await savePlan(
                        userId,
                        activePlanFields(sub.metadata.plan_name),
                    );
                } else if (
                    ["past_due", "unpaid", "incomplete_expired"].includes(
                        sub.status,
                    )
                ) {
                    await savePlan(userId, { status: sub.status });
                }
                break;
            }
            case "customer.subscription.deleted": {
                const sub = event.data.object as Stripe.Subscription;
                const userId = await userIdFor(sub.metadata, sub.customer);
                if (userId) await savePlan(userId, { status: "canceled" });
                break;
            }
            default:
                break;
        }
    } catch (err) {
        console.error("[stripe/webhooks]", event.type, err);
        // Non-2xx makes Stripe retry the event.
        return res.status(500).send("Webhook handler failed");
    }
    return res.status(200).json({ received: true });
}
