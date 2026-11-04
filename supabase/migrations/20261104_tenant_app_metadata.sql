-- =============================================================================
-- Ensure every user has app_metadata.tenant_id
--
-- Why: the `api` Edge Function and the client resolve the tenant from
-- auth.users.raw_app_meta_data->>'tenant_id'. Signup only ever wrote it to
-- user_metadata (auth.updateUser({ data })), and only the RocketHub signup
-- created a tenant at all, so every video request failed with 401/400.
--
-- Also adds columns the generation code writes but the schema lacked.
-- Idempotent: safe to run more than once.
-- =============================================================================

-- Columns written by the generation pipeline -----------------------------------
alter table public.videos    add column if not exists preview text;
alter table public.ai_videos add column if not exists ai_preview text;

create index if not exists jobs_request_id_idx on public.jobs (request_id);

-- New users: provision a tenant before the auth row is written ---------------
create or replace function public.assign_tenant_to_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  if coalesce(new.raw_app_meta_data->>'tenant_id', '') = '' then
    -- Honour a tenant chosen at signup (user_metadata) if it exists.
    begin
      v_tenant := nullif(new.raw_user_meta_data->>'tenant_id', '')::uuid;
    exception when invalid_text_representation then
      v_tenant := null;
    end;

    if v_tenant is null or not exists (select 1 from public.tenants where id = v_tenant) then
      insert into public.tenants (name)
      values (coalesce(new.email, 'Default Tenant'))
      returning id into v_tenant;
    end if;

    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('tenant_id', v_tenant::text);
  end if;
  return new;
end;
$$;

drop trigger if exists assign_tenant_to_new_user on auth.users;
create trigger assign_tenant_to_new_user
  before insert on auth.users
  for each row execute function public.assign_tenant_to_new_user();

-- Existing users: backfill ------------------------------------------------------
do $$
declare
  r record;
  v_tenant uuid;
  has_profile_tenant boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'tenant_id'
  ) into has_profile_tenant;

  for r in
    select id, email, raw_user_meta_data
    from auth.users
    where coalesce(raw_app_meta_data->>'tenant_id', '') = ''
  loop
    v_tenant := null;

    -- 1. tenant previously stored in user_metadata
    begin
      v_tenant := nullif(r.raw_user_meta_data->>'tenant_id', '')::uuid;
    exception when invalid_text_representation then
      v_tenant := null;
    end;
    if v_tenant is not null and not exists (select 1 from public.tenants where id = v_tenant) then
      v_tenant := null;
    end if;

    -- 2. tenant on the profile row
    if v_tenant is null and has_profile_tenant then
      execute 'select p.tenant_id from public.profiles p
               join public.tenants t on t.id = p.tenant_id
               where p.id = $1'
        into v_tenant using r.id;
    end if;

    -- 3. create one
    if v_tenant is null then
      insert into public.tenants (name)
      values (coalesce(r.email, 'Default Tenant'))
      returning id into v_tenant;
    end if;

    update auth.users
    set raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', v_tenant::text)
    where id = r.id;

    if has_profile_tenant then
      execute 'update public.profiles set tenant_id = $1 where id = $2 and tenant_id is null'
        using v_tenant, r.id;
    end if;
  end loop;
end $$;
