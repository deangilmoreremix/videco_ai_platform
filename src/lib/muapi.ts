/**
 * Muapi Integration Layer
 * Replaces Sync.so + Cloudinary video gen + parts of media processing.
 *
 * Docs: https://muapi.ai/docs
 * Pattern: submit -> {request_id} -> poll /predictions/{id}/result -> outputs[]
 */

import axios from "axios";
import crypto from "crypto";

const MUAPI_BASE = "https://api.muapi.ai/api/v1";
const MUAPI_KEY = process.env.MUAPI_API_KEY;

if (!MUAPI_KEY && process.env.NODE_ENV !== "test") {
    console.warn("[muapi] MUAPI_API_KEY not set - AI generation will fail");
}

export interface MuapiSubmitResponse {
    request_id: string;
    status: "processing" | "completed" | "failed" | string;
    [key: string]: any;
}

export interface MuapiResultResponse {
    request_id: string;
    status: "processing" | "completed" | "failed" | string;
    outputs?: Array<{ url: string; [key: string]: any }>;
    error?: string;
    [key: string]: any;
}

const client = axios.create({
    baseURL: MUAPI_BASE,
    headers: {
        "x-api-key": MUAPI_KEY || "",
        "Content-Type": "application/json",
    },
    timeout: 30000,
});

// Log usage helper (client-side fire-and-forget)
export async function logMuapiUsage(
    userId: string | null,
    model: string,
    action: string,
    details: any = {},
    cost = 0,
) {
    try {
        // attempt server-side usage logging endpoint if exists
        if (
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ) {
            await fetch("/api/usage/log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    model,
                    provider: "muapi",
                    action,
                    details,
                    cost_estimate: cost,
                }),
            });
        }
    } catch (e) {
        console.warn("logMuapiUsage failed", e.message || e);
    }
}

/**
 * Submit a generation request to any Muapi model.
 * Example models: "veo3-fast-text-to-video", "kling-master", "sd-2-omni-reference", "flux-dev", etc.
 */
export async function submitPrediction(
    model: string,
    payload: Record<string, any>,
    options?: { webhook?: string },
): Promise<MuapiSubmitResponse> {
    const url = options?.webhook
        ? `/${model}?webhook=${encodeURIComponent(options.webhook)}`
        : `/${model}`;

    const { data } = await client.post(url, payload);
    return data;
}

/**
 * Verify webhook signature using MUAPI_WEBHOOK_SECRET if present.
 * Supports both raw hex and sha256= prefixed signatures.
 * Uses HMAC-SHA256 with timing-safe comparison.
 */
export function verifyWebhookSignature(
    payload: string,
    signature: string,
): boolean {
    const secret = process.env.MUAPI_WEBHOOK_SECRET;
    if (!secret) {
        // No secret configured; accept by default but log a warning
        if (process.env.NODE_ENV !== "test")
            console.warn(
                "[muapi] MUAPI_WEBHOOK_SECRET not set - skipping signature verification",
            );
        return true;
    }

    try {
        const hmac = crypto
            .createHmac("sha256", secret)
            .update(payload, "utf8")
            .digest("hex");
        // Some providers prefix signature with sha256=...; support both raw hex and prefixed
        const normalized = signature?.startsWith("sha256=")
            ? signature.split("=")[1]
            : signature;
        if (!normalized?.length) return false;
        const expectedBuf = Buffer.from(hmac, "hex");
        const providedBuf = Buffer.from(normalized, "hex");
        if (expectedBuf.length !== providedBuf.length) return false;
        const verified = crypto.timingSafeEqual(expectedBuf, providedBuf);
        return verified;
    } catch (err) {
        console.error("[muapi] signature verification error", err);
        return false;
    }
}

/**
 * Poll until completion or failure. Throws on timeout or error.
 */
export async function pollResult(
    requestId: string,
    opts: {
        maxAttempts?: number;
        intervalMs?: number;
        timeoutMs?: number;
    } = {},
): Promise<MuapiResultResponse> {
    const { maxAttempts = 120, intervalMs = 3000, timeoutMs = 300000 } = opts;
    const start = Date.now();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (Date.now() - start > timeoutMs) {
            throw new Error(`Muapi poll timeout for ${requestId}`);
        }

        const { data } = await client.get(`/predictions/${requestId}/result`);
        if (data.status === "completed") return data;
        if (data.status === "failed") {
            throw new Error(
                data.error || `Muapi generation failed: ${requestId}`,
            );
        }

        await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new Error(`Muapi poll exceeded max attempts for ${requestId}`);
}

/**
 * Upload a file (Buffer, Blob, or public URL) to Muapi storage.
 * Returns hosted URL usable in subsequent generations.
 */
