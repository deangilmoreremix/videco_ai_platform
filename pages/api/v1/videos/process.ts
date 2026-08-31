import { supabase } from "src/services";

const USE_MUAPI =
    process.env.NEXT_PUBLIC_USE_MUAPI_AI === "true" ||
    process.env.USE_MUAPI_AI === "true";

export default async function handler(req, res) {
    const {
        greeting,
        language,
        ai_video_id,
        voice_id,
        text,
        background,
        website,
        voiceCloningEnabled = true,
        og_video_public_id,
    } = req.body;

    if (USE_MUAPI) {
        try {
            const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-orchestrator`;
            const result = await fetch(edgeUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${
                        process.env.SUPABASE_SERVICE_ROLE_KEY ||
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                    }`,
                },
                body: JSON.stringify({
                    action: "process",
                    ai_video_id,
                    text,
                    voice_id,
                    language,
                    og_video_public_id,
                    website,
                    voiceCloningEnabled,
                    greeting,
                    background,
                }),
            }).then((r) => r.json());

            return res
                .status(200)
                .json({ success: true, mode: "muapi", result });
        } catch (err: any) {
            console.error("[process] Muapi path failed:", err.message);
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

    console.log("[process] Accepted AI video processing request", {
        jobId: data.id,
        ai_video_id,
    });

    res.status(200).json({ success: true, mode: "stub", job_id: data.id });
}
