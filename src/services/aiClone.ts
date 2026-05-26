import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import axios from "axios";
import { Inngest } from "inngest";
import { v2 as cloudinary } from "cloudinary";
import { makeTextToVoice } from "./api/aiVoice";

export const JOB_DETAILS = {
    pending: "pending",
    processing: "processing",
    completed: "completed",
    failed: "failed",
};

// Create a client to send and receive events
export const inngest = new Inngest({ id: "my-app" });
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const supabase = createClientComponentClient();

export const createAIClone = inngest.createFunction(
    { id: "ai-clone" },
    { event: "ai/clone" },
    async ({ event, step }) => {
        const voice = await makeTextToVoice(
            event.data.text,
            null,
            event.data.voice_id,
            event.data.language,
        );

        // Upload audio dataUri to Muapi upload_file endpoint instead of Cloudinary
        const dataUri = `data:audio/mp3;base64,${voice.data.audio_data}`;
        let uploadedAudioUrl = null;
        try {
            const muRes = await axios.post(
                "https://api.muapi.ai/api/v1/upload_file",
                { data: dataUri },
                { headers: { "x-api-key": process.env.MUAPI_API_KEY || "" } },
            );
            uploadedAudioUrl = muRes.data?.url || muRes.data?.public_url || muRes.data;
        } catch (err) {
            // Fallback: try to upload to Supabase storage via server endpoint
            try {
                const fallback = await axios.post(
                    `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/v1/videos/cloudinary`,
                    // send JSON with dataUri so server can upload
                    { fileDataUri: dataUri },
                );
                uploadedAudioUrl = fallback.data?.result?.publicUrl || fallback.data?.result?.public_url;
            } catch (e) {
                throw err; // original upload error
            }
        }

        // Prepare Muapi lipsync request (use Muapi instead of Sync.so)
        const muapiOptions = {
            method: "POST",
            url: `https://api.muapi.ai/api/v1/${process.env.MUAPI_LIPSYNC_MODEL || 'sd-2-omni-reference'}`,
            headers: {
                "x-api-key": process.env.MUAPI_API_KEY || "",
                "Content-Type": "application/json",
            },
            data: {
                prompt: "lipsync generation",
                input: [
                    { type: "video", url: event.data.video_url },
                    { type: "audio", url: uploadedAudioUrl },
                ],
                options: { output_format: "mp4" },
                webhook: event.data.webhookUrl || undefined,
            },
        };
        const cloneFace = await axios(muapiOptions);
        const ai_video_update = await supabase
            .from("videos")
            .update({
                ai_preview: cloneFace.data.request_id || cloneFace.data.id || cloneFace.data?.request_id, // store request id
                language: event.data.language,
                media_status: "in_progress",
            })
            .eq("id", event.data.video_id);

        const { data, error } = await supabase
            .from("jobs")
            .update([
                {
                    job_details: event,
                    status: JOB_DETAILS.completed, //Might not be completed because of the Webhook stuff
                },
            ])
            .eq("id", event.data.job_id)
            .single();
        if (error) throw error;
        if (ai_video_update.error) throw error;

        return { event: ai_video_update, body: result };
    },
);

/**
 * NEW 2026: Muapi + OpenAI path for AI Clone (lipsync).
 * Dispatches to Supabase Edge Function "ai-orchestrator".
 * Keeps the old Inngest/Sync path untouched for rollback.
 */
export async function createAICloneMuapi(params: {
  video_url: string;
  audio_url?: string;
  video_id: string | number;
  language?: string;
  text?: string;
  voice_id?: string;
}) {
  const useMuapi = process.env.NEXT_PUBLIC_USE_MUAPI_AI === "true" || process.env.USE_MUAPI_AI === "true";

  if (!useMuapi) {
    // Fallback to legacy (caller should use old createAIClone via Inngest)
    throw new Error("Muapi path disabled. Set NEXT_PUBLIC_USE_MUAPI_AI=true");
  }

  const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-orchestrator`;

  const res = await fetch(edgeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      action: "clone",
      ...params,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Edge AI clone failed: ${err}`);
  }

  return res.json();
}
