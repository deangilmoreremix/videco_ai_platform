import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/storage';

const MUAPI_API_KEY = process.env.MUAPI_API_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { job_id } = req.body;

  if (!job_id) {
    return res.status(400).json({ error: 'job_id required' });
  }

  try {
    const muapiResponse = await fetch(
      `https://api.muapi.io/v1/jobs/${job_id}`,
      {
        headers: {
          Authorization: `Bearer ${MUAPI_API_KEY}`,
        },
      }
    );

    const result = await muapiResponse.json();

    if (result.status === 'completed' && result.output_url) {
      const { data: video, error: videoError } = await supabaseAdmin
        .from('videos')
        .select('id')
        .eq('ai_preview', job_id)
        .single();

      if (video && !videoError) {
        await supabaseAdmin
          .from('videos')
          .update({
            final_url: result.output_url,
            media_status: 'completed',
          })
          .eq('id', video.id);
      }
    } else if (result.status === 'failed') {
      const { data: video } = await supabaseAdmin
        .from('videos')
        .select('id')
        .eq('ai_preview', job_id)
        .single();

      if (video) {
        await supabaseAdmin
          .from('videos')
          .update({
            media_status: 'failed',
            error_message: result.error || 'Muapi job failed',
          })
          .eq('id', video.id);
      }
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Poll error:', error);
    return res.status(500).json({ error: error.message });
  }
}