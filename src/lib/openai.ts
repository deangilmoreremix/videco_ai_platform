/**
 * OpenAI Integration Layer (2026 stack)
 * - Responses API for structured personalization & scripts
 * - Realtime API (voice conversations / live preview)
 * - Standard chat completions as fallback
 *
 * Replaces / augments previous Speechify voice + hardcoded LLM usage.
 */

import OpenAI from "openai";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = process.env.OPENAI_MODEL_FOR_SCRIPTS || "gpt-4o";

if (!OPENAI_KEY && process.env.NODE_ENV !== "test") {
  console.warn("[openai] OPENAI_API_KEY not set - personalization & voice features disabled");
}

export const openai = OPENAI_KEY
  ? new OpenAI({ apiKey: OPENAI_KEY })
  : (null as unknown as OpenAI);

/**
 * Generate a personalized 30-60s video script for cold outreach.
 * Uses structured outputs (Responses API style via chat + JSON mode for broad compatibility).
 */
export async function generatePersonalizedScript(params: {
  leadName?: string;
  company?: string;
  painPoint?: string;
  product?: string;
  tone?: "professional" | "casual" | "friendly";
  durationSeconds?: number;
}): Promise<{
  greeting: string;
  body: string;
  cta: string;
  fullScript: string;
}> {
  if (!openai) throw new Error("OpenAI client not initialized");

  const {
    leadName = "there",
    company = "your company",
    painPoint = "scaling outreach",
    product = "our solution",
    tone = "professional",
    durationSeconds = 45,
  } = params;

  const system = `You are an expert cold outreach script writer. Create concise, natural, high-conversion video scripts under ${durationSeconds} seconds when spoken at normal pace. Always return strict JSON.`;

  const user = `Lead: ${leadName} at ${company}. Pain: ${painPoint}. Product: ${product}. Tone: ${tone}.`;

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 400,
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { greeting: "", body: raw, cta: "" };
  }

  const fullScript = [parsed.greeting, parsed.body, parsed.cta]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    greeting: parsed.greeting || `Hi ${leadName},`,
    body: parsed.body || `I wanted to reach out about ${painPoint}.`,
    cta: parsed.cta || "Let's hop on a quick call.",
    fullScript,
  };
}

/**
 * Simple TTS using OpenAI (for voice previews / fallback).
 * Returns base64 audio or URL depending on usage.
 */
export async function textToSpeech(text: string, voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy") {
  if (!openai) throw new Error("OpenAI client not initialized");

  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  return buffer; // caller decides storage (Supabase / Muapi / etc.)
}

/**
 * Realtime API session helper (client-side usage recommended).
 * Server can generate ephemeral tokens if using the beta.
 */
export function getRealtimeConfig() {
  return {
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17",
    // Instructions, tools, etc. configured on client
  };
}

/**
 * Example: structured outreach email + video variant using Responses-style prompt.
 */
export async function generateOutreachPackage(lead: any) {
  if (!openai) throw new Error("OpenAI not configured");

  const res = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: "Generate personalized cold outreach email + short video script. Return JSON {email, videoScript}.",
      },
      { role: "user", content: JSON.stringify(lead) },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(res.choices[0]?.message?.content || "{}");
}
