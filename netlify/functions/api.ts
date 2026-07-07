import { Handler } from '@netlify/functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id, x-muapi-webhook-secret',
  'Content-Type': 'application/json',
};

const supabase = (await import('@supabase/supabase-js')).createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MUAPI_API_KEY = process.env.MUAPI_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const WEBHOOK_SHARED_SECRET = process.env.WEBHOOK_SHARED_SECRET || '';

const json = (data: unknown, status = 200) => ({
  statusCode: status,
  headers: corsHeaders,
  body: JSON.stringify(data),
});

// ============================================================================
// Muapi helpers
// ============================================================================
async function muapiSubmit(
  endpoint: string,
  payload: Record<string, unknown>,
  queryParams: Record<string, string> = {}
): Promise<any> {
  const url = new URL(`${MUAPI_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(queryParams)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'x-api-key': MUAPI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function muapiPoll(requestId: string): Promise<any> {
  const res = await fetch(`${MUAPI_BASE}/predictions/${requestId}/result`, {
    headers: { 'x-api-key': MUAPI_API_KEY },
  });
  return res.json();
}

async function muapiGet(path: string): Promise<any> {
  const res = await fetch(`${MUAPI_BASE}/${path}`, {
    headers: { 'x-api-key': MUAPI_API_KEY },
  });
  return res.json();
}

async function muapiDelete(path: string): Promise<any> {
  const res = await fetch(`${MUAPI_BASE}/${path}`, {
    method: 'DELETE',
    headers: { 'x-api-key': MUAPI_API_KEY },
  });
  return res.json();
}

async function muapiUploadFromUrl(url: string): Promise<any> {
  const fileRes = await fetch(url);
  if (!fileRes.ok) throw new Error(`Failed to fetch ${url}`);
  const blob = await fileRes.blob();
  const fd = new FormData();
  fd.append('file', blob, 'input.bin');
  const res = await fetch(`${MUAPI_BASE}/upload_file`, {
    method: 'POST',
    headers: { 'x-api-key': MUAPI_API_KEY },
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
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input, ...opts }),
  });
  return res.json();
}

async function openaiExtractText(resp: any): Promise<string> {
  return (
    resp.output_text ||
    resp.output?.[0]?.content?.[0]?.text ||
    resp.choices?.[0]?.message?.content ||
    ''
  );
}

// ============================================================================
// Job persistence helpers
// ============================================================================
type JobType =
  | 'text-to-video'
  | 'image-to-video'
  | 'text-to-image'
  | 'image-edit'
  | 'video-effects'
  | 'lip-sync'
  | 'upscale'
  | 'background-remover'
  | 'face-swap'
  | 'music-create'
  | 'music-remix'
  | 'music-extend'
  | 'audio-t2a'
  | 'audio-v2v'
  | 'storyboard-asset';

type ResourceType = 'video' | 'image' | 'audio' | 'music' | 'storyboard';

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
    .from('jobs')
    .insert({
      tenant_id: opts.tenantId,
      user_id: opts.userId,
      type: opts.type,
      model: opts.model,
      provider: 'muapi',
      request_id: opts.requestId,
      status: 'processing',
      input: opts.input,
      resource_type: opts.resourceType,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function persistOutputs(
  job: any,
  result: any,
  resourceType: ResourceType
): Promise<{ outputs: string[]; resource?: any }> {
  const outputs: string[] =
    result.outputs ||
    result.video?.url
      ? [result.video.url]
      : result.image?.url
      ? [result.image.url]
      : result.url
      ? [result.url]
      : [];

  if (!outputs.length || !job) return { outputs };

  if (resourceType === 'video') {
    const { data } = await supabase
      .from('videos')
      .insert({
        tenant_id: job.tenant_id,
        user_id: job.user_id,
        url: outputs[0],
        type: job.type,
        source: 'muapi',
        model: job.model,
        job_id: job.id,
        metadata: { muapi_request_id: job.request_id },
      })
      .select()
      .single();
    return { outputs, resource: data };
  }

  if (resourceType === 'image') {
    const { data } = await supabase
      .from('images')
      .insert({
        tenant_id: job.tenant_id,
        user_id: job.user_id,
        url: outputs[0],
        source: 'muapi',
        model: job.model,
        job_id: job.id,
        metadata: { muapi_request_id: job.request_id },
      })
      .select()
      .single();
    return { outputs, resource: data };
  }

  if (resourceType === 'audio' || resourceType === 'music') {
    const { data } = await supabase
      .from('audios')
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
  status: 'completed' | 'failed',
  result: any,
  error?: string
): Promise<void> {
  await supabase
    .from('jobs')
    .update({
      status,
      output: result,
      error: error || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

// ============================================================================
// Auth helpers
// ============================================================================
async function getTenantFromEvent(event: any): Promise<string | null> {
  const headerTenant = event.headers['x-tenant-id'] || event.headers['X-Tenant-Id'];
  if (headerTenant) return headerTenant;

  const auth = event.headers.Authorization || event.headers.authorization;
  if (!auth) return null;
  const token = auth.replace('Bearer ', '');
  const { data } = await supabase.auth.getUser(token);
  const tenantId = (data.user?.app_metadata as any)?.tenant_id;
  return tenantId || null;
}

// ============================================================================
// Muapi capability map
// ============================================================================
const MODELS: Record<string, { type: string; resource: string }> = {
  'flux-schnell': { type: 'text-to-image', resource: 'image' },
  'flux-dev': { type: 'text-to-image', resource: 'image' },
  'midjourney': { type: 'text-to-image', resource: 'image' },
  'gpt4o': { type: 'text-to-image', resource: 'image' },
  'hidream-fast': { type: 'text-to-image', resource: 'image' },
  'seedream': { type: 'text-to-image', resource: 'image' },
  'reve': { type: 'text-to-image', resource: 'image' },
  'qwen': { type: 'text-to-image', resource: 'image' },
  'flux-kontext-dev': { type: 'image-edit', resource: 'image' },
  'flux-kontext-pro': { type: 'image-edit', resource: 'image' },
  'flux-kontext-max': { type: 'image-edit', resource: 'image' },
  'bytedance-seededit-v3': { type: 'image-edit', resource: 'image' },
  'veo3-fast-text-to-video': { type: 'text-to-video', resource: 'video' },
  'veo3-text-to-video': { type: 'text-to-video', resource: 'video' },
  'kling-master-text-to-video': { type: 'text-to-video', resource: 'video' },
  'wan2.1-text-to-video': { type: 'text-to-video', resource: 'video' },
  'wan2.2-text-to-video': { type: 'text-to-video', resource: 'video' },
  'seedance-pro-t2v': { type: 'text-to-video', resource: 'video' },
  'seedance-lite-t2v': { type: 'text-to-video', resource: 'video' },
  'runway-text-to-video': { type: 'text-to-video', resource: 'video' },
  'hunyuan-text-to-video': { type: 'text-to-video', resource: 'video' },
  'pixverse-v5-t2v': { type: 'text-to-video', resource: 'video' },
  'vidu-v2.0-t2v': { type: 'text-to-video', resource: 'video' },
  'minimax-hailuo-02-std-t2v': { type: 'text-to-video', resource: 'video' },
  'minimax-hailuo-02-pro-t2v': { type: 'text-to-video', resource: 'video' },
  'kling-o1-standard-image-to-video': { type: 'image-to-video', resource: 'video' },
  'kling-o1-pro-image-to-video': { type: 'image-to-video', resource: 'video' },
  'kling-o1-master-image-to-video': { type: 'image-to-video', resource: 'video' },
  'veo3.1-fast-image-to-video': { type: 'image-to-video', resource: 'video' },
  'wan2.5-image-to-video-fast': { type: 'image-to-video', resource: 'video' },
  'seedance-v1.5-pro-i2v-fast': { type: 'image-to-video', resource: 'video' },
  'grok-imagine-image-to-video': { type: 'image-to-video', resource: 'video' },
  'sync-lipsync': { type: 'lip-sync', resource: 'video' },
  'latent-sync': { type: 'lip-sync', resource: 'video' },
  'creatify-lipsync': { type: 'lip-sync', resource: 'video' },
  'veed-lipsync': { type: 'lip-sync', resource: 'video' },
  'suno-create-music': { type: 'music-create', resource: 'music' },
  'suno-remix-music': { type: 'music-remix', resource: 'music' },
  'suno-extend-music': { type: 'music-extend', resource: 'music' },
  'mmaudio-v2-text-to-audio': { type: 'audio-t2a', resource: 'audio' },
  'mmaudio-v2-video-to-video': { type: 'audio-v2v', resource: 'audio' },
  'generate_wan_ai_effects': { type: 'video-effects', resource: 'video' },
};

// ============================================================================
// Router
// ============================================================================
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }

  const url = new URL(event.rawUrl || `https://example.com${event.path}`);
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/^functions\/v1\/api\/?/, '');
  const segments = path.split('/').filter(Boolean);

  try {
    // ========================================================================
    // WEBHOOKS (no auth required, verified by shared secret)
    // ========================================================================
    if (segments[0] === 'webhooks' && segments[1] === 'muapi') {
      if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);
      const provided = event.headers['x-muapi-webhook-secret'] || event.headers['X-Muapi-Webhook-Secret'];
      if (WEBHOOK_SHARED_SECRET && provided !== WEBHOOK_SHARED_SECRET) {
        return json({ error: 'Invalid webhook secret' }, 401);
      }
      const payload = JSON.parse(event.body || '{}');
      const requestId = payload.id;
      const status = payload.status;

      if (requestId) {
        const { data: job } = await supabase
          .from('jobs')
          .select('*')
          .eq('request_id', requestId)
          .single();
        if (job) {
          if (status === 'completed') {
            const result = { outputs: payload.outputs || [], raw: payload };
            const resourceType = (job.resource_type || MODELS[job.model]?.resource || 'video') as ResourceType;
            await persistOutputs(job, result, resourceType);
            await finalizeJob(job.id, 'completed', result);
          } else if (status === 'failed') {
            await finalizeJob(job.id, 'failed', payload, payload.error);
          }
        }
      }
      return json({ received: true });
    }

    // ========================================================================
    // MUAPI ACCOUNT (proxy to muapi for balance / keys)
    // ========================================================================
    if (segments[0] === 'account') {
      if (event.httpMethod === 'GET' && segments[1] === 'balance') {
        const result = await muapiGet('account/balance');
        return json(result);
      }
      if (event.httpMethod === 'POST' && segments[1] === 'topup') {
        const payload = JSON.parse(event.body || '{}');
        const result = await muapiSubmit('account/topup', payload);
        return json(result);
      }
    }

    if (segments[0] === 'keys' && event.httpMethod === 'GET') {
      return json(await muapiGet('keys'));
    }
    if (segments[0] === 'keys' && event.httpMethod === 'POST') {
      const payload = JSON.parse(event.body || '{}');
      return json(await muapiSubmit('keys', payload));
    }
    if (segments[0] === 'keys' && event.httpMethod === 'DELETE') {
      return json(await muapiDelete(`keys/${segments[1]}`));
    }

    // ========================================================================
    // MUAPI MODEL CATALOG (live fetch)
    // ========================================================================
    if (segments[0] === 'models' && event.httpMethod === 'GET') {
      try {
        const result = await muapiGet('models');
        return json(result);
      } catch (err) {
        return json({
          source: 'static-fallback',
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
    if (segments[0] === 'upload' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (body.url) {
        return json(await muapiUploadFromUrl(body.url));
      }
      return json({ error: 'Provide multipart file or { url }' }, 400);
    }

    // ========================================================================
    // IMAGE GENERATION (text-to-image)
    // ========================================================================
    if (segments[0] === 'images' && segments[1] === 'text-to-image' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, prompt, model = 'flux-schnell', ...rest } = JSON.parse(event.body || '{}');
      const submit = await muapiSubmit(model, { prompt, ...rest });
      if (!submit.request_id && !submit.data?.request_id) {
        return json({ error: 'Muapi submit failed', detail: submit }, 502);
      }
      const requestId = submit.request_id || submit.data.request_id;
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'text-to-image',
        model,
        requestId,
        input: { prompt, ...rest },
        resourceType: 'image',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // IMAGE EDIT (inpaint, upscale, etc.)
    // ========================================================================
    if (segments[0] === 'images' && segments[1] === 'edit' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, prompt, image_url, model = 'flux-kontext-pro', ...rest } = JSON.parse(event.body || '{}');
      const submit = await muapiSubmit(model, { prompt, image_url, ...rest });
      if (!submit.request_id && !submit.data?.request_id) {
        return json({ error: 'Muapi submit failed', detail: submit }, 502);
      }
      const requestId = submit.request_id || submit.data.request_id;
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'image-edit',
        model,
        requestId,
        input: { prompt, image_url, ...rest },
        resourceType: 'image',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // TEXT-TO-VIDEO
    // ========================================================================
    if (segments[0] === 'videos' && segments[1] === 'text-to-video' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, prompt, model = 'veo3-fast-text-to-video', ...rest } = JSON.parse(event.body || '{}');
      const submit = await muapiSubmit(model, { prompt, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'text-to-video',
        model,
        requestId,
        input: { prompt, ...rest },
        resourceType: 'video',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // IMAGE-TO-VIDEO
    // ========================================================================
    if (segments[0] === 'videos' && segments[1] === 'image-to-video' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, prompt, image_url, model = 'kling-o1-standard-image-to-video', ...rest } = JSON.parse(event.body || '{}');
      const submit = await muapiSubmit(model, { prompt, image_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'image-to-video',
        model,
        requestId,
        input: { prompt, image_url, ...rest },
        resourceType: 'video',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // LIP-SYNC
    // ========================================================================
    if (segments[0] === 'videos' && segments[1] === 'lip-sync' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, video_url, audio_url, model = 'sync-lipsync', ...rest } = JSON.parse(event.body || '{}');
      const endpoint = model;
      const submit = await muapiSubmit(endpoint, { video_url, audio_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'lip-sync',
        model,
        requestId,
        input: { video_url, audio_url, ...rest },
        resourceType: 'video',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // VIDEO EFFECTS (Wan AI Effects)
    // ========================================================================
    if (segments[0] === 'videos' && segments[1] === 'effects' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, prompt, image_url, name, aspect_ratio = '16:9', resolution = '480p', quality = 'medium', duration = 5 } = JSON.parse(event.body || '{}');
      const submit = await muapiSubmit('generate_wan_ai_effects', {
        prompt,
        image_url,
        name,
        aspect_ratio,
        resolution,
        quality,
        duration,
      });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'video-effects',
        model: 'generate_wan_ai_effects',
        requestId,
        input: { prompt, image_url, name, aspect_ratio, resolution, quality, duration },
        resourceType: 'video',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // IMAGE UPSCALE
    // ========================================================================
    if (segments[0] === 'images' && segments[1] === 'upscale' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, image_url, model, ...rest } = JSON.parse(event.body || '{}');
      const submit = await muapiSubmit(model || 'image-upscale', { image_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'upscale',
        model: model || 'image-upscale',
        requestId,
        input: { image_url, ...rest },
        resourceType: 'image',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // BACKGROUND REMOVER
    // ========================================================================
    if (segments[0] === 'images' && segments[1] === 'background-remover' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, image_url, model, ...rest } = JSON.parse(event.body || '{}');
      const submit = await muapiSubmit(model || 'background-remover', { image_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'background-remover',
        model: model || 'background-remover',
        requestId,
        input: { image_url, ...rest },
        resourceType: 'image',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // FACE SWAP
    // ========================================================================
    if (segments[0] === 'videos' && segments[1] === 'face-swap' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, source_url, target_url, model, ...rest } = JSON.parse(event.body || '{}');
      const submit = await muapiSubmit(model || 'face-swap', {
        source_url,
        target_url,
        ...rest,
      });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'face-swap',
        model: model || 'face-swap',
        requestId,
        input: { source_url, target_url, ...rest },
        resourceType: 'video',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // MUSIC (Suno create / remix / extend)
    // ========================================================================
    if (segments[0] === 'music' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, prompt, model = 'suno-create-music', ...rest } = JSON.parse(event.body || '{}');
      const jobType: JobType =
        model === 'suno-remix-music' ? 'music-remix' :
        model === 'suno-extend-music' ? 'music-extend' : 'music-create';
      const submit = await muapiSubmit(model, { prompt, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: jobType,
        model,
        requestId,
        input: { prompt, ...rest },
        resourceType: 'music',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // AUDIO (MMAudio text-to-audio / video-to-audio)
    // ========================================================================
    if (segments[0] === 'audio' && segments[1] === 'text-to-audio' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, prompt, model = 'mmaudio-v2-text-to-audio', ...rest } = JSON.parse(event.body || '{}');
      const submit = await muapiSubmit(model, { prompt, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'audio-t2a',
        model,
        requestId,
        input: { prompt, ...rest },
        resourceType: 'audio',
      });
      return json({ job, muapi: submit });
    }

    if (segments[0] === 'audio' && segments[1] === 'video-to-audio' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, video_url, prompt, model = 'mmaudio-v2-video-to-video', ...rest } = JSON.parse(event.body || '{}');
      const submit = await muapiSubmit(model, { video_url, prompt, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'audio-v2v',
        model,
        requestId,
        input: { video_url, prompt, ...rest },
        resourceType: 'audio',
      });
      return json({ job, muapi: submit });
    }

    // ========================================================================
    // STORYBOARDING (Project + Character + Scene + Shot)
    // ========================================================================
    if (segments[0] === 'storyboard' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, name, brief } = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('storyboard_projects')
        .insert({ tenant_id: tenantId, user_id, name, brief })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === 'storyboard' && event.httpMethod === 'GET') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { data, error } = await supabase
        .from('storyboard_projects')
        .select('*, storyboard_characters(*), storyboard_episodes(*)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (segments[0] === 'storyboard' && segments[1] === 'character' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('storyboard_characters')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === 'storyboard' && segments[1] === 'episode' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('storyboard_episodes')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === 'storyboard' && segments[1] === 'generate' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { episode_id, shot_index, character_ids, prompt, model = 'veo3-fast-text-to-video' } = JSON.parse(event.body || '{}');

      const { data: ep } = await supabase
        .from('storyboard_episodes')
        .select('*')
        .eq('id', episode_id)
        .single();

      let mergedPrompt = prompt;
      if (character_ids?.length) {
        const { data: chars } = await supabase
          .from('storyboard_characters')
          .select('*')
          .in('id', character_ids);
        const desc = (chars || []).map((c: any) => `${c.name}: ${c.static_features || ''} ${c.dynamic_features || ''}`).join('; ');
        mergedPrompt = `${prompt}. Characters: ${desc}. Setting: ${ep?.setting || ''}.`;
      }

      const submit = await muapiSubmit(model, { prompt: mergedPrompt });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return json({ error: 'Muapi submit failed', detail: submit }, 502);
      const job = await recordJob({
        tenantId,
        userId: null,
        type: 'storyboard-asset',
        model,
        requestId,
        input: { episode_id, shot_index, character_ids, prompt: mergedPrompt },
        resourceType: 'video',
      });

      await supabase.from('storyboard_shots').insert({
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
    if (segments[0] === 'jobs' && event.httpMethod === 'GET') {
      const id = url.searchParams.get('id');
      const action = url.searchParams.get('action');
      const tenantId = await getTenantFromEvent(event);

      if (id && action === 'poll') {
        const { data: job } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single();
        if (!job) return json({ error: 'Job not found' }, 404);
        const result = await muapiPoll(job.request_id);
        const status = result.status || result.data?.status;
        if (status === 'completed') {
          const resourceType = (job.resource_type || MODELS[job.model]?.resource || 'video') as ResourceType;
          const { outputs, resource } = await persistOutputs(job, result, resourceType);
          await finalizeJob(job.id, 'completed', result);
          return json({ status: 'completed', outputs, resource });
        }
        if (status === 'failed') {
          await finalizeJob(job.id, 'failed', result, result.error || result.data?.error);
          return json({ status: 'failed', error: result.error });
        }
        return json({ status, result });
      }

      if (!tenantId) return json({ error: 'Auth required' }, 401);
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);
      const type = url.searchParams.get('type');
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return json(data);
    }

    // ========================================================================
    // VIDEOS / IMAGES / AUDIOS (CRUD with tenant isolation)
    // ========================================================================
    if (segments[0] === 'videos' && event.httpMethod === 'GET') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const userId = url.searchParams.get('user_id');
      let q = supabase.from('videos').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      if (userId) q = q.eq('user_id', userId);
      const { data, error } = await q;
      if (error) throw error;
      return json(data);
    }

    if (segments[0] === 'videos' && event.httpMethod === 'DELETE') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', segments[1])
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (segments[0] === 'images' && event.httpMethod === 'GET') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (segments[0] === 'images' && event.httpMethod === 'DELETE') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { error } = await supabase
        .from('images')
        .delete()
        .eq('id', segments[1])
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (segments[0] === 'audios' && event.httpMethod === 'GET') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { data, error } = await supabase
        .from('audios')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(data);
    }

    // ========================================================================
    // OPENAI: Script / Idea / Caption / Hashtag / Title generation
    // ========================================================================
    if (segments[0] === 'ai' && segments[1] === 'script' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, prompt, model = 'gpt-4o-mini', tone = 'professional', max_words = 120 } = JSON.parse(event.body || '{}');
      const sysPrompt = `You are a top-tier sales copywriter. Write a ${tone} video script under ${max_words} words. Output only the script.`;
      const resp = await openaiResponses(
        [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: prompt },
        ],
        { model }
      );
      const text = await openaiExtractText(resp);
      const { data, error } = await supabase
        .from('scripts')
        .insert({ tenant_id: tenantId, user_id, prompt, output: text, model, kind: 'script' })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === 'ai' && segments[1] === 'ideas' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, prompt, model = 'gpt-4o-mini', count = 5 } = JSON.parse(event.body || '{}');
      const resp = await openaiResponses(
        `Generate ${count} short, punchy personalized video ideas based on: ${prompt}. Return as a JSON array of strings.`,
        { model }
      );
      const text = await openaiExtractText(resp);
      let ideas: string[] = [];
      try {
        const match = text.match(/\[[\s\S]*\]/);
        ideas = match ? JSON.parse(match[0]) : text.split('\n').filter(Boolean);
      } catch {
        ideas = text.split('\n').filter(Boolean);
      }
      const { data, error } = await supabase
        .from('scripts')
        .insert({ tenant_id: tenantId, user_id, prompt, output: text, model, kind: 'ideas' })
        .select()
        .single();
      if (error) throw error;
      return json({ script: data, ideas });
    }

    if (segments[0] === 'ai' && segments[1] === 'caption' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, prompt, platform = 'linkedin', model = 'gpt-4o-mini' } = JSON.parse(event.body || '{}');
      const resp = await openaiResponses(
        `Write a short ${platform} caption with hashtags for this video concept: ${prompt}`,
        { model }
      );
      const text = await openaiExtractText(resp);
      return json({ caption: text });
    }

    if (segments[0] === 'ai' && segments[1] === 'improve' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { user_id, text, model = 'gpt-4o-mini' } = JSON.parse(event.body || '{}');
      const resp = await openaiResponses(
        `Improve the following video script for clarity, tone, and conversion. Return only the improved script.\n\n${text}`,
        { model }
      );
      const improved = await openaiExtractText(resp);
      const { data, error } = await supabase
        .from('scripts')
        .insert({ tenant_id: tenantId, user_id, prompt: text, output: improved, model, kind: 'improved' })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    // ========================================================================
    // SUPABASE STORAGE HELPERS
    // ========================================================================
    if (segments[0] === 'storage' && segments[1] === 'upload' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const body = JSON.parse(event.body || '{}');
      const file = body.file;
      const bucket = body.bucket || 'uploads';
      const path = `${tenantId}/${crypto.randomUUID()}-${file?.name || 'upload'}`;
      // Note: Direct file upload via JSON requires base64 encoding in production
      if (!file) return json({ error: 'file required' }, 400);
      const { error } = await supabase.storage.from(bucket).upload(path, Buffer.from(file.data, 'base64'), {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      return json({ path, url: pub.publicUrl });
    }

    if (segments[0] === 'storage' && segments[1] === 'signed-url' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { bucket, path, expiresIn = 3600 } = JSON.parse(event.body || '{}');
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);
      if (error) throw error;
      return json(data);
    }

    // ========================================================================
    // LEADS / SUBMISSIONS / FEEDBACK
    // ========================================================================
    if (segments[0] === 'leads' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const tenantId = body.tenant_id || (await getTenantFromEvent(event));
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === 'leads' && event.httpMethod === 'GET') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (segments[0] === 'submissions' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const tenantId = body.tenant_id || (await getTenantFromEvent(event));
      const { data, error } = await supabase
        .from('submissions')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    if (segments[0] === 'feedback' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const tenantId = body.tenant_id || (await getTenantFromEvent(event));
      const { data, error } = await supabase
        .from('feedback')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return json(data, 201);
    }

    // ========================================================================
    // VIDEO PROCESSING TRIGGERS
    // ========================================================================
    if (segments[0] === 'videos' && segments[1] === 'preview' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          tenant_id: tenantId,
          user_id: body.user_id || null,
          type: 'ai-preview',
          model: body.model || 'gpt-4o-mini',
          input: body,
          status: 'processing',
        })
        .select()
        .single();
      if (error) throw error;
      return json({ job_id: data.id }, 201);
    }

    if (segments[0] === 'videos' && segments[1] === 'clone' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          tenant_id: tenantId,
          user_id: body.user_id || null,
          type: 'ai-clone',
          model: body.model || 'sync-lipsync',
          input: body,
          status: 'processing',
        })
        .select()
        .single();
      if (error) throw error;
      return json({ job_id: data.id }, 201);
    }

    if (segments[0] === 'videos' && segments[1] === 'process' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          tenant_id: tenantId,
          user_id: body.user_id || null,
          type: 'ai-process',
          model: body.model || 'generate_wan_ai_effects',
          input: body,
          status: 'processing',
        })
        .select()
        .single();
      if (error) throw error;
      return json({ job_id: data.id }, 201);
    }

    if (segments[0] === 'videos' && segments[1] === 'onboarding' && event.httpMethod === 'POST') {
      const tenantId = await getTenantFromEvent(event);
      if (!tenantId) return json({ error: 'Auth required' }, 401);
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          tenant_id: tenantId,
          user_id: body.user_id || null,
          type: 'ai-onboarding',
          model: body.model || 'veo3-fast-text-to-video',
          input: body,
          status: 'processing',
        })
        .select()
        .single();
      if (error) throw error;
      return json({ job_id: data.id }, 201);
    }

    // ========================================================================
    // AUTH
    // ========================================================================
    if (segments[0] === 'auth' && segments[1] === 'signup' && event.httpMethod === 'POST') {
      const { email, password, full_name, tenant_id } = JSON.parse(event.body || '{}');
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, tenant_id },
      });
      if (error) throw error;
      if (tenant_id) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          tenant_id,
          email,
          full_name,
        });
      }
      return json({ user: data.user });
    }

    if (segments[0] === 'auth' && segments[1] === 'invite' && event.httpMethod === 'POST') {
      const { email, full_name, tenant_id, redirectTo } = JSON.parse(event.body || '{}');
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name, tenant_id },
        redirectTo: redirectTo || 'https://app.videco.io/auth/login',
      });
      if (error) throw error;
      return json({ user: data.user });
    }

    return json({ error: 'Not found', path }, 404);
  } catch (err) {
    console.error('Edge Function error:', err);
    return json({ error: (err as Error).message }, 500);
  }
};
