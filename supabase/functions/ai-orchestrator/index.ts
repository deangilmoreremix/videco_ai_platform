import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === 'POST') {
    const body = await req.json();

    if (path === '/clone') {
      return handleClone(body);
    }

    if (path === '/process') {
      return handleProcess(body);
    }

    if (path === '/personalize-script') {
      return handlePersonalizeScript(body);
    }

    if (path === '/poll') {
      return handlePoll(body);
    }
  }

  if (req.method === 'GET' && path === '/health') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Not found', { status: 404 });
});

async function handleClone(body: any) {
  const { video_id, user_id, text, voice, model } = body;

  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('training_video, language')
    .eq('id', video_id)
    .single();

  if (videoError) throw videoError;

  let audioUrl = video.training_video;
  if (text && voice) {
    const speechResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice,
        input: text,
      }),
    });

    const audioBuffer = await speechResponse.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ai-assets')
      .upload(`${user_id}/audio/${video_id}.mp3`, audioBuffer, {
        contentType: 'audio/mpeg',
      });

    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage
      .from('ai-assets')
      .getPublicUrl(uploadData.path);
    audioUrl = urlData.publicUrl;
  }

  const muapiResponse = await fetch('https://api.muapi.io/v1/generate/lipsync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('MUAPI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_url: video.training_video,
      audio_url: audioUrl,
      model: model || 'lipsync-v1',
    }),
  });

  const muapiResult = await muapiResponse.json();

  await supabase
    .from('videos')
    .update({
      ai_preview: muapiResult.id,
      media_status: 'in_progress',
    })
    .eq('id', video_id);

  await supabase.from('usage').insert({
    user_id,
    model: model || 'lipsync-v1',
    provider: 'muapi',
    action: 'lipsync',
    details: { video_id },
    cost_estimate: 0.1,
  });

  return new Response(JSON.stringify(muapiResult), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleProcess(body: any) {
  const { video_id, user_id, prompt, template } = body;

  const muapiResponse = await fetch('https://api.muapi.io/v1/generate/text-to-video', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('MUAPI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model: 'muapi-1.0',
    }),
  });

  const muapiResult = await muapiResponse.json();

  await supabase
    .from('videos')
    .update({
      ai_preview: muapiResult.id,
      media_status: 'in_progress',
    })
    .eq('id', video_id);

  await supabase.from('usage').insert({
    user_id,
    model: 'muapi-1.0',
    provider: 'muapi',
    action: 'text-to-video',
    details: { video_id, template },
    cost_estimate: 0.2,
  });

  return new Response(JSON.stringify(muapiResult), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handlePersonalizeScript(body: any) {
  const { prompt, context, user_id } = body;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Create personalized video scripts for cold outreach with placeholders.',
        },
        {
          role: 'user',
          content: context ? `${context}\n\n${prompt}` : prompt,
        },
      ],
      max_tokens: 500,
    }),
  });

  const result = await response.json();
  const script = result.choices[0].message.content;
  const variables = [...new Set(script.match(/\{([^}]+)\}/g)?.map((m: string) => m.slice(1, -1)) || [])];

  await supabase.from('usage').insert({
    user_id,
    model: 'gpt-4-turbo',
    provider: 'openai',
    action: 'script_generation',
    details: { prompt_length: prompt.length },
    cost_estimate: result.usage?.total_tokens * 0.00001,
  });

  return new Response(JSON.stringify({ script, variables }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handlePoll(body: any) {
  const { job_id } = body;

  const response = await fetch(`https://api.muapi.io/v1/jobs/${job_id}`, {
    headers: {
      Authorization: `Bearer ${Deno.env.get('MUAPI_API_KEY')}`,
    },
  });

  const result = await response.json();

  if (result.status === 'completed' && result.output_url) {
    const { data: video } = await supabase
      .from('videos')
      .select('id')
      .eq('ai_preview', job_id)
      .single();

    if (video) {
      await supabase
        .from('videos')
        .update({
          final_url: result.output_url,
          media_status: 'completed',
        })
        .eq('id', video.id);
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}