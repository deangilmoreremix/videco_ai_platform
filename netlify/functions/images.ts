import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id',
  'Content-Type': 'application/json',
} as const;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MUAPI_API_KEY = process.env.MUAPI_API_KEY!;

async function muapiSubmit(endpoint: string, payload: Record<string, unknown>, queryParams: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${MUAPI_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(queryParams)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'x-api-key': MUAPI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function muapiUpload(file: File): Promise<any> {
  const fd = new FormData();
  fd.append('file', file, file.name);
  const res = await fetch(`${MUAPI_BASE}/upload_file`, {
    method: 'POST',
    headers: { 'x-api-key': MUAPI_API_KEY },
    body: fd,
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

async function recordJob(opts: {
  tenantId: string;
  userId: string | null;
  type: string;
  model: string;
  requestId: string;
  input: Record<string, unknown>;
  resourceType?: string;
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

async function persistOutputs(job: any, result: any, resourceType: string): Promise<{ outputs: string[]; resource?: any }> {
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

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }

  const tenantId = event.headers['x-tenant-id'] || event.headers['X-Tenant-Id'];
  if (!tenantId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'x-tenant-id required' }) };
  }

  const url = new URL(event.rawUrl || `https://example.com${event.path}`);
  const id = url.searchParams.get('id');

  try {
    if (event.httpMethod === 'GET' && !id) {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'POST') {
      const contentType = event.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        // Note: Netlify Functions with esbuild may not support FormData natively in the event.body.
        // For production, use a pre-signed URL or base64-encoded file upload.
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Multipart upload requires pre-processing' }) };
      }

      const body = JSON.parse(event.body || '{}');

      if (body.url) {
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(await muapiUploadFromUrl(body.url)) };
      }

      const { data, error } = await supabase
        .from('images')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'DELETE' && id) {
      const { error } = await supabase
        .from('images')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    }

    // Image generation proxy routes
    if (url.pathname.includes('/text-to-image') && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { user_id, prompt, model = 'flux-schnell', ...rest } = body;
      const submit = await muapiSubmit(model, { prompt, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Muapi submit failed', detail: submit }) };
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'text-to-image',
        model,
        requestId,
        input: { prompt, ...rest },
        resourceType: 'image',
      });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ job, muapi: submit }) };
    }

    if (url.pathname.includes('/edit') && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { user_id, prompt, image_url, model = 'flux-kontext-pro', ...rest } = body;
      const submit = await muapiSubmit(model, { prompt, image_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Muapi submit failed', detail: submit }) };
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'image-edit',
        model,
        requestId,
        input: { prompt, image_url, ...rest },
        resourceType: 'image',
      });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ job, muapi: submit }) };
    }

    if (url.pathname.includes('/upscale') && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { user_id, image_url, model, ...rest } = body;
      const submit = await muapiSubmit(model || 'image-upscale', { image_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Muapi submit failed', detail: submit }) };
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'upscale',
        model: model || 'image-upscale',
        requestId,
        input: { image_url, ...rest },
        resourceType: 'image',
      });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ job, muapi: submit }) };
    }

    if (url.pathname.includes('/background-remover') && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { user_id, image_url, model, ...rest } = body;
      const submit = await muapiSubmit(model || 'background-remover', { image_url, ...rest });
      const requestId = submit.request_id || submit.data?.request_id;
      if (!requestId) return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Muapi submit failed', detail: submit }) };
      const job = await recordJob({
        tenantId,
        userId: user_id,
        type: 'background-remover',
        model: model || 'background-remover',
        requestId,
        input: { image_url, ...rest },
        resourceType: 'image',
      });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ job, muapi: submit }) };
    }

    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Not found', path: event.path }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: (err as Error).message }) };
  }
};
