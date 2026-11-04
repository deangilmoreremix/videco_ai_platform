import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Lazily-initialized client for browser use.
// Avoids throwing during Next.js data-collection when env vars are absent.
// ============================================================================
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
    if (!_supabase) {
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const SUPABASE_ANON_KEY =
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: true, autoRefreshToken: true },
        });
    }
    return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return (getSupabase() as unknown as SupabaseClient)[prop];
    },
});

const FN_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
    : "https://placeholder.supabase.co/functions/v1";

// All Muapi/OpenAI routes live in the single `api` Edge Function
// (supabase/functions/api). Supabase routes /functions/v1/<name>/... to the
// function called <name>, so every endpoint must be prefixed with `api/`.
// Previously calls like "videos/clone" hit the CRUD-only `videos` function.
const API_BASE = `${FN_BASE}/api`;

type MaybeTenantUser =
    | {
          app_metadata?: Record<string, unknown>;
          user_metadata?: Record<string, unknown>;
      }
    | null
    | undefined;

/**
 * Resolve the tenant id for a user. Signup historically wrote tenant_id to
 * user_metadata (auth.updateUser({ data })), while newer code expects it in
 * app_metadata, so check both.
 */
export function getTenantId(user: MaybeTenantUser): string | undefined {
    const id =
        (user?.app_metadata?.tenant_id as string | undefined) ||
        (user?.user_metadata?.tenant_id as string | undefined);
    return id || undefined;
}

async function authHeaders(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const tenantId = getTenantId(session?.user);
    return {
        ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    };
}

async function parseResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}

export async function callMuapi<T = unknown>(
    endpoint: string,
    body: Record<string, unknown> = {},
): Promise<T> {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(await authHeaders()),
        },
        body: JSON.stringify(body),
    });
    return parseResponse<T>(res);
}

export async function callMuapiGet<T = unknown>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: "GET",
        headers: await authHeaders(),
    });
    return parseResponse<T>(res);
}

// ============================================================================
// IMAGE GENERATION (Muapi text-to-image + image-edit + enhancement)
// ============================================================================
export const generateImage = (
    prompt: string,
    opts: {
        model?: string;
        user_id?: string;
        tenant_id?: string;
        [k: string]: unknown;
    } = {},
) => callMuapi("images/text-to-image", { prompt, ...opts });

export const editImage = (
    prompt: string,
    image_url: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
) => callMuapi("images/edit", { prompt, image_url, ...opts });

export const upscaleImage = (
    image_url: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
) => callMuapi("images/upscale", { image_url, ...opts });

export const removeImageBackground = (
    image_url: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
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
        [k: string]: unknown;
    } = {},
) => callMuapi("videos/text-to-video", { prompt, ...opts });

export const submitTextToVideo = generateVideo;

export const imageToVideo = (
    prompt: string,
    image_url: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
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
    },
) => callMuapi("videos/effects", { prompt, image_url, ...opts });

export const lipSync = (
    video_url: string,
    audio_url: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
) => callMuapi("videos/lip-sync", { video_url, audio_url, ...opts });

export const faceSwap = (
    source_url: string,
    target_url: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
) => callMuapi("videos/face-swap", { source_url, target_url, ...opts });

// ============================================================================
// MUSIC + AUDIO (Suno + MMAudio)
// ============================================================================
export const generateMusic = (
    prompt: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
) => callMuapi("music", { prompt, ...opts });

export const remixMusic = (
    prompt: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
) => callMuapi("music", { prompt, model: "suno-remix-music", ...opts });

export const extendMusic = (
    prompt: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
) => callMuapi("music", { prompt, model: "suno-extend-music", ...opts });

export const textToAudio = (
    prompt: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
) => callMuapi("audio/text-to-audio", { prompt, ...opts });

export const videoToAudio = (
    video_url: string,
    prompt: string,
    opts: { model?: string; user_id?: string; [k: string]: unknown } = {},
) => callMuapi("audio/video-to-audio", { video_url, prompt, ...opts });

// ============================================================================
// JOBS (poll + list)
// ============================================================================
export const pollJob = (jobId: string) =>
    callMuapiGet(`jobs?id=${jobId}&action=poll`);

export type JobPollResult = {
    status?: string;
    outputs?: Array<string | { url?: string }>;
    error?: string;
    [k: string]: unknown;
};

/**
 * Poll a job until Muapi reports completed/failed. Each poll hits the `api`
 * Edge Function, which persists outputs + updates the originating row on
 * completion. The Muapi webhook does the same server-side; this is the
 * client fallback for when the webhook is not reachable (e.g. local dev).
 */
export async function pollUntilDone(
    jobId: string,
    opts: {
        intervalMs?: number;
        maxAttempts?: number;
        onUpdate?: (res: JobPollResult) => void;
        signal?: { cancelled: boolean };
    } = {},
): Promise<JobPollResult> {
    const { intervalMs = 5000, maxAttempts = 120, onUpdate, signal } = opts;
    for (let i = 0; i < maxAttempts; i++) {
        if (signal?.cancelled) return { status: "cancelled" };
        const res = (await pollJob(jobId)) as JobPollResult;
        onUpdate?.(res);
        if (res?.status === "completed" || res?.status === "failed") {
            return res;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Timed out waiting for job ${jobId}`);
}

export const firstOutputUrl = (res: JobPollResult): string | undefined => {
    const o = res?.outputs?.[0];
    return typeof o === "string" ? o : o?.url;
};

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
    const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: await authHeaders(),
        body: fd,
    });
    return parseResponse<{ url: string }>(res);
}

// ============================================================================
// SUPABASE STORAGE (helper for non-AI uploads)
// ============================================================================
export async function uploadToStorage(
    file: File,
    bucket = "uploads",
    tenantId = "default",
) {
    const path = `${tenantId}/${crypto.randomUUID()}-${file.name}`;
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
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
    expiresIn = 3600,
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
    opts: { user_id?: string } = {},
) => callMuapi("storyboard", { name, brief, ...opts });

export const listStoryboardProjects = () => callMuapiGet("storyboard");

export const createStoryboardCharacter = (
    project_id: string,
    character: {
        name: string;
        static_features?: string;
        dynamic_features?: string;
        reference_image_url?: string;
    },
) => callMuapi("storyboard/character", { project_id, ...character });

export const createStoryboardEpisode = (
    project_id: string,
    episode: {
        episode_number: number;
        title?: string;
        setting?: string;
        mood?: string;
    },
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
    },
) => callMuapi("storyboard/generate", { episode_id, shot_index, ...opts });

// ============================================================================
// OPENAI: script / ideas / caption / improve
// ============================================================================
export const generateScript = (
    prompt: string,
    opts: {
        tone?: string;
        max_words?: number;
        model?: string;
        user_id?: string;
    } = {},
) => callMuapi("ai/script", { prompt, ...opts });

export const generateIdeas = (
    prompt: string,
    opts: { count?: number; model?: string; user_id?: string } = {},
) => callMuapi("ai/ideas", { prompt, ...opts });

export const generateCaption = (
    prompt: string,
    opts: { platform?: string; model?: string; user_id?: string } = {},
) => callMuapi("ai/caption", { prompt, ...opts });

export const improveScript = (
    text: string,
    opts: { model?: string; user_id?: string } = {},
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
export const inviteTeamMember = (
    email: string,
    full_name: string,
    tenant_id: string,
) => callMuapi("auth/invite", { email, full_name, tenant_id });

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
    pollUntilDone,
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
