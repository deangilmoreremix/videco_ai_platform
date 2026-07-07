import { logUsage } from './log';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export interface PersonalizationScript {
  script: string;
  variables: string[];
  estimated_tokens: number;
}

export async function generatePersonalizationScript(
  prompt: string,
  context?: string,
  model: string = 'gpt-4-turbo'
): Promise<PersonalizationScript> {
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that creates personalized video scripts for cold outreach. Generate scripts that are concise, engaging, and include placeholders for personalization variables like {first_name}, {company}, etc.',
        },
        {
          role: 'user',
          content: context ? `${context}\n\n${prompt}` : prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.statusText}`);
  }

  const result = await response.json();
  const script = result.choices[0].message.content;

  const variables = extractVariables(script);

  await logUsage({
    model,
    provider: 'openai',
    action: 'script_generation',
    details: { prompt_length: prompt.length },
    cost_estimate: result.usage?.total_tokens * 0.00001,
  });

  return {
    script,
    variables,
    estimated_tokens: result.usage?.total_tokens || 0,
  };
}

function extractVariables(text: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches = [...text.matchAll(regex)];
  return [...new Set(matches.map(m => m[1]))];
}

export async function generateSpeech(
  text: string,
  voice: string = 'alloy',
  model: string = 'tts-1'
): Promise<string> {
  const response = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS error: ${response.statusText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString('base64');

  await logUsage({
    model,
    provider: 'openai',
    action: 'tts',
    details: { text_length: text.length, voice },
  });

  return base64Audio;
}

export const VOICE_OPTIONS = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
];

export const REALTIME_MODELS = ['gpt-4o-realtime-preview-2024-12-17'];