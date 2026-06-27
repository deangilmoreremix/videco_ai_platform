import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Singleton client for browser use.
// ============================================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ============================================================================
// Direct-call helper to Supabase Edge Functions.
// ============================================================================
const FN_BASE = `${SUPABASE_URL}/functions/v1`;

async function callMuapi<T = unknown>(
  endpoint: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const tenantId = (session?.user?.app_metadata as any)?.tenant_id;
  const res = await fetch(`${FN_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function callMuapiGet<T = unknown>(endpoint: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const tenantId = (session?.user?.app_metadata as any)?.tenant_id;
  const res = await fetch(`${FN_BASE}/${endpoint}`, {
    method: "GET",
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ============================================================================
// IMAGE GENERATION (Muapi text-to-image + image-edit + enhancement)
// ============================================================================
export const generateImage = (
  prompt: string,
  opts: { model?: string; user_id?: string; tenant_id?: string; [k: string]: any } = {}
) => callMuapi("images/text-to-image", { prompt, ...opts });

export const editImage = (
  prompt: string,
  image_url: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("images/edit", { prompt, image_url, ...opts });

export const upscaleImage = (
  image_url: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("images/upscale", { image_url, ...opts });

export const removeImageBackground = (
  image_url: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("images/background-remover", { image_url, ...opts });

// ============================================================================
// VIDEO GENERATION (Muapi text-to-video + image-to-video + effects + lip-sync + face-swap)
// ============================================================================
export const generateVideo = (
  prompt: string,
  opts: {
    model?: string;
    user_id?: string;
    aspect_ratio?: string;
    duration?: number;
    resolution?: string;
    quality?: string;
    [k: string]: any;
  } = {}
) => callMuapi("videos/text-to-video", { prompt, ...opts });

export const imageToVideo = (
  prompt: string,
  image_url: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("videos/image-to-video", { prompt, image_url, ...opts });

export const applyVideoEffects = (
  prompt: string,
  image_url: string,
  opts: {
    name: string;
    model?: string;
    user_id?: string;
    aspect_ratio?: string;
    resolution?: string;
    quality?: string;
    duration?: number;
  }
) => callMuapi("videos/effects", { prompt, image_url, ...opts });

export const lipSync = (
  video_url: string,
  audio_url: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("videos/lip-sync", { video_url, audio_url, ...opts });

export const faceSwap = (
  source_url: string,
  target_url: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("videos/face-swap", { source_url, target_url, ...opts });

// ============================================================================
// MUSIC + AUDIO (Suno + MMAudio)
// ============================================================================
export const generateMusic = (
  prompt: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("music", { prompt, ...opts });

export const remixMusic = (
  prompt: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("music", { prompt, model: "suno-remix-music", ...opts });

export const extendMusic = (
  prompt: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("music", { prompt, model: "suno-extend-music", ...opts });

export const textToAudio = (
  prompt: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("audio/text-to-audio", { prompt, ...opts });

export const videoToAudio = (
  video_url: string,
  prompt: string,
  opts: { model?: string; user_id?: string; [k: string]: any } = {}
) => callMuapi("audio/video-to-audio", { video_url, prompt, ...opts });

// ============================================================================
// JOBS (poll + list)
// ============================================================================
export const pollJob = (jobId: string) =>
  callMuapiGet(`jobs?id=${jobId}&action=poll`);

export const listJobs = (type?: string) =>
  callMuapiGet(`jobs${type ? `?type=${encodeURIComponent(type)}` : ""}`);

// ============================================================================
// LIBRARY (videos / images / audios CRUD)
// ============================================================================
export const listVideos = (user_id?: string) =>
  callMuapiGet(`videos${user_id ? `?user_id=${user_id}` : ""}`);

export const listImages = () => callMuapiGet("images");

export const listAudios = () => callMuapiGet("audios");

// ============================================================================
// FILE UPLOAD (Muapi hosted URL passthrough)
// ============================================================================
export async function uploadFile(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const { data: { session } } = await supabase.auth.getSession();
  const tenantId = (session?.user?.app_metadata as any)?.tenant_id;
  const res = await fetch(`${FN_BASE}/upload`, {
    method: "POST",
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ============================================================================
// SUPABASE STORAGE (helper for non-AI uploads)
// ============================================================================
export async function uploadToStorage(
  file: File,
  bucket = "uploads",
  tenantId = "default"
) {
  const path = `${tenantId}/${crypto.randomUUID()}-${file.name}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { path: data.path, url: pub.publicUrl };
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
) {
  return callMuapi("storage/signed-url", { bucket, path, expiresIn });
}

// ============================================================================
// MODEL CATALOG (live from Muapi, with fallback)
// ============================================================================
export const getModelCatalog = () => callMuapiGet("models");

// ============================================================================
// MUAPI ACCOUNT
// ============================================================================
export const getAccountBalance = () => callMuapiGet("account/balance");

export const topUpAccount = (amount: number) =>
  callMuapi("account/topup", { amount });

// ============================================================================
// STORYBOARDING
// ============================================================================
export const createStoryboardProject = (
  name: string,
  brief: string,
  opts: { user_id?: string } = {}
) => callMuapi("storyboard", { name, brief, ...opts });

export const listStoryboardProjects = () => callMuapiGet("storyboard");

export const createStoryboardCharacter = (
  project_id: string,
  character: { name: string; static_features?: string; dynamic_features?: string; reference_image_url?: string }
) => callMuapi("storyboard/character", { project_id, ...character });

export const createStoryboardEpisode = (
  project_id: string,
  episode: { episode_number: number; title?: string; setting?: string; mood?: string }
) => callMuapi("storyboard/episode", { project_id, ...episode });

export const generateStoryboardShot = (
  episode_id: string,
  shot_index: number,
  opts: {
    prompt: string;
    character_ids?: string[];
    model?: string;
    camera_angle?: string;
    shot_type?: string;
  }
) => callMuapi("storyboard/generate", { episode_id, shot_index, ...opts });

// ============================================================================
// OPENAI: script / ideas / caption / improve
// ============================================================================
export const generateScript = (
  prompt: string,
  opts: { tone?: string; max_words?: number; model?: string; user_id?: string } = {}
) => callMuapi("ai/script", { prompt, ...opts });

export const generateIdeas = (
  prompt: string,
  opts: { count?: number; model?: string; user_id?: string } = {}
) => callMuapi("ai/ideas", { prompt, ...opts });

export const generateCaption = (
  prompt: string,
  opts: { platform?: string; model?: string; user_id?: string } = {}
) => callMuapi("ai/caption", { prompt, ...opts });

export const improveScript = (
  text: string,
  opts: { model?: string; user_id?: string } = {}
) => callMuapi("ai/improve", { text, ...opts });

// ============================================================================
// LEADS / SUBMISSIONS / FEEDBACK
// ============================================================================
export const submitLead = (payload: Record<string, unknown>) =>
  callMuapi("leads", payload);

export const submitForm = (payload: Record<string, unknown>) =>
  callMuapi("submissions", payload);

export const submitFeedback = (payload: Record<string, unknown>) =>
  callMuapi("feedback", payload);

// ============================================================================
// AUTH (admin invite via Edge Function)
// ============================================================================
export const inviteTeamMember = (email: string, full_name: string, tenant_id: string) =>
  callMuapi("auth/invite", { email, full_name, tenant_id });

// ============================================================================
// DEFAULT EXPORT: grouped API surface
// ============================================================================
export const muapi = {
  // Image
  generateImage,
  editImage,
  upscaleImage,
  removeImageBackground,
  // Video
  generateVideo,
  imageToVideo,
  applyVideoEffects,
  lipSync,
  faceSwap,
  // Audio
  generateMusic,
  remixMusic,
  extendMusic,
  textToAudio,
  videoToAudio,
  // Jobs
  pollJob,
  listJobs,
  // Library
  listVideos,
  listImages,
  listAudios,
  // File
  uploadFile,
  uploadToStorage,
  getSignedUrl,
  // Models
  getModelCatalog,
  // Account
  getAccountBalance,
  topUpAccount,
  // Storyboard
  createStoryboardProject,
  listStoryboardProjects,
  createStoryboardCharacter,
  createStoryboardEpisode,
  generateStoryboardShot,
  // AI / LLM
  generateScript,
  generateIdeas,
  generateCaption,
  improveScript,
  // Forms
  submitLead,
  submitForm,
  submitFeedback,
  // Auth
  inviteTeamMember,
};