# Phase 6 Migration Implementation

**Date:** 2026-09-16  
**Branch:** `fix/phase-6-schema-reconciliation`  
**Migration:** `supabase/migrations/20260916_phase_6_schema_reconciliation.sql`

---

## Overview

This migration reconciles the live database schema with the current application code by adding missing columns that are actively used but do not exist in the live database.

**Safety:** All operations are additive (`ADD COLUMN IF NOT EXISTS`) and use safe defaults. No destructive operations are performed.

---

## Tables Changed

| Table | Operation | Columns Added |
|-------|-----------|---------------|
| `videos` | `ADD COLUMN IF NOT EXISTS` | 16 columns |
| `plan` | `ADD COLUMN IF NOT EXISTS` | 1 column |

**Destructive operations:** `NONE`

---

## videos — New Columns

| Column | Type | Default | Nullable | Index | Reason |
|--------|------|---------|----------|-------|--------|
| `campaign_name` | `text` | `NULL` | YES | — | Campaign naming in clone/campaign flows |
| `preview` | `text` | `NULL` | YES | — | Thumbnail/preview URL for videos |
| `embed_code` | `text` | `NULL` | YES | — | Share/embed code storage |
| `elements` | `jsonb` | `'[]'::jsonb` | NO | — | Interactive elements persistence (editor/player) |
| `password_protection` | `boolean` | `false` | NO | — | Password protection flag |
| `meta_data` | `jsonb` | `'{}'::jsonb` | NO | — | Video metadata (already referenced in code) |
| `endCTAlink` | `text` | `NULL` | YES | — | End CTA link URL |
| `endCTAtitle` | `text` | `NULL` | YES | — | End CTA title |
| `endCTAtext` | `text` | `NULL` | YES | — | End CTA text |
| `brand` | `jsonb` | `'{}'::jsonb` | NO | — | Brand configuration |
| `secondary_link` | `text` | `NULL` | YES | — | Secondary link URL |
| `desc` | `text` | `NULL` | YES | — | Video description |
| `primary_link` | `text` | `NULL` | YES | — | Primary link URL |
| `primary_text` | `text` | `NULL` | YES | — | Primary link text |
| `secondary_text` | `text` | `NULL` | YES | — | Secondary link text |
| `platform` | `text` | `NULL` | YES | — | Platform identifier |
| `name` | `text` | `NULL` | YES | — | Video display name |

**Indexes added:**
- `idx_videos_type` on `videos(type)` — for campaign/video type filtering

---

## plan — New Columns

| Column | Type | Default | Nullable | Index | Reason |
|--------|------|---------|----------|-------|--------|
| `user_id` | `uuid` | `NULL` | YES | YES (`idx_plan_user`) | Foreign key to `auth.users(id)` for per-user plan lookup |

**Foreign key:** `plan.user_id` → `auth.users(id) ON DELETE CASCADE`

---

## Safety Verification

| Check | Result |
|-------|--------|
| Duplicate column names | Safe — `IF NOT EXISTS` guards all additions |
| Incompatible existing types | N/A — all new columns |
| Unsafe NOT NULL additions | None — all new columns are nullable or have safe defaults |
| Missing defaults | All JSONB/text/boolean columns have explicit defaults |
| Indexing errors | `IF NOT EXISTS` guards all indexes |
| Foreign-key problems | `user_id` references `auth.users(id)` which exists |
| Invalid JSONB defaults | Valid PostgreSQL JSONB literal syntax |
| Existing data compatibility | Additive only — no data modification |
| Unnecessary duplicate fields | Each column serves a distinct active code path |

---

## Execution Instructions

### Local Development

```bash
# Apply migration to local Supabase instance
supabase migration up
```

### Production

```bash
# Apply migration to production (requires explicit authorization)
supabase db push --linked
```

**Note:** This migration has NOT been applied to any database. It is ready for execution upon explicit authorization.

---

## Rollback

If rollback is required, execute:

```sql
-- Remove added columns (non-destructive to original data)
alter table public.videos drop column if exists campaign_name;
alter table public.videos drop column if exists preview;
alter table public.videos drop column if exists embed_code;
alter table public.videos drop column if exists elements;
alter table public.videos drop column if exists password_protection;
alter table public.videos drop column if exists meta_data;
alter table public.videos drop column if exists endCTAlink;
alter table public.videos drop column if exists endCTAtitle;
alter table public.videos drop column if exists endCTAtext;
alter table public.videos drop column if exists brand;
alter table public.videos drop column if exists secondary_link;
alter table public.videos drop column if exists desc;
alter table public.videos drop column if exists primary_link;
alter table public.videos drop column if exists primary_text;
alter table public.videos drop column if exists secondary_text;
alter table public.videos drop column if exists platform;
alter table public.videos drop column if exists name;

drop index if exists idx_videos_type;

alter table public.plan drop column if exists user_id;
drop index if exists idx_plan_user;
```

---

## Dependencies

This migration depends on:
- `public.videos` table (created in `20260718_videco_app_tables.sql`)
- `public.plan` table (created in `20260718_videco_app_tables.sql`)
- `auth.users` table (Supabase Auth)

No other Phase 6 changes are required for the migration itself.
