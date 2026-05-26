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
