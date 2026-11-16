/**
 * Server-only Stripe + Supabase helpers for the billing API routes.
 * Restores upstream Videco billing (pages/api/stripe/* @ d58efdb) with:
 *   - a service-role Supabase client (upstream used a browser client
 *     server-side, so its plan writes were blocked by RLS)
 *   - the caller identified from their Supabase access token, never
 *     from user ids in the request body
 *   - prices resolved on the server from plan + frequency
 */
import type { NextApiRequest } from "next";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import Stripe from "stripe";
import { PlanName, planUsage } from "src/utils/plans";

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    return _stripe;
}

let _admin: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
    const url =
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Supabase service role is not configured");
    }
    if (!_admin) {
        _admin = createClient(url, key, { auth: { persistSession: false } });
    }
    return _admin;
}

/** The signed-in user, from the `Authorization: Bearer <access token>` header. */
export async function getUserFromRequest(
    req: NextApiRequest,
): Promise<User | null> {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return null;
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error) return null;
    return data.user;
}

export type Frequency = "month" | "year";
export type PaidPlan = Extract<PlanName, "lite" | "growth" | "scale">;

/** Upstream env names: NEXT_PUBLIC_PLAN_<PLAN>_<MONTH|YEAR>. */
const PRICE_ENV: Record<PaidPlan, Record<Frequency, string | undefined>> = {
    lite: {
        month: process.env.NEXT_PUBLIC_PLAN_LITE_MONTH,
        year: process.env.NEXT_PUBLIC_PLAN_LITE_YEAR,
    },
    growth: {
        month: process.env.NEXT_PUBLIC_PLAN_GROWTH_MONTH,
        year: process.env.NEXT_PUBLIC_PLAN_GROWTH_YEAR,
    },
    scale: {
        month: process.env.NEXT_PUBLIC_PLAN_SCALE_MONTH,
        year: process.env.NEXT_PUBLIC_PLAN_SCALE_YEAR,
    },
};

export function priceForPlan(
    plan: string,
    frequency: string,
): string | undefined {
    const p = PRICE_ENV[plan as PaidPlan];
    if (!p) return undefined;
    return p[frequency === "year" ? "year" : "month"] || undefined;
}

/** Update the user's plan row, creating it if they have none. */
export async function savePlan(
    userId: string,
    fields: Record<string, unknown>,
): Promise<void> {
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
        .from("plan")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
    if (existing?.id) {
        const { error } = await admin
            .from("plan")
            .update({ ...fields, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        if (error) throw error;
    } else {
        const { error } = await admin
            .from("plan")
            .insert({ user_id: userId, ...fields });
        if (error) throw error;
    }
}

/** Plan columns for an active paid plan (limits from src/utils/plans). */
export function activePlanFields(planName: string) {
    const usage = planUsage(planName);
    return {
        plan_name: planName,
        status: "active",
        free_trial_ended: true,
        video_limit: usage.videos[1],
        dynamic_videos_limit: usage.dynamicVideos[1],
        seat_limit: usage.seat[1],
    };
}
