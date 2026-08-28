-- ============================================================================
-- Migration: 20260804_add_missing_tables
-- Adds tables referenced in code but missing from the live database:
--   analytics, workspace, plan, sub_accounts, apikey, comments
-- ============================================================================

-- ============================================================================
-- analytics
-- Per-video analytics events (view, video_play, click, etc.)
-- ============================================================================

create table if not exists public.analytics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_video on public.analytics (video_id);
create index if not exists idx_analytics_user on public.analytics (user_id);
create index if not exists idx_analytics_event on public.analytics (event);

-- ============================================================================
-- workspace
-- User-visible workspace/account metadata
-- ============================================================================

create table if not exists public.workspace (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_tenant on public.workspace (tenant_id);
create index if not exists idx_workspace_owner on public.workspace (owner);

-- ============================================================================
-- plan
-- Per-user plan metadata for gating features
-- ============================================================================

create table if not exists public.plan (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_name text not null default 'free',
  stipe_id text,
  status text not null default 'active',
  free_trial_start_date timestamptz,
  free_trial_ended boolean not null default false,
  video_limit int,
  dynamic_videos_limit int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plan_user on public.plan (user_id);
create index if not exists idx_plan_tenant on public.plan (tenant_id);

-- ============================================================================
-- sub_accounts
-- Team member / shared account relationships for invites
-- ============================================================================

create table if not exists public.sub_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  main_account uuid not null references auth.users(id) on delete cascade,
  shared_account text not null,
  shared_account_user uuid references auth.users(id) on delete set null,
  name text,
  role text not null default 'member',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sub_accounts_main on public.sub_accounts (main_account);
create index if not exists idx_sub_accounts_shared on public.sub_accounts (shared_account);
create index if not exists idx_sub_accounts_tenant on public.sub_accounts (tenant_id);

-- ============================================================================
-- apikey
-- Per-user API keys
-- ============================================================================

create table if not exists public.apikey (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_apikey_user on public.apikey (user_id);
create index if not exists idx_apikey_tenant on public.apikey (tenant_id);

-- ============================================================================
-- comments
-- Comments tied to videos/players
-- ============================================================================

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comments_video on public.comments (video_id);
create index if not exists idx_comments_user on public.comments (user_id);
create index if not exists idx_comments_parent on public.comments (parent_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.analytics enable row level security;
alter table public.workspace enable row level security;
alter table public.plan enable row level security;
alter table public.sub_accounts enable row level security;
alter table public.apikey enable row level security;
alter table public.comments enable row level security;

-- analytics: users manage their own rows
drop policy if exists "analytics_own" on public.analytics;
create policy "analytics_own" on public.analytics
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- workspace: users read/write their own workspace
drop policy if exists "workspace_own" on public.workspace;
create policy "workspace_own" on public.workspace
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- plan: users manage their own plan row
drop policy if exists "plan_own" on public.plan;
create policy "plan_own" on public.plan
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- sub_accounts: users can see accounts tied to their main account
drop policy if exists "sub_accounts_own" on public.sub_accounts;
create policy "sub_accounts_own" on public.sub_accounts
  for all to authenticated
  using (main_account = auth.uid() or shared_account_user = auth.uid())
  with check (tenant_id is not null);

-- apikey: users manage their own keys
drop policy if exists "apikey_own" on public.apikey;
create policy "apikey_own" on public.apikey
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- comments: users manage their own comments
drop policy if exists "comments_own" on public.comments;
create policy "comments_own" on public.comments
  for all to authenticated
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

-- ============================================================================
-- Seed a default workspace for each existing user without one
-- ============================================================================

do $$
declare
  rec record;
begin
  for rec in select id from auth.users loop
    if not exists (
      select 1 from public.workspace where owner = rec.id
    ) then
      insert into public.workspace (tenant_id, owner, name, image)
      values (
        gen_random_uuid(),
        rec.id,
        'Default',
        '/default_icon.png'
      );
    end if;
  end loop;
end $$;
