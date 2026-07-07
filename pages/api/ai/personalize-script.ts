import type { NextApiRequest, NextApiResponse } from 'next';
import { generatePersonalizationScript } from '../../../lib/openai';
import { logUsage } from '../../../lib/log';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, context, user_id } = req.body;

  try {
    const result = await generatePersonalizationScript(prompt, context);

    await logUsage({
      user_id,
      model: 'gpt-4-turbo',
      provider: 'openai',
      action: 'script_generation',
      details: { prompt_length: prompt.length },
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Personalize script error:', error);
    return res.status(500).json({ error: error.message });
  }
}