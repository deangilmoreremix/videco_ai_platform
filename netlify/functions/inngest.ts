import { Inngest } from "inngest";
import { createClient } from "@supabase/supabase-js";

const inngest = new Inngest({ id: "videco", name: "Videco AI" });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

export const JOB_DETAILS = {
  pending: "pending",
  processing: "processing",
  completed: "completed",
  failed: "failed",
};

export const processAIVideos = inngest.createFunction(
  { id: "ai-process" },
  { event: "ai/process" },
  async ({ event, step, logger }) => {
    const { ai_video_id: aiVideoId, job_id: jobId, text, language, voice_id: voiceId, greeting, background, og_video_public_id: ogVideoPublicId, website, voiceCloningEnabled } = event.data;

    await supabase.from("ai_videos").update({ status: "pending" }).eq("id", aiVideoId);

    let voiceCloningResult;
    if (voiceCloningEnabled) {
      const voiceRes = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ input: text, voice: voiceId }),
      });
      const voiceData = await voiceRes.json();
      voiceCloningResult = uploadToCloudinary(`data:audio/mp3;base64,${voiceData.audio_data}`, "video");
    }

    let videoUrl = "";
    if (background === "website") {
      const screenshotRes = await fetch(`https://api.screenshotone.com/animate?access_key=${process.env.SCREENSHOTONE_KEY}&url=${website}&format=mp4&block_ads=true&scroll_duration=1500&scroll_by=1000`);
      const screenshotBlob = await screenshotRes.blob();
      const videoBG = uploadToCloudinary(screenshotBlob, "video");

      videoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${ogVideoPublicId}.mp3`;
    } else {
      videoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${ogVideoPublicId}.mp3`;
    }

    await supabase.from("ai_videos").update({ url: videoUrl, status: "completed" }).eq("id", aiVideoId);
    await supabase.from("jobs").update({ job_details: event, status: JOB_DETAILS.completed }).eq("id", jobId);

    return { event: "ai/process-completed", data: { aiVideoId, videoUrl } };
  }
);

export const processOnboardingVideo = inngest.createFunction(
  { id: "ai-onboarding" },
  { event: "ai/onboarding" },
  async ({ event }) => {
    const { user_id: userId, job_id: jobId, text, language, voice_id: voiceId, greeting, background, og_video_public_id: ogVideoPublicId, website, voiceCloningEnabled } = event.data;

    await supabase.from("ai_videos").update({ status: "pending" }).eq("id", userId);

    let voiceCloningResult;
    if (voiceCloningEnabled) {
      const voiceRes = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ input: text, voice: voiceId }),
      });
      const voiceData = await voiceRes.json();
      voiceCloningResult = uploadToCloudinary(`data:audio/mp3;base64,${voiceData.audio_data}`, "video");
    }

    let videoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${ogVideoPublicId}.mp3`;
    if (background === "website") {
      const screenshotRes = await fetch(`https://api.screenshotone.com/animate?access_key=${process.env.SCREENSHOTONE_KEY}&url=${website}&format=mp4`);
      const screenshotBlob = await screenshotRes.blob();
      uploadToCloudinary(screenshotBlob, "video");
      videoUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${ogVideoPublicId}.mp3`;
    }

    await supabase.from("profiles").update({ onboarding_video: videoUrl }).eq("id", userId);
    await supabase.from("jobs").update({ job_details: event, status: JOB_DETAILS.completed }).eq("id", jobId);

    return { event: "ai/onboarding-completed", data: { userId, videoUrl } };
  }
);

export const createAIIntro = inngest.createFunction(
  { id: "ai-intro" },
  { event: "ai/intro" },
  async ({ event }) => {
    const { video_id: videoId, job_id: jobId, audio, text, language, userId: userId, userName, email, greeting } = event.data;

    const voiceRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ input: `${greeting} ${text}`, voice: "alloy" }),
    });
    const voiceData = await voiceRes.json();
    const result = uploadToCloudinary(`data:audio/mp3;base64,${voiceData.audio_data}`, "video");

    await supabase.from("videos").update({
      ai_preview: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${result.public_id}.mp3`,
      training_audio: audio,
      language,
    }).eq("id", videoId);

    await supabase.from("profiles").update({ ai_voice_id: result.public_id }).eq("id", userId);

    await supabase.from("jobs").update({ job_details: event, status: JOB_DETAILS.completed }).eq("id", jobId);

    return { event: "ai/intro-completed", data: { videoId } };
  }
);

export const createAIClone = inngest.createFunction(
  { id: "ai-clone" },
  { event: "ai/clone" },
  async ({ event }) => {
    const { video_url: videoUrl, language, ai_video_id: aiVideoId, voice_id: voiceId, text, video_id: videoId } = event.data;

    const voiceRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ input: text, voice: voiceId }),
    });
    const voiceData = await voiceRes.json();
    const audioResult = uploadToCloudinary(`data:audio/mp3;base64,${voiceData.audio_data}`, "video");

    const syncRes = await fetch("https://api.sync.so/v2/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.SYNC_API_KEY },
      body: JSON.stringify({
        model: "lipsync-1.8.0",
        input: [
          { type: "video", url: videoUrl },
          { type: "audio", url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${audioResult.public_id}.mp3` },
        ],
        options: { output_format: "mp4" },
        webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/sync`,
      }),
    });
    const syncData = await syncRes.json();

    await supabase.from("videos").update({
      ai_preview: syncData.id,
      language,
      media_status: "in_progress",
    }).eq("id", videoId);

    await supabase.from("jobs").update({ job_details: event, status: JOB_DETAILS.completed }).eq("id", event.data.job_id);

    return { event: "ai/clone-completed", data: { videoId, syncId: syncData.id } };
  }
);

async function uploadToCloudinary(file: string | Blob, resourceType: "video" | "image" | "auto") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "videco");
  formData.append("resource_type", resourceType);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );
  return res.json();
}

export { inngest };
