const MUAPI_BASE_URL = 'https://api.muapi.io/v1';
const MUAPI_API_KEY = process.env.MUAPI_API_KEY;

export interface MuapiSubmitResponse {
  id: string;
  status: string;
  created_at: string;
}

export interface MuapiJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output_url?: string;
  error?: string;
}

export interface MuapiT2VRequest {
  prompt: string;
  duration?: number;
  aspect_ratio?: string;
  model?: string;
}

export interface MuapiI2VRequest {
  image_url: string;
  prompt?: string;
  duration?: number;
  model?: string;
}

export interface MuapiLipsyncRequest {
  video_url: string;
  audio_url: string;
  model?: string;
}

export async function submitMuapiJob(
  endpoint: string,
  data: MuapiT2VRequest | MuapiI2VRequest | MuapiLipsyncRequest
): Promise<MuapiSubmitResponse> {
  const response = await fetch(`${MUAPI_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MUAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Muapi API error: ${response.statusText}`);
  }

  return response.json();
}

export async function pollMuapiJob(jobId: string): Promise<MuapiJobStatus> {
  const response = await fetch(`${MUAPI_BASE_URL}/jobs/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${MUAPI_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Muapi poll error: ${response.statusText}`);
  }

  return response.json();
}

export async function waitForMuapiJob(
  jobId: string,
  intervalMs: number = 2000,
  maxAttempts: number = 150
): Promise<MuapiJobStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await pollMuapiJob(jobId);
    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('Muapi job timed out');
}

export async function generateTextToVideo(
  prompt: string,
  options?: { duration?: number; aspectRatio?: string; model?: string }
): Promise<string> {
  const response = await submitMuapiJob('/generate/text-to-video', {
    prompt,
    duration: options?.duration ?? 5,
    aspect_ratio: options?.aspectRatio ?? '16:9',
    model: options?.model ?? 'muapi-1.0',
  });

  const finalStatus = await waitForMuapiJob(response.id);
  if (finalStatus.status === 'failed') {
    throw new Error(finalStatus.error || 'T2V generation failed');
  }

  return finalStatus.output_url!;
}

export async function generateImageToVideo(
  imageUrl: string,
  options?: { prompt?: string; duration?: number; model?: string }
): Promise<string> {
  const response = await submitMuapiJob('/generate/image-to-video', {
    image_url: imageUrl,
    prompt: options?.prompt,
    duration: options?.duration ?? 5,
    model: options?.model ?? 'muapi-1.0',
  });

  const finalStatus = await waitForMuapiJob(response.id);
  if (finalStatus.status === 'failed') {
    throw new Error(finalStatus.error || 'I2V generation failed');
  }

  return finalStatus.output_url!;
}

export async function generateLipsync(
  videoUrl: string,
  audioUrl: string,
  model: string = 'lipsync-v1'
): Promise<string> {
  const response = await submitMuapiJob('/generate/lipsync', {
    video_url: videoUrl,
    audio_url: audioUrl,
    model,
  });

  const finalStatus = await waitForMuapiJob(response.id);
  if (finalStatus.status === 'failed') {
    throw new Error(finalStatus.error || 'Lipsync generation failed');
  }

  return finalStatus.output_url!;
}

export async function uploadToMuapi(file: Buffer | File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${MUAPI_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MUAPI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Muapi upload error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.url;
}