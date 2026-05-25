/**
 * Supabase Storage Helpers
 * Gradual replacement for Cloudinary direct uploads.
 *
 * Buckets recommended:
 * - user-uploads (private or public)
 * - ai-generated (public)
 */

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const supabase = createClientComponentClient();

export async function uploadToSupabaseStorage(
  file: File | Blob,
  bucket = "user-uploads",
  path?: string
): Promise<string> {
  const fileName = path || `${Date.now()}-${(file as File).name || "file"}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw error;

  const { data: publicUrl } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteFromStorage(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

/**
 * Convenience for video files (uses same logic).
 */
export const uploadVideo = (file: File | Blob, path?: string) =>
  uploadToSupabaseStorage(file, "user-uploads", path);

export const uploadAiAsset = (file: File | Blob, path?: string) =>
  uploadToSupabaseStorage(file, "ai-generated", path);