export async function uploadFile(
    fileOrUrl: string | Buffer | Blob,
    filename = "upload.bin",
): Promise<string> {
    if (typeof fileOrUrl === "string" && fileOrUrl.startsWith("http")) {
        // Muapi can often accept remote URLs directly; this is convenience
        return fileOrUrl;
    }

    const form = new FormData();
    if (Buffer.isBuffer(fileOrUrl)) {
        form.append("file", new Blob([fileOrUrl]), filename);
    } else if (fileOrUrl instanceof Blob) {
        form.append("file", fileOrUrl, filename);
    } else {
        throw new Error("uploadFile expects Buffer, Blob, or http URL");
    }

    const { data } = await axios.post(`${MUAPI_BASE}/upload_file`, form, {
        headers: {
            "x-api-key": MUAPI_KEY || "",
            // Let axios set multipart boundary
        },
    });

    return data.url || data.public_url || data;
}

/**
 * Convenience: generate video from text prompt using a recommended fast model.
 */
export async function generateTextToVideo(
    prompt: string,
    opts?: { webhook?: string; userId?: string },
) {
    const res = await submitPrediction(
        "veo3-fast-text-to-video",
        { prompt },
        opts,
    );
    // log usage (best-effort)
    try {
        await logMuapiUsage(
            opts?.userId || null,
            MUAPI_MODELS.FAST_T2V || "veo3-fast-text-to-video",
            "text-to-video",
            { prompt_length: (prompt || "").length },
            0,
        );
    } catch (e) {
        console.error("[muapi] logMuapiUsage failed:", e);
    }
    return pollResult(res.request_id);
}

/**
 * Convenience: image-to-video (animate still image).
 */
export async function generateImageToVideo(
    imageUrl: string,
    prompt: string,
    opts?: { webhook?: string; userId?: string },
) {
    const res = await submitPrediction(
        "kling-o1-standard-image-to-video",
        { prompt, image_url: imageUrl },
        opts,
    );
    try {
        await logMuapiUsage(
            opts?.userId || null,
            MUAPI_MODELS.HIGH_QUALITY_I2V || "kling-o1-standard-image-to-video",
            "image-to-video",
            { prompt_length: (prompt || "").length },
            0,
        );
    } catch (e) {
        console.error("[muapi] logMuapiUsage failed:", e);
    }
    return pollResult(res.request_id);
}

// =============================================================================
// GENERATION ENDPOINTS (text-to-image, text-to-video, lip-sync, face-swap)
// =============================================================================

/**
 * Generate an image from a text prompt.
 * @param params.prompt - The text prompt describing the image to generate
 * @param params.model - Optional model override. Defaults to "flux-dev"
 * @param params.aspect_ratio - Optional aspect ratio (e.g. "1:1", "16:9")
 * @param params.num_outputs - Number of images to generate. Defaults to 1
 * @param params.user_id - Optional user ID for usage logging
 * @returns MuapiSubmitResponse with request_id for polling
 */
export async function generateImage(params: {
    prompt: string;
    model?: string;
    aspect_ratio?: string;
    num_outputs?: number;
    user_id?: string;
    [key: string]: any;
}): Promise<MuapiSubmitResponse> {
    const model = params.model || "flux-dev";
    const { model: _m, ...payload } = params;
    const res = await submitPrediction(model, payload);
    try {
        await logMuapiUsage(params.user_id || null, model, "image", {
            prompt_length: (params.prompt || "").length,
        });
    } catch (e) {
        console.error("[muapi] logMuapiUsage failed:", e);
    }
    return res;
}

/**
 * Generate a video from text or image + text prompt.
 * @param params.prompt - The text prompt describing the video to generate
 * @param params.image_url - Optional starting image for image-to-video
 * @param params.model - Optional model override. Defaults based on presence of image_url
 * @param params.aspect_ratio - Optional aspect ratio (e.g. "16:9", "9:16")
 * @param params.duration - Optional duration in seconds
 * @param params.resolution - Optional resolution (e.g. "1080p")
 * @param params.quality - Optional quality preset
 * @param params.user_id - Optional user ID for usage logging
 * @returns MuapiSubmitResponse with request_id for polling
 */
export async function generateVideo(params: {
    prompt: string;
    image_url?: string;
    model?: string;
    aspect_ratio?: string;
    duration?: number;
    resolution?: string;
    quality?: string;
    user_id?: string;
    [key: string]: any;
}): Promise<MuapiSubmitResponse> {
    const model =
        params.model ||
        (params.image_url
            ? MUAPI_MODELS.HIGH_QUALITY_I2V
            : MUAPI_MODELS.FAST_T2V);
    const { model: _m, ...payload } = params;
    const res = await submitPrediction(model, payload);
    try {
        await logMuapiUsage(params.user_id || null, model, "video", {
            prompt_length: (params.prompt || "").length,
        });
    } catch (e) {
        console.error("[muapi] logMuapiUsage failed:", e);
    }
    return res;
}

