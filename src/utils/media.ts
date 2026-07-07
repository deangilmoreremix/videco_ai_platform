const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const DEFAULT_BUCKET = "user-uploads";

export function normalizeMediaUrl(urlOrPath: string | undefined | null) {
    if (!urlOrPath) return "";

    if (/^https?:\/\//.test(urlOrPath)) return urlOrPath;

    const parts = urlOrPath.split("/").filter(Boolean);
    let bucket = DEFAULT_BUCKET;
    let path = urlOrPath;

    if (parts.length > 1 && parts[0].includes("-")) {
        bucket = parts[0];
        path = parts.slice(1).join("/");
    }

    return `${SUPABASE_URL.replace(
        /\/$/,
        "",
    )}/storage/v1/object/public/${bucket}/${encodeURI(path)}`;
}

export function getPublicMediaUrl(videoRow: any) {
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
        if (/^https?:\/\//.test(c)) return c;
        return normalizeMediaUrl(c);
    }

    return "";
}

export function buildPreviewUrl(original: string | undefined | null) {
    if (!original) return "";
    if (/^https?:\/\//.test(original)) {
        return original;
    }
    return normalizeMediaUrl(original);
}

export function getGifPreviewUrl(original: string | undefined | null) {
    try {
        if (!original) return "/default_thumb.png";
        return "/default_thumb.png";
    } catch (e) {
        return "/default_thumb.png";
    }
}
