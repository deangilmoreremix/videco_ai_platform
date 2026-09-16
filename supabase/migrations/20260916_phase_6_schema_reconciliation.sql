-- ============================================================================
-- Migration: 20260916_phase_6_schema_reconciliation
-- Purpose: Reconcile live schema with current application code per Phase 6 contract
-- ============================================================================
-- This migration adds columns that are actively used by the application but
-- missing from the live database. All operations are additive and idempotent.
-- ============================================================================

-- ============================================================================
-- videos: Add missing columns required by current code
-- ============================================================================

alter table public.videos add column if not exists campaign_name text;
alter table public.videos add column if not exists preview text;
alter table public.videos add column if not exists embed_code text;
alter table public.videos add column if not exists elements jsonb default '[]'::jsonb;
alter table public.videos add column if not exists password_protection boolean default false;
alter table public.videos add column if not exists meta_data jsonb default '{}'::jsonb;
alter table public.videos add column if not exists "endCTAlink" text;
alter table public.videos add column if not exists "endCTAtitle" text;
alter table public.videos add column if not exists "endCTAtext" text;
alter table public.videos add column if not exists brand jsonb default '{}'::jsonb;
alter table public.videos add column if not exists secondary_link text;
alter table public.videos add column if not exists "desc" text;
alter table public.videos add column if not exists primary_link text;
alter table public.videos add column if not exists primary_text text;
alter table public.videos add column if not exists secondary_text text;
alter table public.videos add column if not exists platform text;
alter table public.videos add column if not exists name text;

-- Index for campaign filtering
create index if not exists idx_videos_type on public.videos (type);

-- ============================================================================
-- plan: Add missing columns required by current code
-- ============================================================================

alter table public.plan add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.plan add column if not exists credits numeric default 0;
alter table public.plan add column if not exists seat_limit int;
alter table public.plan add column if not exists last_reset_date text;
create index if not exists idx_plan_user on public.plan (user_id);

-- ============================================================================
-- RLS policies for new columns (existing policies already cover these tables)
-- ============================================================================
-- No table-level RLS changes required; existing policies on videos and plan
-- already protect rows by user_id / auth.uid().
