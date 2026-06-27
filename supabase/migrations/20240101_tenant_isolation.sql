-- ============================================================================
-- Schema + Multi-tenant RLS
-- Stack: Supabase (Postgres, Storage, Edge Functions, Auth) + Muapi + OpenAI
-- ============================================================================

-- Tenants (workspaces / accounts)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles (Supabase auth.users 1-1)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Videos
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  url text,
  type text,                          -- text-to-video | image-to-video
  source text default 'muapi',
  job_id uuid,
  prompt text,
  duration_seconds int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Images
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  url text not null,
  prompt text,
  source text default 'muapi',
  job_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Jobs (track Muapi generations)
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type text not null,                  -- text-to-video | image-to-video | text-to-image | ai-script
  provider text default 'muapi',
  model text,
  request_id text,                     -- Muapi request_id for polling
  status text not null default 'processing', -- queued | processing | completed | failed
  input jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Scripts (OpenAI generations)
create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  prompt text not null,
  output text,
  model text default 'gpt-4o-mini',
  created_at timestamptz not null default now()
);

-- Leads (form submissions on player pages)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  phone text,
  message text,
  data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Submissions (form submissions)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Feedback
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  video_id uuid references public.videos(id) on delete cascade,
  question text,
  answer text,
  session_id text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_videos_tenant on public.videos (tenant_id);
create index if not exists idx_videos_user on public.videos (user_id);
create index if not exists idx_images_tenant on public.images (tenant_id);
create index if not exists idx_jobs_tenant on public.jobs (tenant_id);
create index if not exists idx_jobs_status on public.jobs (status);
create index if not exists idx_jobs_request_id on public.jobs (request_id);
create index if not exists idx_scripts_tenant on public.scripts (tenant_id);
create index if not exists idx_leads_tenant on public.leads (tenant_id);
create index if not exists idx_submissions_tenant on public.submissions (tenant_id);
create index if not exists idx_feedback_tenant on public.feedback (tenant_id);
create index if not exists idx_profiles_tenant on public.profiles (tenant_id);

-- ============================================================================
-- Row Level Security: tenant_id based isolation
-- ============================================================================
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.images enable row level security;
alter table public.jobs enable row level security;
alter table public.scripts enable row level security;
alter table public.leads enable row level security;
alter table public.submissions enable row level security;
alter table public.feedback enable row level security;

-- Helper function: get current user's tenant_id from JWT
create or replace function public.current_tenant_id()
returns uuid
language sql stable
as $$
  select (auth.jwt() ->> 'tenant_id')::uuid
$$;

-- Tenants: members can read their own tenant
drop policy if exists "tenant_read_own" on public.tenants;
create policy "tenant_read_own" on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id());

-- Profiles
drop policy if exists "tenant_isolation_profiles" on public.profiles;
create policy "tenant_isolation_profiles" on public.profiles
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Videos
drop policy if exists "tenant_isolation_videos" on public.videos;
create policy "tenant_isolation_videos" on public.videos
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Images
drop policy if exists "tenant_isolation_images" on public.images;
create policy "tenant_isolation_images" on public.images
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Jobs
drop policy if exists "tenant_isolation_jobs" on public.jobs;
create policy "tenant_isolation_jobs" on public.jobs
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Scripts
drop policy if exists "tenant_isolation_scripts" on public.scripts;
create policy "tenant_isolation_scripts" on public.scripts
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Leads
drop policy if exists "tenant_isolation_leads" on public.leads;
create policy "tenant_isolation_leads" on public.leads
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Submissions
drop policy if exists "tenant_isolation_submissions" on public.submissions;
create policy "tenant_isolation_submissions" on public.submissions
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Feedback
drop policy if exists "tenant_isolation_feedback" on public.feedback;
create policy "tenant_isolation_feedback" on public.feedback
  for all to authenticated
  using (tenant_id = public.current_tenant_id() or tenant_id is null)
  with check (tenant_id = public.current_tenant_id() or tenant_id is null);

-- ============================================================================
-- Supabase Storage buckets (created via Supabase dashboard or storage API)
-- ============================================================================
-- Required buckets (run via Dashboard or `supabase storage`):
--   - uploads (public read, authenticated write)
--   - videos (public read, authenticated write)
--   - thumbnails (public read, authenticated write)