import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { logUsage } from '../../../lib/log';
import { generateSpeech } from '../../../lib/openai';
import { supabaseAdmin } from '../../../lib/storage';
import { JOB_DETAILS } from '../../../services/inngest';

const USE_MUAPI_AI = process.env.NEXT_PUBLIC_USE_MUAPI_AI === 'true';
const MUAPI_API_KEY = process.env.MUAPI_API_KEY!;

async function callMuapiLipsync(
  videoUrl: string,
  audioUrl: string,
  model: string = 'lipsync-v1'
) {
  const response = await fetch('https://api.muapi.io/v1/generate/lipsync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MUAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_url: videoUrl,
      audio_url: audioUrl,
      model,
    }),
  });

  if (!response.ok) {
    throw new Error(`Muapi error: ${response.statusText}`);
  }

  return response.json();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClientComponentClient();
  const { video_url, language, ai_video_id, voice_id, text, video_id } = req.body;

  const { data, error } = await supabase
    .from('jobs')
    .insert([
      {
        job_details: {
          ai_video_id: ai_video_id,
        },
        status: JOB_DETAILS.pending,
      },
    ])
    .select('id')
    .single();

  if (!USE_MUAPI_AI) {
    const event = {
      name: 'ai/clone',
      data: {
        ai_video_id,
        job_id: data?.id,
        text,
        language,
        voice_id,
        video_url,
        video_id,
      },
    };

    return res.status(200).json({
      success: true,
      legacy: true,
      event,
      message: 'Legacy Inngest path (set NEXT_PUBLIC_USE_MUAPI_AI=true to use Muapi)',
    });
  }

  try {
    let audioUrl = video_url;

    if (text && voice_id) {
      const base64Audio = await generateSpeech(text, voice_id);
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      const path = `${video_id}/audio.mp3`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('ai-assets')
        .upload(path, audioBuffer, { contentType: 'audio/mpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabaseAdmin.storage
        .from('ai-assets')
        .getPublicUrl(uploadData.path);
      audioUrl = urlData.publicUrl;
    }

    const muapiResult = await callMuapiLipsync(video_url, audioUrl);

    await supabaseAdmin
      .from('videos')
      .update({
        ai_preview: muapiResult.id,
        media_status: 'in_progress',
      })
      .eq('id', video_id);

    await logUsage({
      user_id: ai_video_id,
      model: 'lipsync-v1',
      provider: 'muapi',
      action: 'lipsync',
      details: { video_id },
      cost_estimate: 0.1,
    });

    return res.status(200).json({ success: true, job_id: muapiResult.id });
  } catch (error: any) {
    console.error('Clone error:', error);
    return res.status(500).json({ error: error.message });
  }
}