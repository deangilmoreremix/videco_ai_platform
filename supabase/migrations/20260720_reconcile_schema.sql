-- ============================================================================
-- Migration: 20260720_reconcile_schema
-- ============================================================================
-- Reconciles the live database with what the application code actually
-- queries. The 20260718 migration used renamed columns
-- (metadata / meta / cost) and omitted several tables the app requires.
-- This migration makes the DB match the code (source of truth):
--   * videos.meta_data   (code reads/writes meta_data)
--   * usage.details      (code: details)
--   * usage.cost_estimate (code: cost_estimate)
--   * Adds missing tables: workspace, analytics, ltd_codes, apikey,
--     storyboard_projects, storyboard_characters, storyboard_episodes,
--     storyboard_shots.
-- All changes are idempotent (IF NOT EXISTS / guarded renames).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fix renamed columns on existing tables
-- ---------------------------------------------------------------------------

-- videos: metadata -> meta_data
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'metadata'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos' and column_name = 'meta_data'
  ) then
    alter table public.videos rename column metadata to meta_data;
  end if;
end $$;

-- usage: meta -> details
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usage' and column_name = 'meta'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usage' and column_name = 'details'
  ) then
    alter table public.usage rename column meta to details;
  end if;
end $$;

-- usage: cost -> cost_estimate
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usage' and column_name = 'cost'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usage' and column_name = 'cost_estimate'
  ) then
    alter table public.usage rename column cost to cost_estimate;
  end if;
end $$;

-- Ensure the code-expected columns exist even if the renames above did not run.
alter table public.videos add column if not exists meta_data jsonb default '{}'::jsonb;
alter table public.usage add column if not exists details jsonb;
alter table public.usage add column if not exists cost_estimate numeric;

-- ---------------------------------------------------------------------------
-- 2. Missing tables required by the app
-- ---------------------------------------------------------------------------

-- Workspaces (sidebar switcher, useWorkspaces, useFetchTeamData)
create table if not exists public.workspace (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) on delete cascade,
  name text,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Analytics (embed view tracking, useAnalytics)
create table if not exists public.analytics (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references public.videos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event text,
  anoyomous_id text,
  data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Lifetime-deal codes (rockethub signup)
create table if not exists public.ltd_codes (
  id uuid primary key default gen_random_uuid(),
  "Code" text,
  status text default '',
  plan_type text,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- API keys (settings page, apiAuth middleware)
create table if not exists public.apikey (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  key text,
  created_at timestamptz not null default now()
);

-- Storyboarding (Muapi-backed generation tracking)
create table if not exists public.storyboard_projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  brief text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storyboard_characters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  project_id uuid references public.storyboard_projects(id) on delete cascade,
  name text not null,
  static_features text,
  dynamic_features text,
  reference_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.storyboard_episodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  project_id uuid references public.storyboard_projects(id) on delete cascade,
  episode_number int not null,
  title text,
  setting text,
  mood text,
  created_at timestamptz not null default now()
);

create table if not exists public.storyboard_shots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  episode_id uuid references public.storyboard_episodes(id) on delete cascade,
  shot_index int not null,
  prompt text not null,
  model text,
  camera_angle text,
  shot_type text,
  job_id uuid references public.jobs(id) on delete set null,
  video_id uuid references public.videos(id) on delete set null,
  status text default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_workspace_owner on public.workspace (owner);
create index if not exists idx_analytics_video on public.analytics (video_id);
create index if not exists idx_analytics_anon on public.analytics (anoyomous_id);
create index if not exists idx_ltd_codes_code on public.ltd_codes ("Code");
create index if not exists idx_apikey_user on public.apikey (user_id);
create index if not exists idx_storyboard_projects_tenant on public.storyboard_projects (tenant_id);
create index if not exists idx_storyboard_characters_project on public.storyboard_characters (project_id);
create index if not exists idx_storyboard_episodes_project on public.storyboard_episodes (project_id);
create index if not exists idx_storyboard_shots_episode on public.storyboard_shots (episode_id);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security (aligned with how the code queries the data)
-- ---------------------------------------------------------------------------
alter table public.workspace enable row level security;
alter table public.analytics enable row level security;
alter table public.ltd_codes enable row level security;
alter table public.apikey enable row level security;
alter table public.storyboard_projects enable row level security;
alter table public.storyboard_characters enable row level security;
alter table public.storyboard_episodes enable row level security;
alter table public.storyboard_shots enable row level security;

-- workspace: owner-only
drop policy if exists "videco_workspace_owner" on public.workspace;
create policy "videco_workspace_owner" on public.workspace
  for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- analytics: owner or anonymous inserts
drop policy if exists "videco_analytics_all" on public.analytics;
create policy "videco_analytics_all" on public.analytics
  for all to authenticated
  using (user_id = auth.uid() or user_id is null) with check (true);

-- ltd_codes: readable by all authenticated (validated by code), writable by owner
drop policy if exists "videco_ltd_codes_auth" on public.ltd_codes;
create policy "videco_ltd_codes_auth" on public.ltd_codes
  for all to authenticated
  using (true) with check (true);

-- apikey: owner-only
drop policy if exists "videco_apikey_owner" on public.apikey;
create policy "videco_apikey_owner" on public.apikey
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- storyboard_* : per-user (and tenant) ownership
drop policy if exists "videco_storyboard_projects_own" on public.storyboard_projects;
create policy "videco_storyboard_projects_own" on public.storyboard_projects
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "videco_storyboard_characters_own" on public.storyboard_characters;
create policy "videco_storyboard_characters_own" on public.storyboard_characters
  for all to authenticated
  using (tenant_id = (select tenant_id from public.storyboard_projects where id = project_id limit 1))
  with check (true);

drop policy if exists "videco_storyboard_episodes_own" on public.storyboard_episodes;
create policy "videco_storyboard_episodes_own" on public.storyboard_episodes
  for all to authenticated
  using (tenant_id = (select tenant_id from public.storyboard_projects where id = project_id limit 1))
  with check (true);

drop policy if exists "videco_storyboard_shots_own" on public.storyboard_shots;
create policy "videco_storyboard_shots_own" on public.storyboard_shots
  for all to authenticated
  using (tenant_id = (select tenant_id from public.storyboard_episodes where id = episode_id limit 1))
  with check (true);

-- ---------------------------------------------------------------------------
-- 5. Realtime (optional)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.workspace;
alter publication supabase_realtime add table public.analytics;
