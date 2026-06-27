import { callFunction, supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Video generation (Muapi text-to-video / image-to-video)
// ---------------------------------------------------------------------------
export async function submitTextToVideo(prompt: string, options: {
  model?: string;
  tenant_id?: string;
  user_id?: string;
} = {}) {
  return callFunction<{ job: { id: string; request_id: string; status: string } }>(
    "jobs",
    { action: "text-to-video", prompt, ...options }
  );
}

export async function submitImageToVideo(prompt: string, imageUrl: string, options: {
  model?: string;
  tenant_id?: string;
  user_id?: string;
} = {}) {
  return callFunction<{ job: { id: string; request_id: string; status: string } }>(
    "jobs",
    { action: "image-to-video", prompt, image_url: imageUrl, ...options }
  );
}

export async function pollJob(jobId: string) {
  return callFunction<{ status: string; outputs?: string[]; result?: unknown }>(
    `jobs?id=${jobId}&action=poll`,
    {},
    "GET"
  );
}

// ---------------------------------------------------------------------------
// Image generation (Muapi text-to-image)
// ---------------------------------------------------------------------------
export async function submitTextToImage(prompt: string, options: {
  model?: string;
  tenant_id?: string;
  user_id?: string;
} = {}) {
  return callFunction<{ job: { id: string; request_id: string; status: string } }>(
    "jobs",
    { action: "text-to-image", prompt, ...options }
  );
}

// ---------------------------------------------------------------------------
// AI Script generation (OpenAI Responses API)
// ---------------------------------------------------------------------------
export async function generateScript(prompt: string, options: {
  tenant_id?: string;
  user_id?: string;
  model?: string;
} = {}) {
  return callFunction<{ id: string; output: string; prompt: string }>(
    "jobs",
    { action: "ai-script", prompt, ...options }
  );
}

// ---------------------------------------------------------------------------
// File upload to Supabase Storage
// ---------------------------------------------------------------------------
export async function uploadFile(file: File, bucket = "uploads", tenantId = "default") {
  const path = `${tenantId}/${crypto.randomUUID()}-${file.name}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { path: data.path, url: pub.publicUrl };
}

// ---------------------------------------------------------------------------
// Leads / Submissions / Feedback
// ---------------------------------------------------------------------------
export async function submitLead(payload: Record<string, unknown>) {
  return callFunction("leads", payload);
}

export async function submitForm(payload: Record<string, unknown>) {
  return callFunction("submissions", payload);
}

export async function submitFeedback(payload: Record<string, unknown>) {
  return callFunction("feedback", payload);
}