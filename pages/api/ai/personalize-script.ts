import type { NextApiRequest, NextApiResponse } from "next";
import { generatePersonalizedScript } from "src/lib/openai";

/**
 * POST /api/ai/personalize-script
 * Body: { leadName, company, painPoint, product, tone?, durationSeconds? }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const script = await generatePersonalizedScript(req.body);
        res.status(200).json({ success: true, script });
    } catch (err: any) {
        console.error("[personalize-script]", err);
        res.status(500).json({ success: false, error: err.message });
    }
}
