import { blobUrlToBlob } from "src/utils/video";
import { uploadToStorage } from "src/services";

export async function uploadVideoToStorage(
    file: File | Blob,
): Promise<{ data: { path: string; url: string } }> {
    const result = await uploadToStorage(file as File);
    return {
        data: {
            path: result.path,
            url: result.url,
        },
    };
}

/**
 * Upload a recorded blob: URL (voice sample or recording) straight to
 * Supabase Storage with the user's session. The old version posted to
 * /api/v1/videos/upload, which never existed, so every voice recording
 * failed before reaching the server.
 */
export const uploadVideoToStorageDirect = async (file: string) => {
    const blob = await blobUrlToBlob(file);
    const type = blob.type || "audio/webm";
    const ext = type.includes("mp4")
        ? "mp4"
        : type.includes("mpeg")
        ? "mp3"
        : "webm";
    const result = await uploadToStorage(
        new File([blob], `recording.${ext}`, { type }),
    );
    return { data: { public_url: result.url, path: result.path } };
};