/**
 * Lip-sync: apply an audio track to a video.
 * @param videoId - URL or request_id of the source video
 * @param audioUrl - URL of the audio track to apply
 * @param opts.model - Optional model override. Defaults to MUAPI_MODELS.LIPSYNC
 * @param opts.user_id - Optional user ID for usage logging
 * @returns MuapiSubmitResponse with request_id for polling
 */
export async function lipsync(
    videoId: string,
    audioUrl: string,
    opts?: { model?: string; user_id?: string; [key: string]: any },
): Promise<MuapiSubmitResponse> {
    const model = opts?.model || MUAPI_MODELS.LIPSYNC;
    const { model: _m, user_id: _uid, ...rest } = opts || {};
    const payload = { video_url: videoId, audio_url: audioUrl, ...rest };
    const res = await submitPrediction(model, payload);
    try {
        await logMuapiUsage(opts?.user_id || null, model, "lipsync", {});
    } catch (e) {
        console.error("[muapi] logMuapiUsage failed:", e);
    }
    return res;
}

/**
 * Face-swap: swap faces between source and target media.
 * @param params.source_url - URL of the source face image
 * @param params.target_url - URL of the target image/video to swap into
 * @param params.model - Optional model override. Defaults to "face-swap-general"
 * @param params.user_id - Optional user ID for usage logging
 * @returns MuapiSubmitResponse with request_id for polling
 */
export async function faceSwap(params: {
    source_url: string;
    target_url: string;
    model?: string;
    user_id?: string;
    [key: string]: any;
}): Promise<MuapiSubmitResponse> {
    const model = params.model || "face-swap-general";
    const { model: _m, ...payload } = params;
    const res = await submitPrediction(model, payload);
    try {
        await logMuapiUsage(params.user_id || null, model, "face-swap", {});
    } catch (e) {
        console.error("[muapi] logMuapiUsage failed:", e);
    }
    return res;
}

// =============================================================================
// FILE UPLOAD
// =============================================================================

/**
 * Upload an image file to Muapi and return a hosted URL.
 */
export async function uploadImage(
    file: Buffer | Blob | File,
): Promise<{ url: string }> {
    const isFile = typeof File !== "undefined" && file instanceof File;
    const filename = isFile ? file.name : (file as any).name || "upload.png";

    const form = new FormData();
    form.append("image", file as any, filename);

    const { data } = await axios.post(`${MUAPI_BASE}/upload_image`, form, {
        headers: {
            "x-api-key": MUAPI_KEY || "",
            // Let axios set multipart boundary
        },
    });

    return {
        url:
            data.url ||
            data.public_url ||
            (typeof data === "string" ? data : ""),
    };
}

// =============================================================================
// JOB STATUS / POLLING
// =============================================================================

/**
 * Get the current status of a Muapi job without looping.
 * Single-shot GET to /predictions/{jobId}/result.
 */
export async function getJobStatus(
    jobId: string,
): Promise<MuapiResultResponse> {
    const { data } = await client.get(`/predictions/${jobId}/result`);
    return data;
}

/**
 * Extract the best available URL from a Muapi result response.
 * Checks outputs[0].url first, then falls back to public_url / url.
 */
export function extractFinalUrl(
    result: MuapiResultResponse,
): string | undefined {
    if (result.outputs?.[0]?.url) return result.outputs[0].url;
    if ((result as any).public_url) return (result as any).public_url;
    if ((result as any).url) return (result as any).url;
    return undefined;
}

/**
 * Poll directly against the Muapi API for a single job's current status.
 * Returns a normalized response (status + final_url) compatible with
 * consumers that expect the Supabase Edge orchestrator shape.
 */
export async function pollMuapiJob(
    requestId: string,
    videoId?: string | number,
) {
    const result = await getJobStatus(requestId);
    const final_url = extractFinalUrl(result);
    const res: any = { ...result, final_url, video_id: videoId };
    return res;
}

/**
 * Convenience: poll until completion or failure using direct Muapi API.
 */
export async function waitForMuapiJob(
    requestId: string,
    videoId?: string | number,
    onUpdate?: (status: string, finalUrl?: string) => void,
    maxAttempts = 60,
    intervalMs = 5000,
) {
    for (let i = 0; i < maxAttempts; i++) {
        const res = await pollMuapiJob(requestId, videoId);
        if (onUpdate) onUpdate(res.status, res.final_url);
        if (res.status === "completed" || res.status === "failed") {
            return res;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Timed out waiting for Muapi generation: ${requestId}`);
}

export const MUAPI_MODELS = {
    FAST_T2V: "veo3-fast-text-to-video",
    HIGH_QUALITY_T2V: "veo3-text-to-video",
    FAST_I2V: "seedance-lite-i2v",
    HIGH_QUALITY_I2V: "kling-o1-standard-image-to-video",
    OMNI_REFERENCE: "sd-2-omni-reference",
    LIPSYNC: "ai-video-lipsync", // TODO [Muapi catalog]: confirm exact endpoint slug for lipsync service
} as const;
