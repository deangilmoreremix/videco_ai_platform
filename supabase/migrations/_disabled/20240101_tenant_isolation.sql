-- ============================================================================
-- Videco schema + multi-tenant RLS
-- Stack: Supabase (Postgres/Storage/Edge/Auth) + Muapi + OpenAI
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
  desired_plan text,
  plan_name text,
  onboarding_video text,
  ai_voice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Videos (any Muapi video output: t2v, i2v, lip-sync, video-effects, face-swap, storyboard-asset)
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  url text,
  type text,                          -- text-to-video | image-to-video | lip-sync | video-effects | face-swap | storyboard-asset
  source text default 'muapi',
  model text,
  job_id uuid,
  prompt text,
  duration_seconds int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Images (any Muapi image output: t2i, image-edit, upscale, background-remover)
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  url text not null,
  source text default 'muapi',
  model text,
  job_id uuid,
  prompt text,
  kind text default 'generated',       -- generated | upload | edit
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Audios (Suno music + MMAudio + any Muapi audio)
create table if not exists public.audios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  url text not null,
  kind text not null,                  -- music | audio | sfx | foley | voiceover
  model text,
  job_id uuid,
  prompt text,
  duration_seconds int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Jobs (track all Muapi generations + persistence target)
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type text not null,                  -- text-to-video | image-to-video | text-to-image | image-edit | video-effects | lip-sync | upscale | background-remover | face-swap | music-create | music-remix | music-extend | audio-t2a | audio-v2v | storyboard-asset | ai-script
  provider text default 'muapi',
  model text,
  request_id text,                     -- Muapi request_id for polling
  status text not null default 'processing', -- queued | processing | completed | failed | cancelled
  input jsonb,
  output jsonb,
  error text,
  resource_type text,                  -- video | image | audio | music | storyboard (which table the output persists to)
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
  kind text default 'script',          -- script | ideas | caption | improved
  created_at timestamptz not null default now()
);

-- Storyboarding
create table if not exists public.storyboard_projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  brief text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storyboard_characters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.storyboard_projects(id) on delete cascade,
  name text not null,
  static_features text,                -- age, hair color, etc.
  dynamic_features text,               -- current outfit, mood
  reference_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.storyboard_episodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null references public.storyboard_projects(id) on delete cascade,
  episode_number int not null,
  title text,
  setting text,                        -- scene location, time of day
  mood text,
  created_at timestamptz not null default now()
);

create table if not exists public.storyboard_shots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  episode_id uuid not null references public.storyboard_episodes(id) on delete cascade,
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

-- Leads / Submissions / Feedback
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

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

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

-- ============================================================================
-- Indexes
-- ============================================================================
create index if not exists idx_videos_tenant on public.videos (tenant_id);
create index if not exists idx_videos_user on public.videos (user_id);
create index if not exists idx_videos_type on public.videos (type);
create index if not exists idx_images_tenant on public.images (tenant_id);
create index if not exists idx_images_user on public.images (user_id);
create index if not exists idx_audios_tenant on public.audios (tenant_id);
create index if not exists idx_audios_user on public.audios (user_id);
create index if not exists idx_audios_kind on public.audios (kind);
create index if not exists idx_jobs_tenant on public.jobs (tenant_id);
create index if not exists idx_jobs_user on public.jobs (user_id);
create index if not exists idx_jobs_status on public.jobs (status);
create index if not exists idx_jobs_type on public.jobs (type);
create index if not exists idx_jobs_request_id on public.jobs (request_id);
create index if not exists idx_scripts_tenant on public.scripts (tenant_id);
create index if not exists idx_leads_tenant on public.leads (tenant_id);
create index if not exists idx_submissions_tenant on public.submissions (tenant_id);
create index if not exists idx_feedback_tenant on public.feedback (tenant_id);
create index if not exists idx_profiles_tenant on public.profiles (tenant_id);
create index if not exists idx_storyboard_projects_tenant on public.storyboard_projects (tenant_id);
create index if not exists idx_storyboard_characters_project on public.storyboard_characters (project_id);
create index if not exists idx_storyboard_episodes_project on public.storyboard_episodes (project_id);
create index if not exists idx_storyboard_shots_episode on public.storyboard_shots (episode_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.images enable row level security;
alter table public.audios enable row level security;
alter table public.jobs enable row level security;
alter table public.scripts enable row level security;
alter table public.storyboard_projects enable row level security;
alter table public.storyboard_characters enable row level security;
alter table public.storyboard_episodes enable row level security;
alter table public.storyboard_shots enable row level security;
alter table public.leads enable row level security;
alter table public.submissions enable row level security;
alter table public.feedback enable row level security;

-- Helper function
create or replace function public.current_tenant_id()
returns uuid
language sql stable
as $$
  select (auth.jwt() ->> 'tenant_id')::uuid
$$;

-- Tenant read
drop policy if exists "tenant_read_own" on public.tenants;
create policy "tenant_read_own" on public.tenants
  for select to authenticated
  using (id = public.current_tenant_id());

-- Per-table policies (template applied uniformly)
drop policy if exists "tenant_isolation_profiles" on public.profiles;
create policy "tenant_isolation_profiles" on public.profiles
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_videos" on public.videos;
create policy "tenant_isolation_videos" on public.videos
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_images" on public.images;
create policy "tenant_isolation_images" on public.images
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_audios" on public.audios;
create policy "tenant_isolation_audios" on public.audios
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_jobs" on public.jobs;
create policy "tenant_isolation_jobs" on public.jobs
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_scripts" on public.scripts;
create policy "tenant_isolation_scripts" on public.scripts
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_leads" on public.leads;
create policy "tenant_isolation_leads" on public.leads
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_submissions" on public.submissions;
create policy "tenant_isolation_submissions" on public.submissions
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_feedback" on public.feedback;
create policy "tenant_isolation_feedback" on public.feedback
  for all to authenticated
  using (tenant_id = public.current_tenant_id() or tenant_id is null)
  with check (tenant_id = public.current_tenant_id() or tenant_id is null);

drop policy if exists "tenant_isolation_sb_projects" on public.storyboard_projects;
create policy "tenant_isolation_sb_projects" on public.storyboard_projects
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_sb_characters" on public.storyboard_characters;
create policy "tenant_isolation_sb_characters" on public.storyboard_characters
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_sb_episodes" on public.storyboard_episodes;
create policy "tenant_isolation_sb_episodes" on public.storyboard_episodes
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_isolation_sb_shots" on public.storyboard_shots;
create policy "tenant_isolation_sb_shots" on public.storyboard_shots
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- ============================================================================
-- Storage buckets (create via Supabase dashboard or `supabase storage`):
--   - uploads       (public read, authenticated write)
--   - videos        (public read, authenticated write)
--   - audios        (public read, authenticated write)
--   - images        (public read, authenticated write)
--   - thumbnails    (public read, authenticated write)
--   - seed-assets   (public read, seed marketing videos)
-- ============================================================================