import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '../../../lib/storage';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['muapi-signature'] as string;
  const webhookSecret = process.env.MUAPI_WEBHOOK_SECRET;

  if (webhookSecret && signature !== webhookSecret) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const payload = JSON.parse(body);
      const { id, status, output_url, error } = payload;

      if (status === 'completed' && output_url) {
        const { data: video, error: videoError } = await supabaseAdmin
          .from('videos')
          .select('id')
          .eq('ai_preview', id)
          .single();

        if (video && !videoError) {
          await supabaseAdmin
            .from('videos')
            .update({
              final_url: output_url,
              media_status: 'completed',
            })
            .eq('id', video.id);
        }
      } else if (status === 'failed') {
        const { data: video } = await supabaseAdmin
          .from('videos')
          .select('id')
          .eq('ai_preview', id)
          .single();

        if (video) {
          await supabaseAdmin
            .from('videos')
            .update({
              media_status: 'failed',
              error_message: error || 'Muapi job failed',
            })
            .eq('id', video.id);
        }
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}