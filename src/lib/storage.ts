import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_USER_UPLOADS = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET || 'user-uploads';
const BUCKET_AI_ASSETS = process.env.NEXT_PUBLIC_SUPABASE_AI_BUCKET || 'ai-assets';

export async function uploadToSupabaseStorage(
  file: Buffer | File,
  path: string,
  bucket: string = BUCKET_USER_UPLOADS
): Promise<{ publicUrl: string; path: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType: 'auto-detect',
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);

  return {
    publicUrl: urlData.publicUrl,
    path: path,
  };
}

export async function getSignedUrl(
  path: string,
  bucket: string = BUCKET_USER_UPLOADS,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteFromStorage(
  path: string,
  bucket: string = BUCKET_USER_UPLOADS
): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export function uploadVideo(
  file: Buffer | File,
  userId: string,
  filename: string
): Promise<{ publicUrl: string; path: string }> {
  const path = `${userId}/videos/${filename}`;
  return uploadToSupabaseStorage(file, path, BUCKET_USER_UPLOADS);
}

export function uploadAiAsset(
  file: Buffer | File,
  userId: string,
  filename: string
): Promise<{ publicUrl: string; path: string }> {
  const path = `${userId}/ai/${filename}`;
  return uploadToSupabaseStorage(file, path, BUCKET_AI_ASSETS);
}