import axios from "axios";

/**
 * Client helper to poll Muapi job status via our Supabase Edge orchestrator.
 * Use this from the editor/player when a video has ai_preview = muapi request_id
 * and media_status is still "in_progress".
 */
export const pollMuapiJob = async (requestId: string, videoId: string | number) => {
  const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-orchestrator`;

  const { data } = await axios.post(edgeUrl, {
    action: "poll",
    request_id: requestId,
    video_id: videoId,
  }, {
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  });

  return data;
};

/**
 * Convenience: keep polling until completed or failed.
 */
export const pollUntilComplete = async (
  requestId: string,
  videoId: string | number,
  onUpdate?: (status: string, finalUrl?: string) => void,
  maxAttempts = 60,
  intervalMs = 5000
) => {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await pollMuapiJob(requestId, videoId);

    if (onUpdate) onUpdate(res.status, res.final_url);

    if (res.status === "completed" || res.status === "failed") {
      return res;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Timed out waiting for Muapi generation");
};
