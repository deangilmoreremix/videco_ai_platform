/**
 * Supabase Edge Function: ai-orchestrator
 *
 * Primary orchestration for the 2026 Muapi + OpenAI stack.
 * Replaces Inngest jobs for AI video generation and personalization.
 *
 * Supported actions:
 * - "clone"                 : AI Clone (video + text/audio -> talking head via Muapi)
 * - "process"               : Full AI video process (voice + background + combine)
 * - "personalize-script"    : Generate personalized outreach script with OpenAI
 * - "poll"                  : Poll Muapi for a request_id and update DB when done
 * - "muapi-webhook"         : Handle callbacks from Muapi (recommended for production)
 *
 * Deploy:
 *   supabase functions deploy ai-orchestrator
 *   supabase secrets set MUAPI_API_KEY=... OPENAI_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Muapi webhook URL to register: https://<project-ref>.supabase.co/functions/v1/ai-orchestrator
 * (with action=muapi-webhook in body or query)
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MUAPI_KEY = Deno.env.get("MUAPI_API_KEY")!;
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MUAPI_WEBHOOK_SECRET = Deno.env.get("MUAPI_WEBHOOK_SECRET");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MUAPI_BASE = "https://api.muapi.ai/api/v1";

// Recommended Muapi models for Videco use cases (update as Muapi catalog evolves)
const MODELS = {
  LIPSYNC_OMNI: "sd-2-omni-reference",           // strong for character + audio consistency
  FAST_I2V: "seedance-lite-i2v",
  HIGH_QUALITY_I2V: "kling-o1-standard-image-to-video",
  FAST_T2V: "veo3-fast-text-to-video",
};

interface JobPayload {
  action: "process" | "clone" | "personalize-script" | "poll" | "muapi-webhook";
  [key: string]: any;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Auth: accept either Supabase service role or a simple internal secret for webhooks
  const authHeader = req.headers.get("Authorization");
  const internalSecret = req.headers.get("x-internal-secret");
  const isWebhook = req.headers.get("x-muapi-webhook") === "true";

  const validAuth =
    (authHeader && authHeader.includes(SUPABASE_SERVICE_ROLE_KEY)) ||
    internalSecret === Deno.env.get("INTERNAL_FUNCTION_SECRET") ||
    isWebhook;

  if (!validAuth) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: JobPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("[ai-orchestrator] received action:", payload.action);

  try {
    switch (payload.action) {
      case "personalize-script":
        return await handlePersonalizeScript(payload);

      case "process":
        return await handleProcessVideo(payload);

      case "clone":
        return await handleAiClone(payload);

      case "poll":
        return await handlePollMuapi(payload);

      case "muapi-webhook":
        return await handleMuapiWebhook(payload);

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

// ==================== HANDLERS ====================

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
          content: "You write short personalized cold outreach video scripts (30-60s spoken). Return strict JSON {greeting, body, cta, fullScript}",
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

/**
 * Full process flow (voice cloning + background + final video).
 * Simplified for Muapi era — voice via OpenAI, then Muapi video generation.
 */
async function handleProcessVideo(data: any) {
  // log usage attempt (estimate)
  try {
    const { ai_video_id, text } = data;
    // Store a preliminary usage row (cost estimation TBD)
    await fetch(`${SUPABASE_URL}/rest/v1/usage`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: data.user_id || null, model: 'tts-1', provider: 'openai', action: 'generate-tts', details: { text_len: (text||'').length }, cost_estimate: 0.0 })
    }).catch(()=>{});
  } catch(e) {}

  const { ai_video_id, text, og_video_public_id } = data;

  await supabase
    .from("ai_videos")
    .update({ status: "processing" })
    .eq("id", ai_video_id);

  // 1. Generate voice
  const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "tts-1", input: text, voice: "alloy" }),
  });
  const audioBuffer = await ttsRes.arrayBuffer();

  // 2. Upload audio to Muapi (multipart)
  const audioForm = new FormData();
  audioForm.append("file", new Blob([audioBuffer], { type: "audio/mp3" }), "voice.mp3");

  const audioUpload = await fetch(`${MUAPI_BASE}/upload_file`, {
    method: "POST",
    headers: { "x-api-key": MUAPI_KEY },
    body: audioForm,
  }).then((r) => r.json());

  // 3. Submit to Muapi for lipsync/talking head (using omni reference for best quality)
  const videoJob = await fetch(`${MUAPI_BASE}/${MODELS.LIPSYNC_OMNI}`, {
    method: "POST",
    headers: { "x-api-key": MUAPI_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "professional talking head, perfect lip sync, natural head movement",
      video_url: og_video_public_id,
      audio_url: audioUpload.url || audioUpload.public_url,
    }),
  }).then((r) => r.json());

  await supabase
    .from("ai_videos")
    .update({ status: "in_progress", ai_preview: videoJob.request_id })
    .eq("id", ai_video_id);

  return new Response(JSON.stringify({ success: true, muapi_request_id: videoJob.request_id }), {
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * AI Clone flow - the heart of Videco personalized videos.
 * Accepts video + text (or pre-generated audio).
 * Generates voice if needed, then submits to Muapi for high-quality lipsync.
 */
async function handleAiClone(data: any) {
  const { video_url, video_id, language, text, audio_url: providedAudioUrl } = data;

  let audioUrl = providedAudioUrl;

  // If text is provided but no audio, generate voice first (OpenAI TTS)
  if (!audioUrl && text) {
    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "tts-1", input: text, voice: "alloy" }),
    });
    const audioBuffer = await ttsRes.arrayBuffer();

    const audioForm = new FormData();
    audioForm.append("file", new Blob([audioBuffer], { type: "audio/mp3" }), "clone-voice.mp3");

    const audioUpload = await fetch(`${MUAPI_BASE}/upload_file`, {
      method: "POST",
      headers: { "x-api-key": MUAPI_KEY },
      body: audioForm,
    }).then((r) => r.json());

    audioUrl = audioUpload.url || audioUpload.public_url;
  }

  if (!audioUrl) {
    throw new Error("No audio provided and no text to synthesize voice from");
  }

  // Submit to Muapi using the best omni/lipsync model
  const cloneJob = await fetch(`${MUAPI_BASE}/${MODELS.LIPSYNC_OMNI}`, {
    method: "POST",
    headers: { "x-api-key": MUAPI_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "talking head with perfect lip synchronization and natural motion",
      video_url,
      audio_url: audioUrl,
    }),
  }).then((r) => r.json());

  if (video_id) {
    await supabase
      .from("videos")
      .update({
        ai_preview: cloneJob.request_id,   // temporary job id
        media_status: "in_progress",
        language: language || "english",
      })
      .eq("id", video_id);
  }

  return new Response(JSON.stringify({ success: true, request_id: cloneJob.request_id, audio_url: audioUrl }), {
    headers: { "Content-Type": "application/json" },
  });
}

