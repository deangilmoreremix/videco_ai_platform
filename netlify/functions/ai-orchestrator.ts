import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

type Json = Record<string, unknown>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-internal-secret, x-muapi-webhook, x-muapi-webhook-secret',
  'Content-Type': 'application/json',
} as const;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MUAPI_API_KEY = process.env.MUAPI_API_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const MUAPI_WEBHOOK_SECRET = process.env.MUAPI_WEBHOOK_SECRET;
const INTERNAL_FUNCTION_SECRET = process.env.INTERNAL_FUNCTION_SECRET;

const MODELS = {
  LIPSYNC_OMNI: 'sd-2-omni-reference',
  FAST_I2V: 'seedance-lite-i2v',
  HIGH_QUALITY_I2V: 'kling-o1-standard-image-to-video',
  FAST_T2V: 'veo3-fast-text-to-video',
};

async function handlePersonalizeScript(data: Json) {
  const { lead, video_id } = data;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You write short personalized cold outreach video scripts (30-60s spoken). Return strict JSON {greeting, body, cta, fullScript}',
        },
        { role: 'user', content: JSON.stringify(lead) },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  const openaiRes = await res.json();
  const script = JSON.parse(openaiRes.choices?.[0]?.message?.content || '{}');

  if (video_id) {
    await supabase
      .from('videos')
      .update({ meta_data: { ...data, personalized_script: script } })
      .eq('id', video_id);
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, script }) };
}

