import { inngest, JOB_DETAILS } from "src/services/inngest";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createAICloneMuapi } from "src/services/aiClone";

const USE_MUAPI = process.env.NEXT_PUBLIC_USE_MUAPI_AI === "true" || process.env.USE_MUAPI_AI === "true";

export default async function handler(req, res) {
    const supabase = createClientComponentClient();
    const { video_url, language, ai_video_id, voice_id, text, video_id } =
        req.body;

    if (USE_MUAPI) {
        try {
            const result = await createAICloneMuapi({
                video_url,
                video_id,
                language,
                text,
                voice_id,
            });
            return res.status(200).json({ success: true, mode: "muapi", result });
        } catch (err: any) {
            console.error("[clone] Muapi path failed, falling back to legacy:", err.message);
            // fall through to legacy
        }
    }

    const { data, error } = await supabase
        .from("jobs")
        .insert([
            {
                job_details: {
                    ai_video_id: ai_video_id,
                },
                status: JOB_DETAILS.pending,
            },
        ])
        .select("id")
        .single();
    // Trigger the workflow (legacy Inngest + Sync.so)
    const event = await inngest.send({
        name: "ai/clone",
        data: {
            ai_video_id: ai_video_id,
            job_id: data.id,
            text: text,
            language: language,
            voice_id: voice_id,
            video_url: video_url,
            video_id: video_id,
        },
    });

    res.status(200).json({ success: true, mode: "legacy", event });
}
