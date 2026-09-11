// MIGRATION NOTE (2026): This file previously contained Inngest job definitions
// (processAIVideos, processOnboardingVideo, createAIIntro) and Cloudinary upload logic.
// Those have been removed. Inngest is no longer part of the stack.
// Replace these stubs with Netlify Function job queue dispatchers + Supabase jobs table polling.
// Stack: Supabase + Netlify Functions + Muapi + OpenAI.

export const JOB_DETAILS = {
    pending: "pending",
    processing: "processing",
    completed: "completed",
    failed: "failed",
};

// Stub: dispatch AI video processing job via Netlify Function
export async function dispatchAIVideoJob(payload: Record<string, unknown>) {
    const netlifyFnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/.netlify/functions/process-ai-video`;
    const res = await fetch(netlifyFnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`process-ai-video failed: ${res.status}`);
    return res.json();
}

// Stub: dispatch onboarding video processing job via Netlify Function
export async function dispatchOnboardingVideoJob(
    payload: Record<string, unknown>,
) {
    const netlifyFnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/.netlify/functions/process-onboarding-video`;
    const res = await fetch(netlifyFnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok)
        throw new Error(`process-onboarding-video failed: ${res.status}`);
    return res.json();
}

// Stub: dispatch AI intro job via Netlify Function
export async function dispatchAIIntroJob(payload: Record<string, unknown>) {
    const netlifyFnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/.netlify/functions/create-ai-intro`;
    const res = await fetch(netlifyFnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`create-ai-intro failed: ${res.status}`);
    return res.json();
}
