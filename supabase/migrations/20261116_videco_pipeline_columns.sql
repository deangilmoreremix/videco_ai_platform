-- =============================================================================
-- Videco: columns used by the generation pipeline
--
-- SHARED PROJECT: this Supabase project hosts many apps (thousands of auth
-- users). This migration deliberately does NOT add triggers on auth.users or
-- touch other users' metadata. Videco tenants are provisioned lazily, per
-- Videco user, by getTenantFromRequest in supabase/functions/api/index.ts.
--
-- Apply this file on its own (Supabase apply_migration / SQL editor).
-- Do NOT `supabase db push`: the project's history does not contain the
-- other Videco migration files and other apps' migrations would conflict.
-- Idempotent.
-- =============================================================================

-- Upstream editor/list columns read by pages/videos/*
alter table public.videos    add column if not exists status text;
alter table public.videos    add column if not exists size numeric;
alter table public.videos    add column if not exists preview text;

-- Per-lead preview/request reference for campaign videos
alter table public.ai_videos add column if not exists ai_preview text;

-- Job lookups by Muapi request id (webhook + editor polling)
create index if not exists jobs_request_id_idx on public.jobs (request_id);
