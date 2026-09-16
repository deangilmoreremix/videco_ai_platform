# Phase 6 Schema Reconciliation — Canonical Schema Contract

**Date:** 2026-09-15  
**Branch:** `fix/phase-6-schema-reconciliation`  
**Starting SHA:** `5d58aa171ca3e7bfc7b45cde7b7ebf5fc6643e02`  
**Status:** IN PROGRESS

---

## Executive Summary

This document establishes the **canonical database schema contract** for the VidecoAI platform based on:
1. Live database inspection (read-only)
2. Active application code analysis
3. Current migration review
4. Product functionality trace

**Key Principle:** The canonical schema must support the **CURRENT application** without creating unnecessary duplicate legacy fields.

---

## Disputed Tables Resolution

### 1. `campaigns` — REMOVE_DEAD_REFERENCES

| Question | Answer |
|----------|--------|
| Table exists live? | **NO** |
| Table exists in migrations? | **NO** — Documentation was incorrect |
| Code references table? | **NO** — Code uses `videos.type = "Personalized Campaign"` |
| Product functionality | **ACTIVE** — But implemented as video type, not separate table |
| **Resolution** | **REMOVE_DEAD_REFERENCES** from documentation |

**Evidence:**
- No migration file contains `CREATE TABLE campaigns`
- No code queries `from("campaigns")`
- Campaigns are implemented as `videos` where `type = "Personalized Campaign"`
- The `campaign_name` column IS referenced in code but missing from live DB

**Action Required:**
1. Remove all phantom `campaigns` table references from `docs/phase5/*.md`
2. Add missing `campaign_name` column to `videos` table via migration
3. Update TypeScript types to include `campaign_name`

---

### 2. `invitations` — REMOVE_DEAD_REFERENCES

| Question | Answer |
|----------|--------|
| Table exists live? | **NO** |
| Table exists in migrations? | **NO** |
| Code references table? | **NO** |
| Product functionality | **ACTIVE** — But uses `sub_accounts`, not `invitations` |
| **Resolution** | **REMOVE_DEAD_REFERENCES** from documentation |

**Evidence:**
- No migration file contains `CREATE TABLE invitations`
- No code queries `from("invitations")`
- Team invites are fully implemented via `sub_accounts` + Supabase Auth
- The `invitations` table references in docs are stale assumptions

**Action Required:**
1. Remove all phantom `invitations` table references from documentation
2. No database changes needed

---

### 3. `editor_v2_interactive_elements` — ADD_COLUMN

| Question | Answer |
|----------|--------|
| Table exists live? | **NO** |
| Table exists in migrations? | **NO** — Phase 5 documentation was incorrect |
| Code references table? | **NO** — Code uses `videos.elements` JSONB column |
| Product functionality | **BLOCKED** — Editor/player cannot persist/load elements |
| **Resolution** | **ADD_COLUMN** — Add `elements` JSONB to `videos` table |

**Evidence:**
- No migration file contains `CREATE TABLE editor_v2_interactive_elements`
- All editor/player code reads/writes `videos.elements`
- The `videos.elements` column does NOT exist in live DB
- Interactive elements are currently stored in Zustand state only (lost on refresh)

**Action Required:**
1. Add `elements jsonb` column to `videos` table via migration
2. Update TypeScript `InteractiveElementType` interface
3. Verify editor save/load flows work

**Why NOT create a separate table?**
- Current code design uses JSONB in `videos`
- No migration ever defined a separate table
- Creating a new table would require extensive code changes
- JSONB approach is simpler and matches current implementation

---

## Disputed Columns Resolution

### videos

