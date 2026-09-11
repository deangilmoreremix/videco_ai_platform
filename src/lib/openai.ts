import OpenAI from "openai";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = process.env.OPENAI_MODEL_FOR_SCRIPTS || "gpt-4o";

if (!OPENAI_KEY && process.env.NODE_ENV !== "test") {
    console.warn(
        "[openai] OPENAI_API_KEY not set - personalization & voice features disabled",
    );
}

export const openai = OPENAI_KEY
    ? new OpenAI({ apiKey: OPENAI_KEY })
    : (null as unknown as OpenAI);

/**
 * Generic script/response generator using OpenAI Chat Completion.
 * Accepts an arbitrary prompt and optional model override.
 */
export async function generateScript(
    prompt: string,
    model?: string,
): Promise<string> {
    if (!openai) throw new Error("OpenAI client not initialized");

    const completion = await openai.chat.completions.create({
        model: model || DEFAULT_MODEL,
        messages: [
            {
                role: "system",
                content:
                    "You are a professional video scriptwriter. Produce concise, natural, high-conversion scripts suitable for spoken delivery.",
            },
            { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
    });

    return completion.choices[0]?.message?.content?.trim() || "";
}

/**
 * Generate a vector embedding for the given text using the text-embedding-3-small model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!openai) throw new Error("OpenAI client not initialized");

    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });

    return response.data[0]?.embedding || [];
}

/**
 * Transcribe an audio buffer to text using OpenAI Whisper (whisper-1).
 */
export async function transcribeAudio(
    audioBuffer: Buffer | ArrayBuffer,
): Promise<string> {
    if (!openai) throw new Error("OpenAI client not initialized");

    const buffer = Buffer.isBuffer(audioBuffer)
        ? audioBuffer
        : Buffer.from(audioBuffer);

    const file = new File([buffer], "audio.mp3", { type: "audio/mpeg" });

    const transcription = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
    });

    return transcription.text || "";
}

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
    user_id?: string;
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
        user_id,
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

    if (user_id) {
        logOpenAIUsage({
            user_id,
            model: DEFAULT_MODEL,
            action: "generatePersonalizedScript",
            tokens: completion.usage?.total_tokens || 0,
            details: {
                leadName,
                company,
                painPoint,
                product,
                tone,
                durationSeconds,
            },
        });
    }

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: unknown;
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
export async function textToSpeech(
    text: string,
    voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy",
    user_id?: string,
) {
    if (!openai) throw new Error("OpenAI client not initialized");

    const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice,
        input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    if (user_id) {
        logOpenAIUsage({
            user_id,
            model: "tts-1",
            action: "textToSpeech",
            tokens: Math.ceil(text.length / 4),
            details: { textLength: text.length, voice },
        });
    }

    return buffer;
}

/**
 * Realtime API session helper (client-side usage recommended).
 */
export function getRealtimeConfig() {
    return {
        model:
            process.env.OPENAI_REALTIME_MODEL ||
            "gpt-4o-realtime-preview-2024-12-17",
    };
}

/**
 * Structured outreach package (email + video script) using Chat Completions.
 */
export async function generateOutreachPackage(lead: unknown, user_id?: string) {
    if (!openai) throw new Error("OpenAI not configured");

    const res = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
            {
                role: "system",
                content:
                    "Generate personalized cold outreach email + short video script. Return JSON {email, videoScript}.",
            },
            { role: "user", content: JSON.stringify(lead) },
        ],
        response_format: { type: "json_object" },
    });

    if (user_id) {
        logOpenAIUsage({
            user_id,
            model: DEFAULT_MODEL,
            action: "generateOutreachPackage",
            tokens: res.usage?.total_tokens || 0,
            details: { lead },
        });
    }

    return JSON.parse(res.choices[0]?.message?.content || "{}");
}

async function logOpenAIUsage({
    user_id,
    model,
    action,
    tokens,
    details,
}: {
    user_id: string;
    model: string;
    action: string;
    tokens: number;
    details: unknown;
}) {
    try {
        let cost_estimate = 0;
        if (model.includes("gpt-4o")) {
            cost_estimate = (tokens / 1000) * 0.005;
        } else if (model.includes("tts-1")) {
            cost_estimate = (tokens / 1000) * 0.015;
        } else {
            cost_estimate = (tokens / 1000) * 0.002;
        }

        if (typeof window !== "undefined") {
            await fetch("/api/usage/log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id,
                    model,
                    provider: "openai",
                    action,
                    details: JSON.stringify(details),
                    cost_estimate,
                }),
            });
        }
    } catch (e) {
        console.warn("Failed to log OpenAI usage", e);
    }
}
