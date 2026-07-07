/**
 * Supabase Storage Helpers
 * Gradual replacement for Cloudinary direct uploads.
 *
 * Buckets recommended:
 * - user-uploads (private or public)
 * - ai-generated (public)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { FileObject } from "@supabase/storage-js";

export interface UploadFileResult {
    path: string;
    url: string;
}

function getStorageKey(): string {
    const isServer = typeof window === "undefined";
    if (isServer) {
        return (
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
}

function createStorageClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
    }

    const key = getStorageKey();
    if (!key) {
        throw new Error("Supabase key is not configured");
    }

    return createClient(url, key);
}

export function storage(): SupabaseClient {
    return createStorageClient();
}

export async function uploadFile(
    bucket: string,
    path: string,
    file: File | Buffer | Blob,
    contentType?: string,
): Promise<UploadFileResult> {
    try {
        const client = storage();
        const { data, error } = await client.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: "3600",
                upsert: true,
                contentType:
                    contentType ||
                    (file instanceof File ? file.type : undefined),
            });

        if (error) throw error;

        const { data: publicUrlData } = client.storage
            .from(bucket)
            .getPublicUrl(data.path);
        return { path: data.path, url: publicUrlData.publicUrl };
    } catch (error) {
        throw new Error(
            `Failed to upload file to ${bucket}/${path}: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
    try {
        const client = storage();
        const { error } = await client.storage.from(bucket).remove([path]);
        if (error) throw error;
    } catch (error) {
        throw new Error(
            `Failed to delete file ${bucket}/${path}: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}

export async function getPublicUrl(
    bucket: string,
    path: string,
): Promise<string> {
    try {
        const client = storage();
        const { data } = client.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    } catch (error) {
        throw new Error(
            `Failed to get public URL for ${bucket}/${path}: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}

export async function listFiles(
    bucket: string,
    path?: string,
): Promise<FileObject[]> {
    try {
        const client = storage();
        const { data, error } = await client.storage.from(bucket).list(path, {
            limit: 100,
            offset: 0,
            sortBy: { column: "name", order: "asc" },
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        throw new Error(
            `Failed to list files in ${bucket}/${path || ""}: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}

// ---------------------------------------------------------------------------
// Legacy helpers (kept for backward compatibility)
// ---------------------------------------------------------------------------

export async function uploadToSupabaseStorage(
    file: File | Blob,
    bucket = "user-uploads",
    path?: string,
): Promise<string> {
    const fileName = path || `${Date.now()}-${(file as File).name || "file"}`;
    const result = await uploadFile(bucket, fileName, file);
    return result.url;
}

export async function getSignedUrl(
    bucket: string,
    path: string,
    expiresInSeconds = 3600,
): Promise<string> {
    try {
        const client = storage();
        const { data, error } = await client.storage
            .from(bucket)
            .createSignedUrl(path, expiresInSeconds);

        if (error) throw error;
        return data.signedUrl;
    } catch (error) {
        throw new Error(
            `Failed to create signed URL for ${bucket}/${path}: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}

export async function deleteFromStorage(
    bucket: string,
    path: string,
): Promise<void> {
    await deleteFile(bucket, path);
}

export const uploadVideo = (file: File | Blob, path?: string) =>
    uploadToSupabaseStorage(file, "user-uploads", path);

export const uploadAiAsset = (file: File | Blob, path?: string) =>
    uploadToSupabaseStorage(file, "ai-generated", path);
