import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import axios from "axios";
import { openai } from "../lib/openai";

export const JOB_DETAILS = {
    pending: "pending",
    processing: "processing",
    completed: "completed",
    failed: "failed",
};

const supabase = createClientComponentClient();

// createAIClone: dispatches a lipsync generation job via Muapi.
// Replaces the legacy Inngest + Cloudinary + Sync.so path.
// Audio is uploaded to Muapi directly; video processing happens via Muapi API.
export async function createAIClone(params: {
    video_id: string | number;
    voice_id: string;
    text: string;
    video_url: string;
    ai_video_id?: string;
    language?: string;
    webhookUrl?: string;
}) {
    const selectedVoice = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(params.voice_id)
        ? params.voice_id
        : "alloy";
    const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: selectedVoice,
        input: params.text,
    });
    const base64Audio = Buffer.from(await mp3.arrayBuffer()).toString("base64");
    const voice = { data: { audio_data: base64Audio } };

    const dataUri = `data:audio/mp3;base64,${voice.data.audio_data}`;
    let uploadedAudioUrl: string | null = null;
    try {
        const muRes = await axios.post(
            "https://api.muapi.ai/api/v1/upload_file",
            { data: dataUri },
            { headers: { "x-api-key": process.env.MUAPI_API_KEY || "" } },
        );
        uploadedAudioUrl = (muRes.data?.url ||
            muRes.data?.public_url ||
            muRes.data) as string;
    } catch (err) {
        throw new Error(`Muapi audio upload failed: ${err}`);
    }

    const muapiOptions = {
        method: "POST",
        url: `https://api.muapi.ai/api/v1/${
            process.env.MUAPI_LIPSYNC_MODEL || "sd-2-omni-reference"
        }`,
        headers: {
            "x-api-key": process.env.MUAPI_API_KEY || "",
            "Content-Type": "application/json",
        },
        data: {
            prompt: "lipsync generation",
            input: [
                { type: "video", url: params.video_url },
                { type: "audio", url: uploadedAudioUrl },
            ],
            options: { output_format: "mp4" },
            webhook: params.webhookUrl || undefined,
        },
    };
    const cloneFace = await axios(muapiOptions);
    const requestId =
        cloneFace.data.request_id ||
        cloneFace.data.id ||
        cloneFace.data?.request_id;

    const ai_video_update = await supabase
        .from("videos")
        .update({
            ai_preview: requestId,
            language: params.language,
            media_status: "in_progress",
        })
        .eq("id", params.video_id);

    const { error } = await supabase
        .from("jobs")
        .update([{ job_details: params, status: JOB_DETAILS.processing }])
        .eq("id", params.ai_video_id)
        .single();

    if (error) throw error;
    if (ai_video_update.error) throw ai_video_update.error;

    return { data: { request_id: requestId, job_id: params.ai_video_id } };
}
