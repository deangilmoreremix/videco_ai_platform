import type { NextApiRequest, NextApiResponse } from "next";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Webhook endpoint for Muapi callbacks.
 * Register this in Muapi dashboard: https://your-site.com/api/webhooks/muapi
 *
 * Muapi will POST the result when generation finishes.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const supabase = createClientComponentClient();

  const { request_id, status, outputs, video_id, ai_video_id } = req.body;

  if (!request_id) {
    return res.status(400).json({ error: "Missing request_id" });
  }

  if (status === "completed" && outputs?.[0]?.url) {
    const finalUrl = outputs[0].url;

    if (video_id) {
      await supabase.from("videos").update({
        final_url: finalUrl,
        preview: finalUrl,
        media_status: "completed",
        ai_preview: request_id,
      }).eq("id", video_id);
    }

    if (ai_video_id) {
      await supabase.from("ai_videos").update({
        status: "completed",
        url: finalUrl,
      }).eq("id", ai_video_id);
    }
  } else if (status === "failed") {
    if (video_id) await supabase.from("videos").update({ media_status: "failed" }).eq("id", video_id);
    if (ai_video_id) await supabase.from("ai_videos").update({ status: "failed" }).eq("id", ai_video_id);
  }

  res.status(200).json({ received: true });
}