| Column | Live | Migration | Code Uses | Classification | Resolution |
|--------|-----:|----------:|-----------|----------------|------------|
| `id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `url` | ✓ | ✓ | Yes | MATCH | KEPT |
| `video_url` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `final_url` | ✓ | ✓ | Yes | MATCH | KEPT |
| `preview` | ✗ | ✓ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `ai_preview` | ✓ | ✓ | Yes | MATCH | KEPT |
| `media_status` | ✓ | ✓ | Yes | MATCH | KEPT |
| `language` | ✓ | ✓ | Yes | MATCH | KEPT |
| `embed_code` | ✗ | ✓ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `campaign_name` | ✗ | ✓ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `created_at` | ✓ | ✓ | Yes | MATCH | KEPT |
| `workspace_id` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `tenant_id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `user_id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `type` | ✓ | ✓ | Yes | MATCH | KEPT |
| `status` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `elements` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `password_protection` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `meta_data` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `endCTAlink` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `endCTAtitle` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `endCTAtext` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `brand` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `secondary_link` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `desc` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `primary_link` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `primary_text` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `secondary_text` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `platform` | ✗ | ✗ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `name` | ✗ | ✓ | Yes | **ACTIVE** | **ADD_COLUMN** |

**Summary:**
- **KEPT**: 10 columns (id, url, final_url, ai_preview, media_status, language, created_at, tenant_id, user_id, type)
- **ADD_COLUMN**: 16 columns (preview, embed_code, campaign_name, elements, password_protection, meta_data, endCTAlink, endCTAtitle, endCTAtext, brand, secondary_link, desc, primary_link, primary_text, secondary_text, platform, name)
- **REMOVE_DEAD_LEGACY_REFERENCE**: 4 columns (video_url, workspace_id, status, and any others)

---

### plan

| Column | Live | Migration | Code Uses | Classification | Resolution |
|--------|-----:|----------:|-----------|----------------|------------|
| `id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `user_id` | ✗ | ✓ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `plan_name` | ✓ | ✓ | Yes | MATCH | KEPT |
| `video_limit` | ✓ | ✓ | Yes | MATCH | KEPT |
| `dynamic_videos_limit` | ✓ | ✓ | Yes | MATCH | KEPT |
| `free_trial_start_date` | ✓ | ✓ | Yes | MATCH | KEPT |
| `free_trial_ended` | ✓ | ✓ | Yes | MATCH | KEPT |
| `status` | ✓ | ✓ | Yes | MATCH | KEPT |
| `credits` | ✗ | ✓ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `seat_limit` | ✗ | ✓ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `last_reset_date` | ✗ | ✓ | Yes | **ACTIVE** | **ADD_COLUMN** |
| `name` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `price` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `interval` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `stripe_price_id` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `stripe_customer_id` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |

**Summary:**
- **KEPT**: 8 columns (id, plan_name, video_limit, dynamic_videos_limit, free_trial_start_date, free_trial_ended, status)
- **ADD_COLUMN**: 4 columns (user_id, credits, seat_limit, last_reset_date)
- **REMOVE_DEAD_LEGACY_REFERENCE**: 5 columns (name, price, interval, stripe_price_id, stripe_customer_id)

---

### feedback

| Column | Live | Migration | Code Uses | Classification | Resolution |
|--------|-----:|----------:|-----------|----------------|------------|
| `id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `user_id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `session_id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `video_id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `created_at` | ✓ | ✓ | Yes | MATCH | KEPT |
| `question` | ✓ | ✓ | Yes | MATCH | KEPT |
| `answer` | ✓ | ✓ | Yes | MATCH | KEPT |
| `name` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `email` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `company` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `passed` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |

**Summary:**
- **KEPT**: 7 columns
- **REMOVE_DEAD_LEGACY_REFERENCE**: 4 columns (name, email, company, passed)

---

### leads

| Column | Live | Migration | Code Uses | Classification | Resolution |
|--------|-----:|----------:|-----------|----------------|------------|
| `id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `name` | ✓ | ✓ | Yes | MATCH | KEPT |
| `email` | ✓ | ✓ | Yes | MATCH | KEPT |
| `user_id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `video_id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `created_at` | ✓ | ✓ | Yes | MATCH | KEPT |
| `session_id` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `campaign_id` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `status` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `company` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `passed` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |

**Summary:**
- **KEPT**: 6 columns
- **REMOVE_DEAD_LEGACY_REFERENCE**: 5 columns (session_id, campaign_id, status, company, passed)

---

### jobs

| Column | Live | Migration | Code Uses | Classification | Resolution |
|--------|-----:|----------:|-----------|----------------|------------|
| `id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `status` | ✓ | ✓ | Yes | MATCH | KEPT |
| `type` | ✓ | ✓ | Yes | MATCH | KEPT |
| `created_at` | ✓ | ✓ | Yes | MATCH | KEPT |
| `error` | ✓ | ✓ | Yes | MATCH | KEPT |
| `user_id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `updated_at` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `result` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `ai_video_id` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `video_id` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |

**Summary:**
- **KEPT**: 6 columns
- **REMOVE_DEAD_LEGACY_REFERENCE**: 4 columns (updated_at, result, ai_video_id, video_id)

**Note:** Active code previously inserted `job_details` into the `jobs` table, but this column does not exist. The canonical storage for job metadata is `jobs.input` (JSONB). All `job_details` references were mapped to `input`.

---

### ai_videos

| Column | Live | Migration | Code Uses | Classification | Resolution |
|--------|-----:|----------:|-----------|----------------|------------|
| `id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `status` | ✓ | ✓ | Yes | MATCH | KEPT |
| `url` | ✓ | ✓ | Yes | MATCH | KEPT |
| `preview` | ✓ | ✓ | Yes | MATCH | KEPT |
| `created_at` | ✓ | ✓ | Yes | MATCH | KEPT |
| `user_id` | ✓ | ✓ | Yes | MATCH | KEPT |
| `video_id` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |
| `job_id` | ✗ | ✓ | No | MIGRATION_ONLY | REMOVE_DEAD_LEGACY_REFERENCE |

