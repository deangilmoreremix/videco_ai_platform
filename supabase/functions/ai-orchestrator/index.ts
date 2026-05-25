/**
 * Supabase Edge Function: ai-orchestrator
 *
 * Replaces Inngest "ai/process" and "ai/clone" jobs.
 * Triggered from Next.js API routes or directly via Supabase.
 *
 * Deploy:
 *   supabase functions deploy ai-orchestrator
 *   supabase secrets set MUAPI_API_KEY=... OPENAI_API_KEY=...
 *
 * Expected payload:
 * {
 *   action: "process" | "clone" | "personalize-script",
 *   ...job specific data
 * }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MUAPI_KEY = Deno.env.get("MUAPI_API_KEY")!;
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MUAPI_BASE = "https://api.muapi.ai/api/v1";

interface JobPayload {
  action: "process" | "clone" | "personalize-script";
  [key: string]: any;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  // Basic JWT check - in production use Supabase verify or custom
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: JobPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("[ai-orchestrator] received", payload.action);

  try {
    switch (payload.action) {
      case "personalize-script":
        return await handlePersonalizeScript(payload);

      case "process":
        return await handleProcessVideo(payload);

      case "clone":
        return await handleAiClone(payload);

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
    }
  } catch (err: any) {
    console.error("[ai-orchestrator] error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function handlePersonalizeScript(data: any) {
  const { lead, video_id } = data;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You write short personalized cold outreach video scripts. Return JSON {greeting, body, cta}",
        },
        { role: "user", content: JSON.stringify(lead) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const openaiRes = await res.json();
  const script = JSON.parse(openaiRes.choices?.[0]?.message?.content || "{}");

  if (video_id) {
    await supabase
      .from("videos")
      .update({ meta_data: { ...data, personalized_script: script } })
      .eq("id", video_id);
  }

  return new Response(JSON.stringify({ success: true, script }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleProcessVideo(data: any) {
  const { ai_video_id, text, voice_id, language, og_video_public_id, website } = data;

  await supabase
    .from("ai_videos")
    .update({ status: "processing" })
    .eq("id", ai_video_id);

  // 1. Generate voice with OpenAI TTS (or Muapi audio model)
  const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: "alloy",
    }),
  });

  const audioBuffer = await ttsRes.arrayBuffer();
  const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

  // 2. Upload audio to Muapi (or Supabase Storage)
  const audioUpload = await fetch(`${MUAPI_BASE}/upload_file`, {
    method: "POST",
    headers: { "x-api-key": MUAPI_KEY },
    body: JSON.stringify({ data: `data:audio/mp3;base64,${audioBase64}` }),
  }).then((r) => r.json());

  // 3. Submit lipsync / video+audio job to Muapi (example model)
  const videoJob = await fetch(`${MUAPI_BASE}/ai-video-lipsync`, {
    method: "POST",
    headers: {
      "x-api-key": MUAPI_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_url: og_video_public_id, // adjust to full URL
      audio_url: audioUpload.url,
    }),
  }).then((r) => r.json());

  // 4. Poll (or rely on webhook)
  // For now return job id - frontend / another function can poll
  await supabase
    .from("ai_videos")
    .update({
      status: "in_progress",
      ai_preview: videoJob.request_id,
    })
    .eq("id", ai_video_id);

  return new Response(JSON.stringify({ success: true, muapi_request_id: videoJob.request_id }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleAiClone(data: any) {
  const { video_url, audio_url, video_id, language } = data;

  const cloneJob = await fetch(`${MUAPI_BASE}/sd-2-omni-reference`, {
    method: "POST",
    headers: {
      "x-api-key": MUAPI_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: "talking head with perfect lip sync",
      video_url,
      audio_url,
    }),
  }).then((r) => r.json());

  if (video_id) {
    await supabase
      .from("videos")
      .update({
        ai_preview: cloneJob.request_id,
        media_status: "in_progress",
        language,
      })
      .eq("id", video_id);
  }

  return new Response(JSON.stringify({ success: true, request_id: cloneJob.request_id }), {
    headers: { "Content-Type": "application/json" },
  });
}
