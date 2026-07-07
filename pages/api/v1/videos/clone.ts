import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createAIClone } from "src/services/aiClone";

const USE_MUAPI =
    process.env.NEXT_PUBLIC_USE_MUAPI_AI === "true" ||
    process.env.USE_MUAPI_AI === "true";

export default async function handler(req, res) {
    const supabase = createClientComponentClient();
    const { video_url, language, ai_video_id, voice_id, text, video_id } =
        req.body;

    if (USE_MUAPI) {
        try {
            const result = await createAIClone({
                video_url,
                video_id,
                language,
                text,
                voice_id,
            });
            return res
                .status(200)
                .json({ success: true, mode: "muapi", result });
        } catch (err: any) {
            console.error("[clone] Muapi path failed:", err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    const { data, error } = await supabase
        .from("jobs")
        .insert([
            {
                job_details: {
                    ai_video_id: ai_video_id,
                },
                status: "pending",
            },
        ])
        .select("id")
        .single();

    if (error) {
        return res.status(500).json({ success: false, error: error.message });
    }

    console.log("[clone] Accepted AI clone request", {
        jobId: data.id,
        video_id,
    });

    res.status(200).json({ success: true, mode: "stub", job_id: data.id });
}
