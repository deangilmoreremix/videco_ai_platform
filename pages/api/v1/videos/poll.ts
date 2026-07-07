import type { NextApiRequest, NextApiResponse } from "next";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { pollResult } from "src/lib/muapi";

/**
 * Server-side polling endpoint for Muapi results. Accepts { request_id, video_id, ai_video_id }
 * Useful for platforms without Edge Function support; runs pollResult and updates DB.
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });

    const supabase = createClientComponentClient();
    const { request_id, video_id, ai_video_id } = req.body;

    if (!request_id)
        return res.status(400).json({ error: "Missing request_id" });

    console.log("[videos/poll] polling muapi for", request_id);

    const reliableUpdate = async (table: string, payload: any, id: string) => {
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const { error } = await supabase
                    .from(table)
                    .update(payload)
                    .eq("id", id);
                if (error) throw error;
                return true;
            } catch (err) {
                console.error(
                    `[videos/poll] DB update attempt ${attempt} failed for ${table} id=${id}`,
                    err,
                );
                if (attempt < maxAttempts)
                    await new Promise((r) =>
                        setTimeout(r, 200 * Math.pow(2, attempt)),
                    );
            }
        }
        return false;
    };

    try {
        const result = await pollResult(request_id, {
            maxAttempts: 60,
            intervalMs: 3000,
        });

        if (result.status === "completed" && result.outputs?.[0]?.url) {
            const finalUrl = result.outputs[0].url;

            // Reliable update with simple retries

            if (video_id) {
                const { data: existing } = await supabase
                    .from("videos")
                    .select("media_status")
                    .eq("id", video_id)
                    .single();
                if (existing?.media_status === "completed") {
                    console.log("[videos/poll] already completed", video_id);
                    return res
                        .status(200)
                        .json({ success: true, ignored: true });
                }
                await reliableUpdate(
                    "videos",
                    {
                        final_url: finalUrl,
                        preview: finalUrl,
                        media_status: "completed",
                        ai_preview: request_id,
                    },
                    video_id,
                );
            }

            if (ai_video_id) {
                const { data: existingAi } = await supabase
                    .from("ai_videos")
                    .select("status")
                    .eq("id", ai_video_id)
                    .single();
                if (existingAi?.status === "completed") {
                    console.log(
                        "[videos/poll] ai_video already completed",
                        ai_video_id,
                    );
                    return res
                        .status(200)
                        .json({ success: true, ignored: true });
                }
                await reliableUpdate(
                    "ai_videos",
                    { status: "completed", url: finalUrl },
                    ai_video_id,
                );
            }

            return res.status(200).json({
                success: true,
                status: "completed",
                final_url: finalUrl,
            });
        }

        return res.status(200).json({ success: true, status: result.status });
    } catch (err: any) {
        console.error("[videos/poll] poll error", err);
        return res.status(500).json({ error: err.message || "poll_failed" });
    }
}
