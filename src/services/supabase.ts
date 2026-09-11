import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
}

// Singleton client for browser use.
// Reads ONLY public env vars (safe to expose).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
});

// Helper: call a Supabase Edge Function with the user's session token.
// The function URL is <project-url>/functions/v1/<name>
const FN_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

export async function callFunction<T = unknown>(
    name: string,
    body: Record<string, unknown> = {},
    method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
): Promise<T> {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(`${FN_BASE}/${name}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
                ? { Authorization: `Bearer ${session.access_token}` }
                : {}),
            ...(session?.user?.id
                ? {
                      "x-tenant-id": (session.user.app_metadata?.tenant_id ||
                          "") as string,
                  }
                : {}),
        },
        body: method === "GET" ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}
