import { Handler } from '@netlify/functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id',
  'Content-Type': 'application/json',
};

const supabase = (await import('@supabase/supabase-js')).createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MUAPI_API_KEY = process.env.MUAPI_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

async function muapiSubmit(model: string, payload: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${MUAPI_BASE}/${model}`, {
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

async function openaiGenerate(prompt: string, opts: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: prompt, ...opts }),
  });
  return res.json();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }

  const url = new URL(event.rawUrl || `https://example.com${event.path}`);
  const action = url.searchParams.get('action');
  const id = url.searchParams.get('id');

  try {
    // Submit a video generation job
    if (action === 'text-to-video' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { tenant_id, user_id, prompt, model = 'veo3-fast-text-to-video' } = body;
      if (!prompt || !tenant_id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'prompt and tenant_id required' }) };

      const submit = await muapiSubmit(model, { prompt });
      if (!submit.request_id) return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Muapi submit failed', detail: submit }) };

      const { data, error } = await supabase.from('jobs').insert({
        tenant_id,
        user_id,
        type: 'text-to-video',
        model,
        provider: 'muapi',
        request_id: submit.request_id,
        status: 'processing',
        input: { prompt },
      }).select().single();
      if (error) throw error;
      return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (action === 'image-to-video' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { tenant_id, user_id, prompt, image_url, model = 'kling-o1-standard-image-to-video' } = body;
      if (!prompt || !image_url || !tenant_id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'prompt, image_url, tenant_id required' }) };

      const submit = await muapiSubmit(model, { prompt, image_url });
      if (!submit.request_id) return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Muapi submit failed', detail: submit }) };

      const { data, error } = await supabase.from('jobs').insert({
        tenant_id,
        user_id,
        type: 'image-to-video',
        model,
        provider: 'muapi',
        request_id: submit.request_id,
        status: 'processing',
        input: { prompt, image_url },
      }).select().single();
      if (error) throw error;
      return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (action === 'text-to-image' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { tenant_id, user_id, prompt, model = 'flux-schnell' } = body;
      if (!prompt || !tenant_id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'prompt and tenant_id required' }) };

      const submit = await muapiSubmit(model, { prompt });
      if (!submit.request_id) return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Muapi submit failed', detail: submit }) };

      const { data, error } = await supabase.from('jobs').insert({
        tenant_id,
        user_id,
        type: 'text-to-image',
        model,
        provider: 'muapi',
        request_id: submit.request_id,
        status: 'processing',
        input: { prompt },
      }).select().single();
      if (error) throw error;
      return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (action === 'ai-script' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { tenant_id, user_id, prompt, model = 'gpt-4o-mini' } = body;
      if (!prompt || !tenant_id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'prompt and tenant_id required' }) };

      const result = await openaiGenerate(prompt, { model });
      const text = result.output_text || result.output?.[0]?.content?.[0]?.text || '';

      const { data, error } = await supabase.from('scripts').insert({
        tenant_id,
        user_id,
        prompt,
        output: text,
        model,
      }).select().single();
      if (error) throw error;
      return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(data) };
    }

    // Poll a job's status
    if (action === 'poll' && id) {
      const { data: job, error } = await supabase.from('jobs').select('*').eq('id', id).single();
      if (error || !job) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'job not found' }) };

      const result = await muapiPoll(job.request_id);

      if (result.status === 'completed') {
        const outputs: string[] = result.outputs || [];
        await supabase.from('jobs').update({
          status: 'completed',
          output: result,
          completed_at: new Date().toISOString(),
        }).eq('id', id);

        if (outputs.length && job.tenant_id) {
          if (job.type === 'text-to-video' || job.type === 'image-to-video') {
            await supabase.from('videos').insert({
              tenant_id: job.tenant_id,
              user_id: job.user_id,
              url: outputs[0],
              type: job.type,
              job_id: job.id,
              source: 'muapi',
            });
          } else if (job.type === 'text-to-image') {
            await supabase.from('images').insert({
              tenant_id: job.tenant_id,
              user_id: job.user_id,
              url: outputs[0],
              job_id: job.id,
              source: 'muapi',
            });
          }
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ status: 'completed', outputs }) };
      }

      if (result.status === 'failed') {
        await supabase.from('jobs').update({
          status: 'failed',
          error: result.error,
          completed_at: new Date().toISOString(),
        }).eq('id', id);
      }

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ status: result.status, result }) };
    }

    // List jobs
    if (action === 'list' || (!action && event.httpMethod === 'GET')) {
      const tenantIdHeader = event.headers['x-tenant-id'] || event.headers['X-Tenant-Id'];
      if (!tenantIdHeader) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Auth required' }) };
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('tenant_id', tenantIdHeader)
        .order('created_at', { ascending: false })
        .limit(50);
      const type = url.searchParams.get('type');
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) };
    }

    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Not found' }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: (err as Error).message }) };
  }
};