async function handleProcessVideo(data: Json) {
  try {
    const { ai_video_id, text } = data;
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/usage`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: data.user_id || null, model: 'tts-1', provider: 'openai', action: 'generate-tts', details: { text_len: (typeof text === 'string' ? text : '').length }, cost_estimate: 0.0 }),
    }).catch(() => {});
  } catch (e) {}

  const { ai_video_id, text, og_video_public_id } = data;

  await supabase
    .from('ai_videos')
    .update({ status: 'processing' })
    .eq('id', ai_video_id);

  // 1. Generate voice
  const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'tts-1', input: text, voice: 'alloy' }),
  });
  const audioBuffer = await ttsRes.arrayBuffer();

  // 2. Upload audio to Muapi (multipart)
  const audioForm = new FormData();
  audioForm.append('file', new Blob([audioBuffer], { type: 'audio/mp3' }), 'voice.mp3');

  const audioUpload = await fetch(`${MUAPI_BASE}/upload_file`, {
    method: 'POST',
    headers: { 'x-api-key': MUAPI_API_KEY },
    body: audioForm,
  }).then((r) => r.json());

  // 3. Submit to Muapi for lipsync/talking head
  const videoJob = await fetch(`${MUAPI_BASE}/${MODELS.LIPSYNC_OMNI}`, {
    method: 'POST',
    headers: { 'x-api-key': MUAPI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'professional talking head, perfect lip sync, natural head movement',
      video_url: og_video_public_id,
      audio_url: audioUpload.url || audioUpload.public_url,
    }),
  }).then((r) => r.json());

  await supabase
    .from('ai_videos')
    .update({ status: 'in_progress', ai_preview: videoJob.request_id })
    .eq('id', ai_video_id);

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, muapi_request_id: videoJob.request_id }) };
}

async function handleAiClone(data: Json) {
  const { video_url, video_id, language, text, audio_url: providedAudioUrl } = data;

  let audioUrl = providedAudioUrl;

  if (!audioUrl && text) {
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'tts-1', input: text, voice: 'alloy' }),
    });
    const audioBuffer = await ttsRes.arrayBuffer();

    const audioForm = new FormData();
    audioForm.append('file', new Blob([audioBuffer], { type: 'audio/mp3' }), 'clone-voice.mp3');

    const audioUpload = await fetch(`${MUAPI_BASE}/upload_file`, {
      method: 'POST',
      headers: { 'x-api-key': MUAPI_API_KEY },
      body: audioForm,
    }).then((r) => r.json());

    audioUrl = audioUpload.url || audioUpload.public_url;
  }

  if (!audioUrl) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No audio provided and no text to synthesize voice from' }) };
  }

  const cloneJob = await fetch(`${MUAPI_BASE}/${MODELS.LIPSYNC_OMNI}`, {
    method: 'POST',
    headers: { 'x-api-key': MUAPI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'talking head with perfect lip synchronization and natural motion',
      video_url,
      audio_url: audioUrl,
    }),
  }).then((r) => r.json());

  if (video_id) {
    await supabase
      .from('videos')
      .update({
        ai_preview: cloneJob.request_id,
        media_status: 'in_progress',
        language: language || 'english',
      })
      .eq('id', video_id);
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, request_id: cloneJob.request_id, audio_url: audioUrl }) };
}

async function handlePollMuapi(data: Json) {
  const { request_id, video_id, ai_video_id } = data;

  const result = await fetch(`${MUAPI_BASE}/predictions/${request_id}/result`, {
    headers: { 'x-api-key': MUAPI_API_KEY },
  }).then((r) => r.json());

  if (result.status === 'completed' && result.outputs?.length > 0) {
    const finalUrl = result.outputs[0].url;

    if (video_id) {
      await supabase
        .from('videos')
        .update({
          final_url: finalUrl,
          preview: finalUrl,
          media_status: 'completed',
          ai_preview: request_id,
        })
        .eq('id', video_id);
    }

    if (ai_video_id) {
      await supabase
        .from('ai_videos')
        .update({ status: 'completed', url: finalUrl })
        .eq('id', ai_video_id);
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, status: 'completed', final_url: finalUrl }) };
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, status: result.status }) };
}

async function handleMuapiWebhook(data: Json, rawBody?: string, signatureHeader?: string) {
  const { request_id, status, outputs, video_id, ai_video_id } = data;

  if (signatureHeader && MUAPI_WEBHOOK_SECRET) {
    try {
      const hmac = require('crypto').createHmac('sha256', MUAPI_WEBHOOK_SECRET).update(rawBody || JSON.stringify(data), 'utf8').digest('hex');
      const normalized = signatureHeader.startsWith('sha256=') ? signatureHeader.split('=')[1] : signatureHeader;
      const verified = require('crypto').timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(normalized, 'hex'));
      if (!verified) {
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ received: false, error: 'invalid signature' }) };
      }
    } catch (err) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ received: false, error: 'signature_error' }) };
    }
  }

  async function getExistingStatus() {
    if (video_id) {
      const { data: v } = await supabase.from('videos').select('media_status, ai_preview').eq('id', video_id).single();
      return v;
    }
    if (ai_video_id) {
      const { data: a } = await supabase.from('ai_videos').select('status, ai_preview').eq('id', ai_video_id).single();
      return a;
    }
    return null;
  }

  const existing = await getExistingStatus();
  if (existing) {
    const isCompleted =
      (existing as Json).media_status === 'completed' ||
      (existing as Json).status === 'completed';
    if (isCompleted) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ received: true, ignored: true }) };
    }
  }

  async function reliableUpdate(table: string, payload: Json, eqClause: string) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { error } = await supabase.from(table).update(payload).eq('id', eqClause);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error(`[ai-orchestrator] DB update attempt ${attempt} failed for ${table} id=${eqClause}`, err);
        if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
      }
    }
    return false;
  }

  if (status === 'completed' && outputs?.[0]?.url) {
    const finalUrl = outputs[0].url;

    if (video_id) {
      await reliableUpdate('videos', { final_url: finalUrl, preview: finalUrl, media_status: 'completed', ai_preview: request_id }, video_id as string);
    }

    if (ai_video_id) {
      await reliableUpdate('ai_videos', { status: 'completed', url: finalUrl }, ai_video_id as string);
    }
  } else if (status === 'failed') {
    if (video_id) await reliableUpdate('videos', { media_status: 'failed' }, video_id as string);
    if (ai_video_id) await reliableUpdate('ai_videos', { status: 'failed' }, ai_video_id as string);
  }

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ received: true }) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers.Authorization || event.headers.authorization;
  const internalSecret = event.headers['x-internal-secret'] || event.headers['X-Internal-Secret'];
  const isWebhook = event.headers['x-muapi-webhook'] === 'true';

  const validAuth =
    (authHeader && authHeader.includes(process.env.SUPABASE_SERVICE_ROLE_KEY!)) ||
    internalSecret === INTERNAL_FUNCTION_SECRET ||
    isWebhook;

  if (!validAuth) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let payload: Json;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  console.log('[ai-orchestrator] received action:', payload.action);

  try {
    switch (payload.action) {
      case 'personalize-script':
        return await handlePersonalizeScript(payload);
      case 'process':
        return await handleProcessVideo(payload);
      case 'clone':
        return await handleAiClone(payload);
      case 'poll':
        return await handlePollMuapi(payload);
      case 'muapi-webhook':
        return await handleMuapiWebhook(payload, event.body, event.headers['x-muapi-webhook-secret'] || event.headers['X-Muapi-Webhook-Secret']);
      default:
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Unknown action' }) };
    }
  } catch (err: unknown) {
    console.error('[ai-orchestrator] error', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }) };
  }
};
