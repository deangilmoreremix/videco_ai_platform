// ============================================================================
// Comprehensive Muapi + OpenAI router (Supabase Edge Function)
// Stack: Supabase + Muapi + OpenAI only
// ============================================================================
//
// Implements every Muapi capability the app needs:
//   - Text-to-image (Flux, Midjourney, HiDream, Seedream, GPT-4o, Reve, Qwen)
//   - Image-to-image / Edit (Flux Kontext, SeedEdit, Nano-Banana, Qwen-Edit)
//   - Text-to-video (Veo, Kling, Wan, Seedance, Runway, Hailuo, Hunyuan, Pixverse, Vidu)
//   - Image-to-video (Kling, Veo, Wan, Seedance, Runway, Pixverse, Vidu, Midjourney)
//   - Lip-sync (Sync, LatentSync, Creatify, Veed)
//   - Music generation (Suno create / remix / extend)
//   - Audio (MMAudio text-to-audio, video-to-audio)
//   - AI Video Effects (Wan AI Effects: stylization, restoration, animation)
//   - Image enhancement (upscale, background-remover, face-swap, colorize)
//   - (Muapi account / key management is deliberately not exposed)
//   - File upload (pass-through to Muapi for hosted URLs)
//   - OpenAI: script generation, content ideas, captions
//   - Storyboarding (project + character + scene + shot CRUD + asset generation)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-tenant-id, x-muapi-webhook-secret",
  "Content-Type": "application/json",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MUAPI_API_KEY = Deno.env.get("MUAPI_API_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const WEBHOOK_SHARED_SECRET = Deno.env.get("WEBHOOK_SHARED_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const MUAPI_BASE = "https://api.muapi.ai/api/v1";

// Optional: a public URL Muapi should call when a prediction finishes
// (e.g. https://<site>/functions/v1/webhooks/muapi behind an endpoint that
// does not require a Supabase JWT). Unset by default: jobs are completed by
// the client polling GET /api/jobs?id=..&action=poll (pollUntilDone).
// Muapi cannot send custom headers, so the shared secret rides as ?secret=.
const MUAPI_WEBHOOK_URL = Deno.env.get("MUAPI_WEBHOOK_URL") || "";
const WEBHOOK_URL = MUAPI_WEBHOOK_URL
  ? `${MUAPI_WEBHOOK_URL}${MUAPI_WEBHOOK_URL.includes("?") ? "&" : "?"}${
      WEBHOOK_SHARED_SECRET ? `secret=${encodeURIComponent(WEBHOOK_SHARED_SECRET)}` : ""
    }`.replace(/[?&]$/, "")
  : "";

const LIPSYNC_MODEL = Deno.env.get("MUAPI_LIPSYNC_MODEL") || "sync-lipsync";

// Videco runs on Muapi + OpenAI + Supabase only. Muapi has no voice cloning,
// TTS or compositing, so voices come from OpenAI TTS and personalised videos
// are Muapi lip-syncs of the user's recording.
const MEDIA_BUCKET = Deno.env.get("VIDECO_MEDIA_BUCKET") || "videco-videos";
const T2V_MODEL = "veo3-fast-text-to-video";

const requestIdOf = (submit: any): string | undefined =>
  submit?.request_id || submit?.data?.request_id || submit?.id;

const uploadedUrlOf = (upload: any): string | undefined =>
  upload?.url || upload?.public_url || upload?.data?.url ||
  (typeof upload === "string" ? upload : undefined);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: corsHeaders });

// ============================================================================
// Muapi helpers
// ============================================================================
async function muapiSubmit(
  endpoint: string,
  payload: Record<string, unknown>,
  queryParams: Record<string, string> = {}
): Promise<any> {
  const url = new URL(`${MUAPI_BASE}/${endpoint}`);
  const params = { ...queryParams };
  if (!params.webhook && WEBHOOK_URL) params.webhook = WEBHOOK_URL;
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "x-api-key": MUAPI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function muapiPoll(requestId: string): Promise<any> {
  const res = await fetch(`${MUAPI_BASE}/predictions/${requestId}/result`, {
    headers: { "x-api-key": MUAPI_API_KEY },
  });
  return res.json();
}

async function muapiGet(path: string): Promise<any> {
  const res = await fetch(`${MUAPI_BASE}/${path}`, {
    headers: { "x-api-key": MUAPI_API_KEY },
  });
  return res.json();
}

async function muapiDelete(path: string): Promise<any> {
  const res = await fetch(`${MUAPI_BASE}/${path}`, {
    method: "DELETE",
    headers: { "x-api-key": MUAPI_API_KEY },
  });
  return res.json();
}

async function muapiUpload(file: File): Promise<any> {
  const fd = new FormData();
  fd.append("file", file, file.name);
  const res = await fetch(`${MUAPI_BASE}/upload_file`, {
    method: "POST",
    headers: { "x-api-key": MUAPI_API_KEY },
    body: fd,
  });
  return res.json();
}

async function muapiUploadFromUrl(url: string): Promise<any> {
  const fileRes = await fetch(url);
  if (!fileRes.ok) throw new Error(`Failed to fetch ${url}`);
  const blob = await fileRes.blob();
  const fd = new FormData();
  fd.append("file", blob, "input.bin");
  const res = await fetch(`${MUAPI_BASE}/upload_file`, {
    method: "POST",
    headers: { "x-api-key": MUAPI_API_KEY },
    body: fd,
  });
  return res.json();
}

// ============================================================================
// OpenAI helpers
// ============================================================================
async function openaiResponses(
  input: string | Array<any>,
  opts: Record<string, unknown> = {}
): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input, ...opts }),
  });
  return res.json();
}

