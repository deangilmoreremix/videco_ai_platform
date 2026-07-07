import { callMuapi } from "src/services";

export async function createAIPreview(data: Record<string, unknown>) {
    return callMuapi("videos/preview", { ...data });
}

export async function createAIClone(data: Record<string, unknown>) {
    return callMuapi("videos/clone", { ...data });
}

export async function processAIVideos(data: Record<string, unknown>) {
    return callMuapi("videos/process", { ...data });
}

export async function processOnboardingVideo(data: Record<string, unknown>) {
    return callMuapi("videos/onboarding", { ...data });
}
