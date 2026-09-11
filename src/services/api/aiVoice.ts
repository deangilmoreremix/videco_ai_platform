import { openai } from "../../lib/openai";

export interface VoiceCloneResult {
    data: {
        audio_data: string;
    };
    previewData: {
        data: {
            audio_data: string;
            id: string;
        };
    };
    voiceData: {
        data: {
            id: string;
        };
    };
}

export interface TTSResult {
    data: {
        audio_data: string;
    };
}

const VOICE_MAP: Record<string, string> = {
    alloy: "alloy",
    echo: "echo",
    fable: "fable",
    onyx: "onyx",
    nova: "nova",
    shimmer: "shimmer",
};

function toBase64(buffer: ArrayBuffer): string {
    const bytes = Buffer.from(buffer);
    return bytes.toString("base64");
}

async function synthesizeSpeech(
    text: string,
    voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy",
    model = "tts-1",
): Promise<string> {
    if (!openai) {
        throw new Error("OpenAI client is not configured");
    }

    const mp3 = await openai.audio.speech.create({
        model,
        voice,
        input: text,
    });

    const arrayBuffer = await mp3.arrayBuffer();
    return toBase64(arrayBuffer);
}

/**
 * makeAIVoice - generates a voice clone preview from the given MP3 sample + text.
 *
 * Note: True custom-voice cloning requires an endpoint outside the core TTS API.
 * This function generates the preview audio via OpenAI TTS (tts-1) and returns
 * a voice record structure that can be stored/stubbed for the clone id.
 *
 * The mp3 parameter is accepted for API compatibility; the audio content is
 * intended to be stored in Supabase Storage by the caller, then referenced via
 * URL in a follow-up integration step.
 */
export async function makeAIVoice(
    mp3: string,
    text: string,
    greeting: string,
    _userId: string,
    _userName: string,
    _email: string,
): Promise<VoiceCloneResult> {
    const fullText = greeting ? `${greeting}. ${text}` : text;
    const base64Audio = await synthesizeSpeech(fullText, "alloy", "tts-1");

    return {
        data: {
            audio_data: base64Audio,
        },
        previewData: {
            data: {
                audio_data: base64Audio,
                id: `preview-${Date.now()}`,
            },
        },
        voiceData: {
            data: {
                id: `voice-${Date.now()}`,
            },
        },
    };
}

/**
 * makeTextToVoice - converts the given text to speech using OpenAI TTS.
 * Returns the base64-encoded MP3 audio.
 *
 * @param text      The body text to synthesize.
 * @param greeting  Optional greeting prepended to the text.
 * @param voice_id  One of: alloy, echo, fable, onyx, nova, shimmer. Falls back to alloy.
 * @param language  Accepted for API compatibility; OpenAI TTS does not use a language
 *                  parameter directly - voice selection drives the accent/style.
 */
export async function makeTextToVoice(
    text: string,
    greeting: string,
    voice_id: string,
    _language: string,
): Promise<TTSResult> {
    const selectedVoice =
        voice_id && VOICE_MAP[voice_id] ? VOICE_MAP[voice_id] : "alloy";
    const fullText = greeting ? `${greeting}. ${text}` : text;

    const base64Audio = await synthesizeSpeech(
        fullText,
        selectedVoice,
        "tts-1",
    );

    return {
        data: {
            audio_data: base64Audio,
        },
    };
}
