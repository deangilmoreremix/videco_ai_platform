import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "src/services";
import { verifyWebhookSignature } from "src/lib/muapi";

/**
 * Webhook endpoint for Muapi callbacks.
 * Register this in Muapi dashboard: https://your-site.com/api/webhooks/muapi
 *
 * Muapi will POST the result when generation finishes.
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") return res.status(405).end();


    const signature = req.headers["x-muapi-signature"] as string | undefined;
    const rawBody = JSON.stringify(req.body);
    if (signature) {
        const ok = verifyWebhookSignature(rawBody, signature);
        if (!ok) {
            console.warn("[webhooks/muapi] invalid signature");
            return res
                .status(200)
                .json({ received: false, error: "invalid signature" });
        }
    }

    const { request_id, status, outputs, video_id, ai_video_id } = req.body;

    if (!request_id) {
        return res.status(400).json({ error: "Missing request_id" });
    }

    console.log("[webhooks/muapi] received", request_id, status);

    // Idempotency: check if already completed
    try {
        if (status === "completed" && outputs?.[0]?.url) {
            const finalUrl = outputs[0].url;

            if (video_id) {
                const { data: existing } = await supabase
                    .from("videos")
                    .select("media_status")
                    .eq("id", video_id)
                    .single();
                if (existing?.media_status === "completed") {
                    console.log(
                        "[webhooks/muapi] video already completed",
                        video_id,
                    );
                    return res
                        .status(200)
                        .json({ received: true, ignored: true });
                }

                await supabase
                    .from("videos")
                    .update({
                        final_url: finalUrl,
                        preview: finalUrl,
                        media_status: "completed",
                        ai_preview: request_id,
                    })
                    .eq("id", video_id);
            }

            if (ai_video_id) {
                const { data: existingAi } = await supabase
                    .from("ai_videos")
                    .select("status")
                    .eq("id", ai_video_id)
                    .single();
                if (existingAi?.status === "completed") {
                    console.log(
                        "[webhooks/muapi] ai_video already completed",
                        ai_video_id,
                    );
                    return res
                        .status(200)
                        .json({ received: true, ignored: true });
                }

                await supabase
                    .from("ai_videos")
                    .update({
                        status: "completed",
                        url: finalUrl,
                    })
                    .eq("id", ai_video_id);
            }
        } else if (status === "failed") {
            if (video_id)
                await supabase
                    .from("videos")
                    .update({ media_status: "failed" })
                    .eq("id", video_id);
            if (ai_video_id)
                await supabase
                    .from("ai_videos")
                    .update({ status: "failed" })
                    .eq("id", ai_video_id);
        }
    } catch (err) {
        console.error("[webhooks/muapi] update error", err);
        return res.status(500).json({ error: "db_update_failed" });
    }

    res.status(200).json({ received: true });
}
