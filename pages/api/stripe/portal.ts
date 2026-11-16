import type { NextApiRequest, NextApiResponse } from "next";
import {
    getStripe,
    getSupabaseAdmin,
    getUserFromRequest,
} from "src/lib/stripeServer";

/**
 * POST, Authorization: Bearer <supabase access token>
 * -> { url } of the Stripe billing portal for the caller's customer.
 * (Upstream took the customer id from the request body.)
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

    try {
        const { data: planRow } = await getSupabaseAdmin()
            .from("plan")
            .select("stipe_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
        if (!planRow?.stipe_id) {
            return res.status(404).json({ error: "No billing account yet" });
        }
        const origin =
            process.env.NEXT_PUBLIC_SITE_URL ||
            (req.headers.origin as string) ||
            "";
        const session = await getStripe().billingPortal.sessions.create({
            customer: planRow.stipe_id,
            return_url: `${origin}/videos`,
        });
        return res.status(200).json({ url: session.url });
    } catch (err) {
        console.error("[stripe/portal]", err);
        return res.status(500).json({ error: (err as Error).message });
    }
}
