import { inngest, JOB_DETAILS } from "src/services/inngest";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const USE_MUAPI = process.env.NEXT_PUBLIC_USE_MUAPI_AI === "true" || process.env.USE_MUAPI_AI === "true";

export default async function handler(req, res) {
    const supabase = createClientComponentClient();
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
        // For full process (voice + background + combine) we dispatch to Edge Function
        try {
            const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-orchestrator`;
            const result = await fetch(edgeUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
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

            return res.status(200).json({ success: true, mode: "muapi", result });
        } catch (err: any) {
            console.error("[process] Muapi path failed, falling back:", err.message);
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
    // Trigger the workflow (legacy)
    const event = await inngest.send({
        name: "ai/process",
        data: {
            ai_video_id: ai_video_id,
            job_id: data.id,
            text: text,
            language: language,
            voice_id: voice_id,
            greeting: greeting,
            background: background,
            og_video_public_id: og_video_public_id,
            website: website,
            voiceCloningEnabled: voiceCloningEnabled,
        },
    });

    res.status(200).json({ success: true, mode: "legacy", event });
}
