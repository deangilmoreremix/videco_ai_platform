import type { NextApiRequest, NextApiResponse } from "next";
import {
    getStripe,
    getSupabaseAdmin,
    getUserFromRequest,
    priceForPlan,
    savePlan,
} from "src/lib/stripeServer";

/**
 * POST { plan: "lite" | "growth" | "scale", frequency: "month" | "year" }
 * Authorization: Bearer <supabase access token>
 * -> { url } of a hosted Stripe Checkout session (upstream checkout.ts).
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Sign in required" });

    const { plan, frequency = "month" } = req.body || {};
    const price = priceForPlan(plan, frequency);
    if (!price) {
        return res.status(400).json({
            error: `No Stripe price configured for ${plan}/${frequency}`,
        });
    }

    try {
        const stripe = getStripe();
        const admin = getSupabaseAdmin();

        // Reuse the customer recorded on the plan row (upstream: plan.stipe_id).
        const { data: planRow } = await admin
            .from("plan")
            .select("stipe_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
        let customerId = planRow?.stipe_id as string | undefined;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { userId: user.id, app: "videco" },
            });
            customerId = customer.id;
            await savePlan(user.id, { stipe_id: customerId });
        }

        const origin =
            process.env.NEXT_PUBLIC_SITE_URL ||
            (req.headers.origin as string) ||
            "";
        const metadata = { userId: user.id, plan_name: plan, app: "videco" };
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            allow_promotion_codes: true,
            line_items: [{ price, quantity: 1 }],
            metadata,
            subscription_data: { metadata },
            success_url: `${origin}/settings?success=true`,
            cancel_url: `${origin}/pricing?canceled=true`,
        });
        return res.status(200).json({ url: session.url });
    } catch (err) {
        console.error("[stripe/checkout]", err);
        return res.status(500).json({ error: (err as Error).message });
    }
}
