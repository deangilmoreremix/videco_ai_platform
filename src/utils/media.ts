export function isCloudinaryUrl(url: string | undefined | null) {
    if (!url) return false;
    try {
        return /cloudinary\.com/.test(url);
    } catch (e) {
        return false;
    }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const DEFAULT_BUCKET = "user-uploads";

export function normalizeMediaUrl(urlOrPath: string | undefined | null) {
    if (!urlOrPath) return "";

    // Already an absolute URL
    if (/^https?:\/\//.test(urlOrPath)) return urlOrPath;

    // If the path already includes a bucket prefix like "bucket-name/path/to/file"
    const parts = urlOrPath.split("/").filter(Boolean);
    let bucket = DEFAULT_BUCKET;
    let path = urlOrPath;

    if (parts.length > 1 && parts[0].includes("-")) {
        // heuristic: treat first segment as bucket when it contains a hyphen
        bucket = parts[0];
        path = parts.slice(1).join("/");
    }

    // If the provided string looks like just a filename, treat it as stored in DEFAULT_BUCKET
    return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${encodeURI(path)}`;
}

export function getPublicMediaUrl(videoRow: any) {
    // Prefer final_url, then preview, then url, then any common variants
    const candidates = [
        videoRow?.final_url,
        videoRow?.finalUrl,
        videoRow?.preview,
        videoRow?.url,
        videoRow?.public_url,
        videoRow?.path,
    ];

    for (const c of candidates) {
        if (!c) continue;
        if (isCloudinaryUrl(c)) return c;
        // if c is already an absolute url, return it
        if (/^https?:\/\//.test(c)) return c;
        // otherwise normalize from Supabase
        return normalizeMediaUrl(c);
    }

    return "";
}

/**
 * Build a preview URL. When a Cloudinary absolute URL or Cloudinary path is present,
 * prefer returning the Cloudinary transform URL (best-effort). Otherwise use Supabase public URL.
 * transformPrefix is typically the Cloudinary transform & prefix up to the place where the public id is appended.
 */
export function buildPreviewUrl(original: string | undefined | null, transformPrefix?: string) {
    if (!original) return "";
    if (/^https?:\/\//.test(original)) {
        // Absolute URL: return as-is
        return original;
    }

    // If original looks like a Cloudinary public id with slashes or starts with 'v' etc.
    if (original.includes("res.cloudinary.com") || original.includes("cloudinary.com")) {
        return original;
    }

    // If transformPrefix provided and original looks like a cloudinary public id, construct
    if (transformPrefix && original && original.length > 0 && transformPrefix.includes("res.cloudinary.com")) {
        return `${transformPrefix}${original}`;
    }

    // fallback: normalized supabase public url
    return normalizeMediaUrl(original);
}
