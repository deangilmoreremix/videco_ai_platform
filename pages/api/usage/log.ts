import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") return res.status(405).end();

    const { user_id, model, provider, action, details, cost_estimate } =
        req.body;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)
        return res
            .status(500)
            .json({ error: "Supabase server config missing" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        await supabase
            .from("usage")
            .insert([
                { user_id, model, provider, action, details, cost_estimate },
            ]);
        res.status(200).json({ success: true });
    } catch (e: unknown) {
        console.error("usage log error", e);
        res.status(500).json({
            error: e instanceof Error ? e.message : "Unknown error",
        });
    }
}
