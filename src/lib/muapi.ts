/**
 * Muapi Integration Layer
 * Replaces Sync.so + Cloudinary video gen + parts of media processing.
 *
 * Docs: https://muapi.ai/docs
 * Pattern: submit -> {request_id} -> poll /predictions/{id}/result -> outputs[]
 */

import axios from "axios";

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

/**
 * Submit a generation request to any Muapi model.
 * Example models: "veo3-fast-text-to-video", "kling-master", "sd-2-omni-reference", "flux-dev", etc.
 */
export async function submitPrediction(
  model: string,
  payload: Record<string, any>,
  options?: { webhook?: string }
): Promise<MuapiSubmitResponse> {
  const url = options?.webhook
    ? `/${model}?webhook=${encodeURIComponent(options.webhook)}`
    : `/${model}`;

  const { data } = await client.post(url, payload);
  return data;
}

/** Verify webhook signature using MUAPI_WEBHOOK_SECRET if present */
export function verifyWebhookSignature(payload: string, signature?: string) {
  const secret = process.env.MUAPI_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured
  if (!signature) return false;
  try {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return hmac === signature;
  } catch (e) {
    return false;
  }
}

/**
 * Poll until completion or failure. Throws on timeout or error.
 */
export async function pollResult(
  requestId: string,
  opts: { maxAttempts?: number; intervalMs?: number; timeoutMs?: number } = {}
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
      throw new Error(data.error || `Muapi generation failed: ${requestId}`);
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
  filename = "upload.bin"
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
export async function generateTextToVideo(prompt: string, opts?: { webhook?: string }) {
  const res = await submitPrediction("veo3-fast-text-to-video", { prompt }, opts);
  return pollResult(res.request_id);
}

/**
 * Convenience: image-to-video (animate still image).
 */
export async function generateImageToVideo(
  imageUrl: string,
  prompt: string,
  opts?: { webhook?: string }
) {
  const res = await submitPrediction(
    "kling-o1-standard-image-to-video",
    { prompt, image_url: imageUrl },
    opts
  );
  return pollResult(res.request_id);
}

/**
 * Webhook signature verification stub (implement when Muapi publishes spec).
 */
import crypto from "crypto";

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.MUAPI_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured; accept by default but log a warning
    if (process.env.NODE_ENV !== "test") console.warn("[muapi] MUAPI_WEBHOOK_SECRET not set - skipping signature verification");
    return true;
  }

  try {
    const hmac = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
    // Some providers prefix signature with sha256=...; support both raw hex and prefixed
    const normalized = signature?.startsWith("sha256=") ? signature.split("=")[1] : signature;
    const verified = crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(normalized || "", "hex"));
    return verified;
  } catch (err) {
    console.error("[muapi] signature verification error", err);
    return false;
  }
}

export const MUAPI_MODELS = {
  FAST_T2V: "veo3-fast-text-to-video",
  HIGH_QUALITY_T2V: "veo3-text-to-video",
  FAST_I2V: "seedance-lite-i2v",
  HIGH_QUALITY_I2V: "kling-o1-standard-image-to-video",
  OMNI_REFERENCE: "sd-2-omni-reference",
  LIPSYNC: "ai-video-lipsync", // placeholder - verify exact endpoint in Muapi catalog
} as const;