**Summary:**
- **KEPT**: 6 columns
- **REMOVE_DEAD_LEGACY_REFERENCE**: 2 columns (video_id, job_id)

---

## Canonical Schema Changes Required

### New Migration: `20260804_videco_schema_reconciliation.sql`

```sql
-- ============================================================================
-- Migration: 20260804_videco_schema_reconciliation
-- Purpose: Reconcile live schema with current application code
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
alter table public.videos add column if not exists endCTAlink text;
alter table public.videos add column if not exists endCTAtitle text;
alter table public.videos add column if not exists endCTAtext text;
alter table public.videos add column if not exists brand jsonb default '{}'::jsonb;
alter table public.videos add column if not exists secondary_link text;
alter table public.videos add column if not exists desc text;
alter table public.videos add column if not exists primary_link text;
alter table public.videos add column if not exists primary_text text;
alter table public.videos add column if not exists secondary_text text;
alter table public.videos add column if not exists platform text;
alter table public.videos add column if not exists name text;

-- Index for campaign filtering
create index if not exists idx_videos_type on public.videos (type);

-- ============================================================================
-- plan: Add user_id foreign key
-- ============================================================================

alter table public.plan add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_plan_user on public.plan (user_id);

-- ============================================================================
-- RLS policies for new columns (no table-level changes needed)
-- ============================================================================
-- Existing RLS policies on videos and plan already cover these columns
```

---

## TypeScript Type Updates Required

### `src/store/editor.ts`

```typescript
export type InteractiveElementType = {
    id: string;
    name: string;
    url: string;
    type: string;
    butonPosition?: string;        // Keep for backward compat
    buttonPosition?: string;       // Add proper camelCase
    form_submit_text?: string;
    answers?: string | unknown[];
    answer_placeholder?: string;
    answer_type?: string;
    form_enable_name?: boolean;
    form_enable_email?: boolean;
    form_enable_message?: boolean;
    pos: string | number;
    time: number;
    endTime: number;
    link?: string;
    defaultPosition?: { x: number; y: number };
    user_id?: string;
};
```

### Video interfaces

Update all video TypeScript interfaces to include:
- `campaign_name?: string`
- `preview?: string`
- `embed_code?: string`
- `elements?: InteractiveElementType[]`
- `password_protection?: boolean`
- `meta_data?: Record<string, unknown>`
- `endCTAlink?: string`
- `endCTAtitle?: string`
- `endCTAtext?: string`
- `brand?: Record<string, unknown>`
- `secondary_link?: string`
- `desc?: string`
- `primary_link?: string`
- `primary_text?: string`
- `secondary_text?: string`
- `platform?: string`
- `name?: string`

---

## Next Steps

1. **Create migration file** `supabase/migrations/20260804_videco_schema_reconciliation.sql`
2. **Update TypeScript types** in `src/store/editor.ts` and video interfaces
3. **Remove dead legacy references** from code (video_url, workspace_id, status, etc.)
4. **Fix documentation** to remove phantom table references
5. **Validate** with `npx tsc --noEmit` and `npm run build`

---

## Important Notes

1. **No destructive changes** — All migrations use `ADD COLUMN IF NOT EXISTS`
2. **No data deletion** — Existing data preserved
3. **No duplicate fields** — Each column serves a distinct purpose
4. **No architecture changes** — All changes are additive reconciliations
5. **Live DB NOT modified** — This is documentation phase only
