-- Tenant isolation baseline
-- Assumes tables: videos, assets, leads, apikey, etc.

alter table if exists public.videos add column if not exists tenant_id uuid;
alter table if exists public.assets add column if not exists tenant_id uuid;
alter table if exists public.leads add column if not exists tenant_id uuid;
alter table if exists public.apikey add column if not exists tenant_id uuid;

create index if not exists idx_videos_tenant on public.videos (tenant_id);
create index if not exists idx_assets_tenant on public.assets (tenant_id);
create index if not exists idx_leads_tenant on public.leads (tenant_id);

create policy "tenant_isolation_videos"
  on public.videos
  for all
  to authenticated
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy "tenant_isolation_assets"
  on public.assets
  for all
  to authenticated
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

create policy "tenant_isolation_leads"
  on public.leads
  for all
  to authenticated
  using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  with check (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