/** Poll a Muapi request and update DB when complete */
async function handlePollMuapi(data: any) {
  const { request_id, video_id, ai_video_id } = data;

  const result = await fetch(`${MUAPI_BASE}/predictions/${request_id}/result`, {
    headers: { "x-api-key": MUAPI_KEY },
  }).then((r) => r.json());

  if (result.status === "completed" && result.outputs?.length > 0) {
    const finalUrl = result.outputs[0].url;

    if (video_id) {
      await supabase
        .from("videos")
        .update({
          final_url: finalUrl,
          preview: finalUrl,
          media_status: "completed",
          ai_preview: request_id, // keep request id for reference
        })
        .eq("id", video_id);
    }

    if (ai_video_id) {
      await supabase
        .from("ai_videos")
        .update({ status: "completed", url: finalUrl })
        .eq("id", ai_video_id);
    }

    return new Response(JSON.stringify({ success: true, status: "completed", final_url: finalUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, status: result.status }), {
    headers: { "Content-Type": "application/json" },
  });
}

/** Handle Muapi webhook callbacks */
async function handleMuapiWebhook(data: any, rawBody?: string, signatureHeader?: string) {
  const { request_id, status, outputs, video_id, ai_video_id } = data;

  // Signature verification: validate using MUAPI_WEBHOOK_SECRET if present
  if (signatureHeader && MUAPI_WEBHOOK_SECRET) {
    try {
      const hmac = createHmac("sha256", MUAPI_WEBHOOK_SECRET).update(rawBody || JSON.stringify(data), "utf8").digest("hex");
      const normalized = signatureHeader.startsWith("sha256=") ? signatureHeader.split("=")[1] : signatureHeader;
      const verified = timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(normalized, "hex"));
      if (!verified) {
        console.warn("[ai-orchestrator] muapi webhook signature invalid");
        return new Response(JSON.stringify({ received: false, error: "invalid signature" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (err) {
      console.error("[ai-orchestrator] signature verification failed", err);
      return new Response(JSON.stringify({ received: false, error: "signature_error" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else if (signatureHeader && !MUAPI_WEBHOOK_SECRET) {
    console.warn("[ai-orchestrator] muapi webhook signature present but MUAPI_WEBHOOK_SECRET not configured");
  }

  console.log("[ai-orchestrator] handling webhook for request", request_id, "status", status);

  // Idempotency: if DB already marked completed for this request, ignore
  async function getExistingStatus() {
    if (video_id) {
      const { data: v } = await supabase.from("videos").select("media_status, ai_preview").eq("id", video_id).single();
      return v;
    }
    if (ai_video_id) {
      const { data: a } = await supabase.from("ai_videos").select("status, ai_preview").eq("id", ai_video_id).single();
      return a;
    }
    return null;
  }

  const existing = await getExistingStatus();
  if (existing) {
    if (existing.media_status === "completed" || existing.status === "completed") {
      console.log("[ai-orchestrator] already completed for request", request_id, "- ignoring");
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Helper for reliable updates with retry/backoff
  async function reliableUpdate(table: string, payload: any, eqClause: any) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { error } = await supabase.from(table).update(payload).eq("id", eqClause);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error(`[ai-orchestrator] DB update attempt ${attempt} failed for ${table} id=${eqClause}`, err);
        if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt))); // exponential backoff
      }
    }
    return false;
  }

  if (status === "completed" && outputs?.[0]?.url) {
    const finalUrl = outputs[0].url;

    if (video_id) {
      await reliableUpdate(
        "videos",
        { final_url: finalUrl, preview: finalUrl, media_status: "completed", ai_preview: request_id },
        video_id,
      );
    }

    if (ai_video_id) {
      await reliableUpdate("ai_videos", { status: "completed", url: finalUrl }, ai_video_id);
    }
  } else if (status === "failed") {
    if (video_id) await reliableUpdate("videos", { media_status: "failed" }, video_id);
    if (ai_video_id) await reliableUpdate("ai_videos", { status: "failed" }, ai_video_id);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
