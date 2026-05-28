import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { logUsage } from '../../../lib/log';
import { generatePersonalizationScript, generateSpeech } from '../../../lib/openai';
import { supabaseAdmin } from '../../../lib/storage';
import { JOB_DETAILS } from '../../../services/inngest';

const USE_MUAPI_AI = process.env.NEXT_PUBLIC_USE_MUAPI_AI === 'true';
const MUAPI_API_KEY = process.env.MUAPI_API_KEY!;

async function callMuapiT2V(prompt: string, model: string = 'muapi-1.0') {
  const response = await fetch('https://api.muapi.io/v1/generate/text-to-video', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MUAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model,
      duration: 5,
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
  const {
    greeting,
    language,
    ai_video_id,
    voice_id,
    text,
    background,
    website,
    og_video_public_id,
    video_id,
  } = req.body;

  const { data: jobData, error } = await supabase
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
      name: 'ai/process',
      data: {
        ai_video_id,
        job_id: jobData.id,
        text,
        language,
        voice_id,
        greeting,
        background,
        og_video_public_id,
        website,
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
    const scriptResult = await generatePersonalizationScript(text, {
      company: background?.company || '',
      name: background?.name || '',
    });

    const t2vResult = await callMuapiT2V(scriptResult.script);

    await supabaseAdmin
      .from('videos')
      .update({
        ai_preview: t2vResult.id,
        media_status: 'in_progress',
      })
      .eq('id', video_id);

    await logUsage({
      user_id: ai_video_id,
      model: 'muapi-1.0',
      provider: 'muapi',
      action: 'text-to-video',
      details: { video_id, template: background?.template },
      cost_estimate: 0.2,
    });

    return res.status(200).json({ success: true, job_id: t2vResult.id });
  } catch (error: any) {
    console.error('Process error:', error);
    return res.status(500).json({ error: error.message });
  }
}