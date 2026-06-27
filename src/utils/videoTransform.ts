// Video transformation helpers
// Stack: Supabase Storage + Muapi
// Supabase Storage supports on-the-fly image transformations but NOT video.
// For video, we just return the raw URL from Muapi / Supabase Storage.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

/**
 * Get a public URL for a Supabase Storage object.
 */
export function getStorageUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Get a signed URL for a private Supabase Storage object.
 * Use the Edge Function /api/storage/signed-url instead.
 */

/**
 * Pass-through: no transformation. Muapi videos are already served from
 * the muapi.ai CDN with 30-day expiry.
 */
export function videoUrl(rawUrl: string): string {
  return rawUrl;
}

/**
 * Resolve a video preview / share URL. If the URL is already public, return it.
 * Otherwise pass through unchanged (the Edge Function must already have stored a
 * public URL in the videos.url column).
 */
export function shareUrl(rawUrl: string): string {
  return rawUrl;
}

/**
 * Thumbnail URL. Muapi image-to-video endpoints already return a thumbnail;
 * for other types we fall back to a placeholder.
 */
export function thumbnailUrl(rawUrl: string | undefined | null): string {
  return rawUrl || `${SUPABASE_URL}/storage/v1/object/public/thumbnails/placeholder.png`;
}