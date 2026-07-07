export function isCloudinaryUrl(url: string): boolean {
  return url?.includes('cloudinary.com') || url?.includes('res.cloudinary.com');
}

export function normalizeMediaUrl(url: string): string {
  if (!url) return '/default_thumb.png';
  if (isCloudinaryUrl(url)) return url;
  return url;
}

export function buildPreviewUrl(
  url: string,
  height: number = 400,
  format: 'gif' | 'mp4' = 'gif'
): string {
  if (!url) return '/default_thumb.png';

  if (isCloudinaryUrl(url)) {
    const baseUrl = url.replace('/upload/', `/upload/c_scale,h_${height}/`);
    return baseUrl
      .replace(/\.(mp4|mov|m3u8|webm)$/, `.${format}`)
      .replace(/\/video\/upload\//, `/video/upload/`);
  }

  return url;
}

export function getGifPreviewUrl(url: string): string {
  return buildPreviewUrl(url, 320, 'gif');
}

export function getPublicMediaUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET || 'user-uploads';
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}