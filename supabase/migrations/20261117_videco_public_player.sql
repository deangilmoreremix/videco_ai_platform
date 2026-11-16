-- =============================================================================
-- Videco: public video player, schema fixes, storage/leads lockdown
--
-- SHARED PROJECT: touches only Videco objects (videos, ai_videos, analytics,
-- leads, the videco-videos bucket). Apply on its own; do not `db push`.
-- Idempotent.
-- =============================================================================

-- 1. Columns the player/editor use ---------------------------------------------
alter table public.videos add column if not exists remove_logo boolean default false;

-- The editor stores the password text here (upstream: text). It was boolean,
-- so saving player settings with a password failed with a type error.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'videos'
      and column_name = 'password_protection' and data_type = 'boolean'
  ) then
    alter table public.videos
      alter column password_protection type text
      using case when password_protection then null else null end;
  end if;
end $$;

-- 2. Public player RPCs ------------------------------------------------------------
-- Viewers are anonymous, but RLS on videos/ai_videos/analytics only allows the
-- owner. Instead of opening the tables (upstream let anyone read AND update
-- every video), expose exactly what the player needs, one id at a time.

create or replace function public.videco_public_video(p_id uuid, p_password text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.videos;
  has_password boolean;
begin
  select * into v from public.videos
  where id = p_id and coalesce(status, '') <> 'deleted';
  if not found then
    return null;
  end if;

  has_password := coalesce(nullif(v.password_protection, ''), 'false') <> 'false';
  if has_password and p_password is distinct from v.password_protection then
    -- Never send the password to the browser; only enough to show the gate.
    return jsonb_build_object(
      'locked', true,
      'wrong_password', p_password is not null,
      'name', v.name,
      'preview', v.preview
    );
  end if;

  return jsonb_build_object(
    'locked', false,
    'id', v.id,
    'url', v.url,
    'name', v.name,
    'desc', v."desc",
    'elements', v.elements,
    'brand', v.brand,
    'remove_logo', v.remove_logo,
    'endCTAlink', v."endCTAlink",
    'endCTAtitle', v."endCTAtitle",
    'endCTAtext', v."endCTAtext",
    'preview', v.preview,
    'primary_link', v.primary_link,
    'primary_text', v.primary_text,
    'secondary_text', v.secondary_text,
    'secondary_link', v.secondary_link,
    'platform', v.platform,
    'user_id', v.user_id,
    -- Owner's brand colours (brand_kit is owner-only under RLS).
    'brand_kit', (
      select jsonb_build_object(
        'primary_color', b.primary_color,
        'secondary_color', b.secondary_color,
        'primary_text_color', b.primary_text_color,
        'secondary_text_color', b.secondary_text_color
      )
      from public.brand_kit b
      where b.user_id = v.user_id
      order by b.updated_at desc nulls last
      limit 1
    )
  );
end;
$$;

-- Personalised campaign video for one lead: by ai_videos.id, or by the lead's
-- email (links built by src/utils/getEmailEmbedCode.ts carry ai_email).
create or replace function public.videco_public_ai_video(
  p_video_id uuid,
  p_ai_id bigint default null,
  p_email text default null
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.url
  from public.ai_videos a
  where a.og_video_id = p_video_id::text
    and (
      (p_ai_id is not null and a.id = p_ai_id)
      or (p_ai_id is null and p_email is not null
          and lower(a.contact ->> 'email') = lower(p_email))
    )
  order by a.created_at desc
  limit 1;
$$;

-- View / play / click tracking. Returns the analytics row id, which the
-- player keeps per video so repeat events update one row (as upstream did).
-- Events are whitelisted and attributed to the video's owner so the owner's
-- dashboards (RLS: user_id = auth.uid()) can read them.
create or replace function public.videco_track_event(
  p_video_id uuid,
  p_event text,
  p_row_id uuid default null,
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_tenant uuid;
  v_id uuid;
  v_data jsonb;
begin
  if p_event not in ('view', 'video_play', 'page_view', 'link_click') then
    raise exception 'unsupported event %', p_event;
  end if;

  select user_id, tenant_id into v_owner, v_tenant
  from public.videos where id = p_video_id;
  if not found then
    return null;
  end if;

  -- Keep only the fields the dashboards read, with bounded sizes.
  v_data := jsonb_strip_nulls(jsonb_build_object(
    'user_agent', left(p_data ->> 'user_agent', 500),
    'count', least(coalesce((p_data ->> 'count')::int, 1), 1000000),
    'name', left(p_data ->> 'name', 300),
    'lead', left(p_data ->> 'lead', 320)
  ));

  if p_row_id is not null then
    update public.analytics
      set data = v_data
      where id = p_row_id and video_id = p_video_id and event = p_event
      returning id into v_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.analytics (video_id, user_id, tenant_id, event, data)
  values (p_video_id, v_owner, v_tenant, p_event, v_data)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.videco_public_video(uuid, text) from public;
revoke all on function public.videco_public_ai_video(uuid, bigint, text) from public;
revoke all on function public.videco_track_event(uuid, text, uuid, jsonb) from public;
grant execute on function public.videco_public_video(uuid, text) to anon, authenticated;
grant execute on function public.videco_public_ai_video(uuid, bigint, text) to anon, authenticated;
grant execute on function public.videco_track_event(uuid, text, uuid, jsonb) to anon, authenticated;

-- 3. leads: drop the anonymous read/write-everything policy --------------------
-- Viewer leads are inserted by the api Edge Function (service role); owners
-- keep their own rows through videco_leads_own.
drop policy if exists "Allow anon full access to leads" on public.leads;

-- 4. videco-videos bucket: anyone could upload to and DELETE any file --------
-- Uploads now go to <user id>/... ; reads stay public (players need them).
drop policy if exists "anyone upload videos" on storage.objects;
drop policy if exists "anyone delete video files" on storage.objects;

drop policy if exists "videco_videos_insert_own_folder" on storage.objects;
create policy "videco_videos_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'videco-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "videco_videos_delete_own_folder" on storage.objects;
create policy "videco_videos_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'videco-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