/** OpenAI TTS voices (stored per user in profiles.ai_voice_id). */
const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

/** OpenAI TTS -> upload to Muapi -> hosted audio URL usable by lipsync. */
async function synthesizeVoiceToMuapi(text: string, voice = "alloy"): Promise<string> {
  const allowed = OPENAI_VOICES;
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: allowed.includes(voice) ? voice : "alloy",
    }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS failed: ${res.status} ${await res.text()}`);
  const fd = new FormData();
  fd.append("file", new Blob([await res.arrayBuffer()], { type: "audio/mpeg" }), "voice.mp3");
  const upload = await fetch(`${MUAPI_BASE}/upload_file`, {
    method: "POST",
    headers: { "x-api-key": MUAPI_API_KEY },
    body: fd,
  }).then((r) => r.json());
  const url = uploadedUrlOf(upload);
  if (!url) throw new Error(`Muapi audio upload failed: ${JSON.stringify(upload)}`);
  return url;
}

/** The user's chosen OpenAI voice (set at the voice-preview step). */
async function getUserVoice(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase.from("profiles").select("ai_voice_id").eq("id", userId).maybeSingle();
  const v = (data as any)?.ai_voice_id;
  return OPENAI_VOICES.includes(v) ? v : null;
}

/** Speak `text` in the requested or saved voice; returns a hosted mp3 URL. */
async function speakAsUser(text: string, opts: { userId: string | null; voice?: string | null }): Promise<string> {
  const voice = (opts.voice && OPENAI_VOICES.includes(opts.voice) ? opts.voice : null) ||
    (await getUserVoice(opts.userId)) || "alloy";
  return synthesizeVoiceToMuapi(text, voice);
}

async function openaiExtractText(resp: any): Promise<string> {
  return (
    resp.output_text ||
    resp.output?.[0]?.content?.[0]?.text ||
    resp.choices?.[0]?.message?.content ||
    ""
  );
}

// ============================================================================
// Job persistence helpers
// ============================================================================
type JobType =
  | "text-to-video"
  | "image-to-video"
  | "text-to-image"
  | "image-edit"
  | "video-effects"
  | "lip-sync"
  | "upscale"
  | "background-remover"
  | "face-swap"
  | "music-create"
  | "music-remix"
  | "music-extend"
  | "audio-t2a"
  | "audio-v2v"
  | "storyboard-asset"
  | "ai-preview"
  | "ai-clone"
  | "ai-process"
  | "ai-onboarding";

type ResourceType = "video" | "image" | "audio" | "music" | "storyboard";

async function recordJob(opts: {
  tenantId: string;
  userId: string | null;
  type: JobType;
  model: string;
  requestId: string;
  input: Record<string, unknown>;
  resourceType?: ResourceType;
}): Promise<any> {
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      tenant_id: opts.tenantId,
      user_id: opts.userId,
      type: opts.type,
      model: opts.model,
      provider: "muapi",
      request_id: opts.requestId,
      status: "processing",
      input: opts.input,
      resource_type: opts.resourceType,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Normalise Muapi result shapes into a list of URLs. */
function extractOutputUrls(result: any): string[] {
  const raw = result?.outputs ?? result?.data?.outputs;
  if (Array.isArray(raw) && raw.length) {
    return raw
      .map((o: any) => (typeof o === "string" ? o : o?.url))
      .filter(Boolean);
  }
  const single =
    result?.video?.url || result?.image?.url || result?.url || result?.public_url;
  return single ? [single] : [];
}

/**
 * When a job was started for an existing row (clone -> videos.id,
 * campaign -> ai_videos.id), write the result back to that row so the
 * UI's realtime subscriptions pick it up.
 */
async function updateSourceRows(job: any, status: "completed" | "failed", url?: string) {
  const videoId = job?.input?.video_id;
  const aiVideoId = job?.input?.ai_video_id;
  if (videoId) {
    await supabase
      .from("videos")
      .update(
        status === "completed"
          ? { final_url: url, url, preview: url, media_status: "completed" }
          : { media_status: "failed" },
      )
      .eq("id", videoId);
  }
  if (aiVideoId) {
    await supabase
      .from("ai_videos")
      .update(status === "completed" ? { status: "completed", url } : { status: "failed" })
      .eq("id", aiVideoId);
  }
}

async function persistOutputs(
  job: any,
  result: any,
  resourceType: ResourceType
): Promise<{ outputs: string[]; resource?: any }> {
  const outputs = extractOutputUrls(result);

  if (job?.input?.video_id || job?.input?.ai_video_id) {
    // Result belongs to an existing row; don't create a duplicate video.
    if (outputs.length) await updateSourceRows(job, "completed", outputs[0]);
    return { outputs };
  }

  if (!outputs.length || !job) return { outputs };

  if (resourceType === "video") {
    const { data } = await supabase
      .from("videos")
      .insert({
        tenant_id: job.tenant_id,
        user_id: job.user_id,
        url: outputs[0],
        type: job.type,
        source: "muapi",
        model: job.model,
        job_id: job.id,
        metadata: { muapi_request_id: job.request_id },
      })
      .select()
      .single();
    return { outputs, resource: data };
  }

  if (resourceType === "image") {
    const { data } = await supabase
      .from("images")
      .insert({
        tenant_id: job.tenant_id,
        user_id: job.user_id,
        url: outputs[0],
        source: "muapi",
        model: job.model,
        job_id: job.id,
        metadata: { muapi_request_id: job.request_id },
      })
      .select()
      .single();
    return { outputs, resource: data };
  }

  if (resourceType === "audio" || resourceType === "music") {
    const { data } = await supabase
      .from("audios")
      .insert({
        tenant_id: job.tenant_id,
        user_id: job.user_id,
        url: outputs[0],
        kind: resourceType,
        model: job.model,
        job_id: job.id,
        metadata: { muapi_request_id: job.request_id },
      })
      .select()
      .single();
    return { outputs, resource: data };
  }

  return { outputs };
}

async function finalizeJob(
  jobId: string,
  status: "completed" | "failed",
  result: any,
  error?: string
): Promise<void> {
  await supabase
    .from("jobs")
    .update({
      status,
      output: result,
      error: error || null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// ============================================================================
// Auth helpers
// ============================================================================
async function getTenantFromRequest(req: Request): Promise<string | null> {
  // Derive the tenant from the verified user JWT only. A caller-supplied
  // x-tenant-id header is not trusted (it would let any caller act as any
  // tenant).
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const token = auth.replace("Bearer ", "");
  const { data } = await supabase.auth.getUser(token);
  const user = data.user;
  if (!user) return null;

  // Signup historically stored tenant_id in user_metadata; accept both.
  const fromMeta =
    (user.app_metadata as any)?.tenant_id || (user.user_metadata as any)?.tenant_id;
  if (fromMeta) return fromMeta;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();
  let tenantId: string | null = (profile as any)?.tenant_id || null;

  // Last resort: provision a tenant so the user isn't locked out.
  if (!tenantId) {
    const { data: tenant, error } = await supabase
      .from("tenants")
      .insert({ name: user.email ?? "Default Tenant" })
      .select("id")
      .single();
    if (error) {
      console.error("[api] tenant provisioning failed", error);
      return null;
    }
    tenantId = tenant.id;
    await supabase.from("profiles").update({ tenant_id: tenantId }).eq("id", user.id);
  }

  await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(user.app_metadata || {}), tenant_id: tenantId },
  });
  return tenantId;
}

/** Owner of a video, for attributing anonymous viewer submissions. */
async function videoOwner(videoId: unknown): Promise<{ id: string; user_id: string; tenant_id: string | null } | null> {
  if (typeof videoId !== "string" || !/^[0-9a-f-]{36}$/i.test(videoId)) return null;
  const { data } = await supabase.from("videos").select("id, user_id, tenant_id").eq("id", videoId).maybeSingle();
  return (data as any) || null;
}

const str = (v: unknown, max: number): string | null =>
  typeof v === "string" ? v.slice(0, max) : v == null ? null : String(v).slice(0, max);

/** Keep anonymous JSON payloads small. */
function limitJson(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object") return {};
  const text = JSON.stringify(v);
  return text.length > 20000 ? { truncated: true } : (v as Record<string, unknown>);
}

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const { data } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  return data.user?.id || null;
}

// ============================================================================
// Muapi capability map
// ============================================================================
const MODELS: Record<string, { type: string; resource: string }> = {
  // Image generation
  "flux-schnell": { type: "text-to-image", resource: "image" },
  "flux-dev": { type: "text-to-image", resource: "image" },
  "midjourney": { type: "text-to-image", resource: "image" },
  "gpt4o": { type: "text-to-image", resource: "image" },
  "hidream-fast": { type: "text-to-image", resource: "image" },
  "seedream": { type: "text-to-image", resource: "image" },
  "reve": { type: "text-to-image", resource: "image" },
  "qwen": { type: "text-to-image", resource: "image" },
  // Image edit
  "flux-kontext-dev": { type: "image-edit", resource: "image" },
  "flux-kontext-pro": { type: "image-edit", resource: "image" },
  "flux-kontext-max": { type: "image-edit", resource: "image" },
  "bytedance-seededit-v3": { type: "image-edit", resource: "image" },
  // Text-to-video
  "veo3-fast-text-to-video": { type: "text-to-video", resource: "video" },
  "veo3-text-to-video": { type: "text-to-video", resource: "video" },
  "kling-master-text-to-video": { type: "text-to-video", resource: "video" },
  "wan2.1-text-to-video": { type: "text-to-video", resource: "video" },
  "wan2.2-text-to-video": { type: "text-to-video", resource: "video" },
  "seedance-pro-t2v": { type: "text-to-video", resource: "video" },
  "seedance-lite-t2v": { type: "text-to-video", resource: "video" },
  "runway-text-to-video": { type: "text-to-video", resource: "video" },
  "hunyuan-text-to-video": { type: "text-to-video", resource: "video" },
  "pixverse-v5-t2v": { type: "text-to-video", resource: "video" },
  "vidu-v2.0-t2v": { type: "text-to-video", resource: "video" },
  "minimax-hailuo-02-std-t2v": { type: "text-to-video", resource: "video" },
  "minimax-hailuo-02-pro-t2v": { type: "text-to-video", resource: "video" },
  // Image-to-video (use same endpoint with image_url)
  "kling-o1-standard-image-to-video": { type: "image-to-video", resource: "video" },
  "kling-o1-pro-image-to-video": { type: "image-to-video", resource: "video" },
  "kling-o1-master-image-to-video": { type: "image-to-video", resource: "video" },
  "veo3.1-fast-image-to-video": { type: "image-to-video", resource: "video" },
  "wan2.5-image-to-video-fast": { type: "image-to-video", resource: "video" },
  "seedance-v1.5-pro-i2v-fast": { type: "image-to-video", resource: "video" },
  "grok-imagine-image-to-video": { type: "image-to-video", resource: "video" },
  // Lip-sync
  "sync-lipsync": { type: "lip-sync", resource: "video" },
  "latentsync-video": { type: "lip-sync", resource: "video" },
  "creatify-lipsync": { type: "lip-sync", resource: "video" },
  "veed-lipsync": { type: "lip-sync", resource: "video" },
  // Music
  "suno-create-music": { type: "music-create", resource: "music" },
  "suno-remix-music": { type: "music-remix", resource: "music" },
  "suno-extend-music": { type: "music-extend", resource: "music" },
  // Audio
  "mmaudio-v2-text-to-audio": { type: "audio-t2a", resource: "audio" },
  "mmaudio-v2-video-to-video": { type: "audio-v2v", resource: "audio" },
  // AI video effects (Wan)
  "generate_wan_ai_effects": { type: "video-effects", resource: "video" },
};

function pickModel(model: string | undefined, fallback: string) {
  return MODELS[model || fallback]
    ? model || fallback
    : fallback;
}

// ============================================================================
// Router
// ============================================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/^functions\/v1\/api\/?/, "");
  const segments = path.split("/").filter(Boolean);

  try {
    // ========================================================================
    // WEBHOOKS (no auth required, verified by shared secret)
    // ========================================================================
    if (segments[0] === "webhooks" && segments[1] === "muapi") {
      if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const provided =
        req.headers.get("x-muapi-webhook-secret") || url.searchParams.get("secret");
      // Without a configured secret anyone could mark jobs complete with
      // arbitrary URLs, so the webhook is disabled until one is set.
      if (!WEBHOOK_SHARED_SECRET || provided !== WEBHOOK_SHARED_SECRET) {
        return json({ error: "Invalid webhook secret" }, 401);
      }
      const payload = await req.json();
      const requestId = payload.request_id || payload.id || payload.data?.request_id;
      const status = payload.status || payload.data?.status;

      if (requestId) {
        const { data: job } = await supabase
          .from("jobs")
          .select("*")
          .eq("request_id", requestId)
          .single();
        if (job) {
          if (status === "completed") {
            const result = { outputs: payload.outputs || [], raw: payload };
            const resourceType = (job.resource_type ||
              MODELS[job.model]?.resource ||
              "video") as ResourceType;
            await persistOutputs(job, result, resourceType);
            await finalizeJob(job.id, "completed", result);
          } else if (status === "failed") {
            await updateSourceRows(job, "failed");
            await finalizeJob(job.id, "failed", payload, payload.error);
          }
        }
      }
      return json({ received: true });
    }

    // Muapi account / key management is intentionally NOT proxied: the
    // gateway only requires the public anon JWT, so those routes let anyone
    // list, create or delete the Muapi API keys and top up the account.
    // Manage them at https://muapi.ai instead.

    // ========================================================================
    // MUAPI MODEL CATALOG (live fetch)
    // ========================================================================
    if (segments[0] === "models" && req.method === "GET") {
      try {
        const result = await muapiGet("models");
        return json(result);
      } catch (err) {
        // Fallback: return static catalog
        return json({
          source: "static-fallback",
          models: Object.keys(MODELS).map((id) => ({
            id,
            ...MODELS[id],
          })),
        });
      }
    }

    // ========================================================================
    // MUAPI FILE UPLOAD
    // ========================================================================
    if (segments[0] === "upload" && req.method === "POST") {
      if (!(await getUserIdFromRequest(req))) return json({ error: "Auth required" }, 401);
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("multipart/form-data")) {
        const fd = await req.formData();
        const file = fd.get("file") as File;
        if (!file) return json({ error: "file required" }, 400);
        return json(await muapiUpload(file));
      }
      const body = await req.json();
      if (body.url) {
        return json(await muapiUploadFromUrl(body.url));
      }
      return json({ error: "Provide multipart file or { url }" }, 400);
    }

    // ========================================================================
    // IMAGE GENERATION (text-to-image)
    // ========================================================================
    if (segments[0] === "images" && segments[1] === "text-to-image" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, prompt, model = "flux-schnell", ...rest } = await req.json();
      const submit = await muapiSubmit(model, { prompt, ...rest });
      if (!submit.request_id && !submit.data?.request_id) {
        return json({ error: "Muapi submit failed", detail: submit }, 502);
      }
      const requestId = submit.request_id || submit.data.request_id;
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "text-to-image",
        model,
        requestId,
        input: { prompt, ...rest },
        resourceType: "image",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // IMAGE EDIT (inpaint, upscale, etc.)
    // ========================================================================
    if (segments[0] === "images" && segments[1] === "edit" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, prompt, image_url, model = "flux-kontext-pro", ...rest } = await req.json();
      const submit = await muapiSubmit(model, { prompt, image_url, ...rest });
      if (!submit.request_id && !submit.data?.request_id) {
        return json({ error: "Muapi submit failed", detail: submit }, 502);
      }
      const requestId = submit.request_id || submit.data.request_id;
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "image-edit",
        model,
        requestId,
        input: { prompt, image_url, ...rest },
        resourceType: "image",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // TEXT-TO-VIDEO
    // ========================================================================
    if (segments[0] === "videos" && segments[1] === "text-to-video" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, prompt, model = "veo3-fast-text-to-video", ...rest } = await req.json();
      const submit = await muapiSubmit(model, { prompt, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "text-to-video",
        model,
        requestId,
        input: { prompt, ...rest },
        resourceType: "video",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // IMAGE-TO-VIDEO
    // ========================================================================
    if (segments[0] === "videos" && segments[1] === "image-to-video" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, prompt, image_url, model = "kling-o1-standard-image-to-video", ...rest } = await req.json();
      const submit = await muapiSubmit(model, { prompt, image_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "image-to-video",
        model,
        requestId,
        input: { prompt, image_url, ...rest },
        resourceType: "video",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // LIP-SYNC
    // ========================================================================
    if (segments[0] === "videos" && segments[1] === "lip-sync" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, video_url, audio_url, model = "sync-lipsync", ...rest } = await req.json();
      const endpoint = model; // sync-lipsync | latentsync-video | creatify-lipsync | veed-lipsync
      const submit = await muapiSubmit(endpoint, { video_url, audio_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "lip-sync",
        model,
        requestId,
        input: { video_url, audio_url, ...rest },
        resourceType: "video",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // VIDEO EFFECTS (Wan AI Effects: stylization, restoration, animation)
    // ========================================================================
    if (segments[0] === "videos" && segments[1] === "effects" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, prompt, image_url, name, aspect_ratio = "16:9", resolution = "480p", quality = "medium", duration = 5 } = await req.json();
      const submit = await muapiSubmit("generate_wan_ai_effects", {
        prompt,
        image_url,
        name,
        aspect_ratio,
        resolution,
        quality,
        duration,
      });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "video-effects",
        model: "generate_wan_ai_effects",
        requestId,
        input: { prompt, image_url, name, aspect_ratio, resolution, quality, duration },
        resourceType: "video",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // IMAGE UPSCALE
    // ========================================================================
    if (segments[0] === "images" && segments[1] === "upscale" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, image_url, model, ...rest } = await req.json();
      const submit = await muapiSubmit(model || "image-upscale", { image_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "upscale",
        model: model || "image-upscale",
        requestId,
        input: { image_url, ...rest },
        resourceType: "image",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // BACKGROUND REMOVER
    // ========================================================================
    if (segments[0] === "images" && segments[1] === "background-remover" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, image_url, model, ...rest } = await req.json();
      const submit = await muapiSubmit(model || "background-remover", { image_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "background-remover",
        model: model || "background-remover",
        requestId,
        input: { image_url, ...rest },
        resourceType: "image",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // FACE SWAP
    // ========================================================================
    if (segments[0] === "videos" && segments[1] === "face-swap" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, source_url, target_url, model, ...rest } = await req.json();
      const submit = await muapiSubmit(model || "face-swap", {
        source_url,
        target_url,
        ...rest,
      });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "face-swap",
        model: model || "face-swap",
        requestId,
        input: { source_url, target_url, ...rest },
        resourceType: "video",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // MUSIC (Suno create / remix / extend)
    // ========================================================================
    if (segments[0] === "music" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, prompt, model = "suno-create-music", ...rest } = await req.json();
      const jobType: JobType =
        model === "suno-remix-music" ? "music-remix" :
        model === "suno-extend-music" ? "music-extend" : "music-create";
      const submit = await muapiSubmit(model, { prompt, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: jobType,
        model,
        requestId,
        input: { prompt, ...rest },
        resourceType: "music",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // AUDIO (MMAudio text-to-audio / video-to-audio)
    // ========================================================================
    if (segments[0] === "audio" && segments[1] === "text-to-audio" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, prompt, model = "mmaudio-v2-text-to-audio", ...rest } = await req.json();
      const submit = await muapiSubmit(model, { prompt, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "audio-t2a",
        model,
        requestId,
        input: { prompt, ...rest },
        resourceType: "audio",
      });
      return json({ job, muapi: submit });
    }

    if (segments[0] === "audio" && segments[1] === "video-to-audio" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, video_url, prompt, model = "mmaudio-v2-video-to-video", ...rest } = await req.json();
      const submit = await muapiSubmit(model, { video_url, prompt, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: "audio-v2v",
        model,
        requestId,
        input: { video_url, prompt, ...rest },
        resourceType: "audio",
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // STORYBOARDING (Project + Character + Scene + Shot)
    // ========================================================================
    if (segments[0] === "storyboard" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, name, brief } = await req.json();
      const { data, error } = await supabase
        .from("storyboard_projects")
        .insert({ tenant_id: tenantId, user_id, name, brief })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === "storyboard" && req.method === "GET") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { data, error } = await supabase
        .from("storyboard_projects")
        .select("*, storyboard_characters(*), storyboard_episodes(*)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (segments[0] === "storyboard" && segments[1] === "character" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const body = await req.json();
      const { data, error } = await supabase
        .from("storyboard_characters")
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === "storyboard" && segments[1] === "episode" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const body = await req.json();
      const { data, error } = await supabase
        .from("storyboard_episodes")
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === "storyboard" && segments[1] === "generate" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { episode_id, shot_index, character_ids, prompt, model = "veo3-fast-text-to-video" } = await req.json();

      const { data: ep } = await supabase
        .from("storyboard_episodes")
        .select("*")
        .eq("id", episode_id)
        .single();

      let mergedPrompt = prompt;
      if (character_ids?.length) {
        const { data: chars } = await supabase
          .from("storyboard_characters")
          .select("*")
          .in("id", character_ids);
        const desc = (chars || []).map((c: any) => `${c.name}: ${c.static_features || ""} ${c.dynamic_features || ""}`).join("; ");
        mergedPrompt = `${prompt}. Characters: ${desc}. Setting: ${ep?.setting || ""}.`;
      }

      const submit = await muapiSubmit(model, { prompt: mergedPrompt });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: null,
        type: "storyboard-asset",
        model,
        requestId,
        input: { episode_id, shot_index, character_ids, prompt: mergedPrompt },
        resourceType: "video",
      });

      await supabase.from("storyboard_shots").insert({
        episode_id,
        shot_index,
        prompt: mergedPrompt,
        model,
        job_id: job.id,
        tenant_id: tenantId,
      });

      return json({ job, muapi: submit });
    }

    // ========================================================================
    // JOBS (poll + list)
    // ========================================================================
    if (segments[0] === "jobs" && req.method === "GET") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const action = url.searchParams.get("action");
      const tenantId = await getTenantFromRequest(req);

      if (id && action === "poll") {
        const { data: job } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", id)
          .single();
        if (!job || !tenantId || job.tenant_id !== tenantId) {
          return json({ error: "Job not found" }, 404);
        }
        if (job.status === "completed" || job.status === "failed") {
          return json({ status: job.status, outputs: extractOutputUrls(job.output), error: job.error });
        }
        if (!job.request_id) return json({ status: job.status });
        const result = await muapiPoll(job.request_id);
        const status = result.status || result.data?.status;
        if (status === "completed") {
          const resourceType = (job.resource_type ||
            MODELS[job.model]?.resource ||
            "video") as ResourceType;
          const { outputs, resource } = await persistOutputs(job, result, resourceType);
          await finalizeJob(job.id, "completed", result);
          return json({ status: "completed", outputs, resource });
        }
        if (status === "failed") {
          await updateSourceRows(job, "failed");
          await finalizeJob(job.id, "failed", result, result.error || result.data?.error);
          return json({ status: "failed", error: result.error });
        }
        return json({ status, result });
      }

      if (!tenantId) return json({ error: "Auth required" }, 401);
      let query = supabase
        .from("jobs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);
      const type = url.searchParams.get("type");
      if (type) query = query.eq("type", type);
      const { data, error } = await query;
      if (error) throw error;
      return json(data);
    }

    // ========================================================================
    // VIDEOS / IMAGES / AUDIOS (CRUD with tenant isolation)
    // ========================================================================
    if (segments[0] === "videos" && req.method === "GET") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const url = new URL(req.url);
      let q = supabase.from("videos").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      const userId = url.searchParams.get("user_id");
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return json(data);
    }

    if (segments[0] === "videos" && req.method === "DELETE") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", segments[1])
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (segments[0] === "images" && req.method === "GET") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (segments[0] === "images" && req.method === "DELETE") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { error } = await supabase
        .from("images")
        .delete()
        .eq("id", segments[1])
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (segments[0] === "audios" && req.method === "GET") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { data, error } = await supabase
        .from("audios")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    // ========================================================================
    // OPENAI: Script / Idea / Caption / Hashtag / Title generation
    // ========================================================================
    if (segments[0] === "ai" && segments[1] === "script" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, prompt, model = "gpt-4o-mini", tone = "professional", max_words = 120 } = await req.json();
      const sysPrompt = `You are a top-tier sales copywriter. Write a ${tone} video script under ${max_words} words. Output only the script.`;
      const resp = await openaiResponses(
        [
          { role: "system", content: sysPrompt },
          { role: "user", content: prompt },
        ],
        { model }
      );
      const text = await openaiExtractText(resp);
      const { data, error } = await supabase
        .from("scripts")
        .insert({ tenant_id: tenantId, user_id, prompt, output: text, model, kind: "script" })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === "ai" && segments[1] === "ideas" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, prompt, model = "gpt-4o-mini", count = 5 } = await req.json();
      const resp = await openaiResponses(
        `Generate ${count} short, punchy personalized video ideas based on: ${prompt}. Return as a JSON array of strings.`,
        { model }
      );
      const text = await openaiExtractText(resp);
      let ideas: string[] = [];
      try {
        const match = text.match(/\[[\s\S]*\]/);
        ideas = match ? JSON.parse(match[0]) : text.split("\n").filter(Boolean);
      } catch {
        ideas = text.split("\n").filter(Boolean);
      }
      const { data, error } = await supabase
        .from("scripts")
        .insert({ tenant_id: tenantId, user_id, prompt, output: text, model, kind: "ideas" })
        .select()
        .single();
      if (error) throw error;
      return json({ script: data, ideas });
    }

    if (segments[0] === "ai" && segments[1] === "caption" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, prompt, platform = "linkedin", model = "gpt-4o-mini" } = await req.json();
      const resp = await openaiResponses(
        `Write a short ${platform} caption with hashtags for this video concept: ${prompt}`,
        { model }
      );
      const text = await openaiExtractText(resp);
      return json({ caption: text });
    }

    if (segments[0] === "ai" && segments[1] === "improve" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { user_id, text, model = "gpt-4o-mini" } = await req.json();
      const resp = await openaiResponses(
        `Improve the following video script for clarity, tone, and conversion. Return only the improved script.\n\n${text}`,
        { model }
      );
      const improved = await openaiExtractText(resp);
      const { data, error } = await supabase
        .from("scripts")
        .insert({ tenant_id: tenantId, user_id, prompt: text, output: improved, model, kind: "improved" })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    // ========================================================================
    // SUPABASE STORAGE HELPERS
    // ========================================================================
    if (segments[0] === "storage" && segments[1] === "upload" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const fd = await req.formData();
      const file = fd.get("file") as File;
      const bucket = (fd.get("bucket") as string) || "uploads";
      const path = `${tenantId}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      return json({ path, url: pub.publicUrl });
    }

    if (segments[0] === "storage" && segments[1] === "signed-url" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { bucket = MEDIA_BUCKET, path, expiresIn = 3600 } = await req.json();
      // Shared project: never sign URLs for other apps' buckets.
      if (bucket !== MEDIA_BUCKET) return json({ error: "Bucket not allowed" }, 403);
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);
      if (error) throw error;
      return json(data);
    }

    // ========================================================================
    // LEADS / SUBMISSIONS / FEEDBACK
    // ========================================================================
    if (segments[0] === "leads" && req.method === "POST") {
      // Public (video viewers are anonymous): attribute to the video owner.
      const body = await req.json();
      const owner = await videoOwner(body.video_id);
      if (!owner) return json({ error: "Unknown video" }, 404);
      const { data, error } = await supabase
        .from("leads")
        .insert({
          video_id: owner.id,
          user_id: owner.user_id,
          tenant_id: owner.tenant_id,
          name: str(body.name, 200),
          email: str(body.email, 320),
          phone: str(body.phone, 50),
          message: str(body.message, 5000),
          data: limitJson(body.data),
        })
        .select("id")
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === "leads" && req.method === "GET") {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (segments[0] === "submissions" && req.method === "POST") {
      // Public player form. The table stores the answers as `payload`
      // (the old code inserted the form fields as columns, which failed).
      const { video_id, ...fields } = await req.json();
      const owner = await videoOwner(video_id);
      if (!owner) return json({ error: "Unknown video" }, 404);
      delete (fields as Record<string, unknown>).user_id;
      delete (fields as Record<string, unknown>).tenant_id;
      const { data, error } = await supabase
        .from("submissions")
        .insert({ video_id: owner.id, tenant_id: owner.tenant_id, payload: limitJson(fields) })
        .select("id")
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === "feedback" && req.method === "POST") {
      // Public player question answers.
      const body = await req.json();
      const owner = await videoOwner(body.video_id);
      if (!owner) return json({ error: "Unknown video" }, 404);
      const { data, error } = await supabase
        .from("feedback")
        .insert({
          video_id: owner.id,
          user_id: owner.user_id,
          tenant_id: owner.tenant_id,
          question: str(body.question, 1000),
          answer: str(body.answer, 5000),
          session_id: str(body.session_id, 200),
        })
        .select("id")
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    // ========================================================================
    // PERSONALIZED VIDEO FLOWS (Muapi + OpenAI)
    //   preview    : spoken greeting preview in the chosen OpenAI voice
    //                (videos.ai_preview); saves the voice on the profile
    //   process    : per-lead campaign video: OpenAI speaks the greeting +
    //                name, Muapi lip-syncs the user's recording to it
    //   clone      : lip-sync the recording to a script
    //   onboarding : text-to-video welcome clip
    // All return { data: { job_id, request_id?, mode, status } }.
    // ========================================================================
    if (
      segments[0] === "videos" &&
      ["preview", "clone", "process", "onboarding"].includes(segments[1]) &&
      req.method === "POST"
    ) {
      const tenantId = await getTenantFromRequest(req);
      if (!tenantId) return json({ error: "Auth required" }, 401);
      const userId = (await getUserIdFromRequest(req)) || null;
      const body = await req.json();
      const kind = segments[1];
      const aiVideoId = body.ai_video_id && body.ai_video_id !== "test_id" ? body.ai_video_id : null;

      // ---- preview: greeting in the chosen voice --------------------------
      if (kind === "preview") {
        const script = [body.greeting, body.text].filter(Boolean).join(" ");
        if (!script) return json({ error: "greeting or text required" }, 400);
        const voice = OPENAI_VOICES.includes(body.voice_id)
          ? body.voice_id
          : (await getUserVoice(userId)) || "alloy";
        const previewUrl = await synthesizeVoiceToMuapi(script, voice);
        // The UI moves on once profiles.ai_voice_id is set.
        await supabase.from("profiles").upsert({ id: userId, ai_voice_id: voice }, { onConflict: "id" });

        if (body.video_id) {
          await supabase
            .from("videos")
            .update({
              ai_preview: previewUrl,
              training_audio: body.audio || body.audio_url || null,
              language: body.language,
            })
            .eq("id", body.video_id);
        }
        const job = await recordJob({
          tenantId,
          userId,
          type: "ai-preview",
          model: "openai-tts",
          requestId: `preview:${crypto.randomUUID()}`,
          input: { video_id: body.video_id || null, voice },
          resourceType: "audio",
        });
        await finalizeJob(job.id, "completed", { outputs: [previewUrl], voice });
        return json({ data: { job_id: job.id, mode: "openai-tts", status: "completed", url: previewUrl } }, 201);
      }

      // ---- clone / onboarding: Muapi jobs --------------------------------
      let type: JobType;
      let model: string;
      let payload: Record<string, unknown>;

      if (kind === "onboarding") {
        type = "ai-onboarding";
        model = pickModel(body.model, T2V_MODEL);
        const prompt = body.prompt || body.text;
        if (!prompt) return json({ error: "prompt required" }, 400);
        payload = { prompt };
      } else {
        type = kind === "process" ? "ai-process" : "ai-clone";
        model = body.model || LIPSYNC_MODEL;

        let videoUrl: string | undefined = body.video_url || body.og_video_url;
        if (!videoUrl && body.video_id) {
          const { data: v } = await supabase
            .from("videos")
            .select("url, final_url")
            .eq("id", body.video_id)
            .maybeSingle();
          videoUrl = (v as any)?.url || (v as any)?.final_url;
        }
        if (!videoUrl) return json({ error: "video_url (or video_id with a url) required" }, 400);

        let audioUrl: string | undefined = body.audio_url;
        if (!audioUrl) {
          // Campaign: "<greeting> <first name>"; clone: the full script.
          const script = kind === "process"
            ? [body.greeting, body.text].filter(Boolean).join(" ")
            : body.text;
          if (!script) return json({ error: "text or audio_url required" }, 400);
          audioUrl = await speakAsUser(script, { userId, voice: body.voice_id });
        }
        payload = { video_url: videoUrl, audio_url: audioUrl };
      }

      const submit = await muapiSubmit(model, payload);
      const requestId = requestIdOf(submit);
      if (!requestId) return json({ error: "Muapi submit failed", detail: submit }, 502);

      const job = await recordJob({
        tenantId,
        userId: body.user_id || body.userId || userId,
        type,
        model,
        requestId,
        input: { ...payload, video_id: body.video_id || null, ai_video_id: aiVideoId },
        resourceType: "video",
      });

      if (body.video_id) {
        // ai_preview holds the voice preview URL; the job row carries the
        // Muapi request id.
        await supabase.from("videos").update({ media_status: "in_progress" }).eq("id", body.video_id);
      }
      if (aiVideoId) {
        await supabase.from("ai_videos").update({ status: "in_progress", ai_preview: requestId }).eq("id", aiVideoId);
      }

      return json({ data: { job_id: job.id, request_id: requestId, mode: "muapi", status: "processing" } }, 201);
    }

    // ========================================================================
    // AUTH
    // ========================================================================
    // (auth/signup removed: it let anyone create confirmed users in the
    // shared auth project with any tenant id. Users sign up through
    // Supabase Auth on the client.)

    if (segments[0] === "auth" && segments[1] === "invite" && req.method === "POST") {
      const tenantId = await getTenantFromRequest(req);
      const inviterId = await getUserIdFromRequest(req);
      if (!tenantId || !inviterId) return json({ error: "Auth required" }, 401);
      const { email, full_name, workspace_id } = await req.json();
      if (!email || typeof email !== "string") return json({ error: "email required" }, 400);
      const siteUrl = Deno.env.get("SITE_URL") || "https://app.videco.io";
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name: str(full_name, 200), tenant_id: tenantId, invited_by: inviterId, workspace_id },
        redirectTo: `${siteUrl}/auth/login`,
      });
      if (error) throw error;
      return json({ user: { id: data.user?.id, email: data.user?.email } });
    }

    return json({ error: "Not found", path }, 404);
  } catch (err) {
    console.error("Edge Function error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});