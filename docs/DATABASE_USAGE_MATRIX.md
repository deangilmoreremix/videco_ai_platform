# VidecoAI Database Usage Matrix

**Date:** 2026-09-15  
**Branch:** stabilize/videco-completion-audit-2026-09-15  
**SHA:** fd20195b6a3de8e95f26f34012d01cc44afa4c24  
**Database:** Supabase PostgreSQL 15  

---

## Schema Source

The authoritative schema is defined in migration files under `supabase/migrations/`. There is no ORM; all queries use the Supabase JS client query builder.

### Active Migrations

| File | Purpose |
|------|---------|
| `supabase/migrations/20260718_videco_app_tables.sql` | Core tables, indexes, RLS, Realtime |
| `supabase/migrations/20260720_reconcile_schema.sql` | Column renames, missing tables |
| `supabase/migrations/20260804_add_missing_tables.sql` | Adds `analytics`, `workspace`, `plan`, `sub_accounts`, `apikey`, `comments` |

### Disabled Migrations

| File | Purpose |
|------|---------|
| `supabase/migrations/_disabled/20240101_tenant_isolation.sql` | Original multi-tenant schema |
| `supabase/migrations/_disabled/20260526_add_usage_table.sql` | Initial `usage` table |
| `supabase/migrations/_disabled/20260707_add_missing_schema.sql` | Adds `ai_videos`, `brand_kit`, extends `videos`/`profiles`/`usage` |
| `supabase/migrations/_disabled/20260710_add_usage_tracking.sql` | Additional usage tracking |

---

## Table Inventory

### 1. profiles

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users |
| email | text | |
| full_name | text | **MISMATCH:** Code/tasks reference `fullName`; migration uses `full_name` |
| onboard_completed | boolean | Added in disabled migration |
| created_at | timestamp | |
| updated_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `src/components/common/header/index.tsx`, `src/components/common/onboarding/welcome.tsx`, `pages/auth/rockethub-signup.tsx` | `netlify/functions/auth.ts`, `netlify/functions/api.ts`, `supabase/functions/auth/index.ts` | `20260718_videco_app_tables.sql` | `auth.uid()` | PARTIAL — column name mismatch likely |

### 2. workspace

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| image | text | |
| owner | uuid | References auth.users |
| tenant_id | uuid | Added in `20260804` |
| created_at | timestamp | |
| updated_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `src/components/common/sidebar/workspace.tsx`, `pages/auth/rockethub-signup.tsx` | `supabase/functions/api/index.ts` | `20260804_add_missing_tables.sql` | `auth.uid() = owner` | PARTIAL — depends on seed migration running |

### 3. videos

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| name | text | |
| type | text | |
| status | text | |
| media_status | text | |
| url | text | |
| preview | text | |
| final_url | text | Added in disabled migration |
| training_audio | text | Added in disabled migration |
| ai_preview | text | Added in disabled migration |
| language | text | Added in disabled migration |
| meta_data | jsonb | Renamed from `metadata` in `20260720` |
| created_at | timestamp | |
| updated_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/videos/index.tsx`, `pages/dashboard/index.tsx`, `pages/embed/player/[id].tsx`, `src/components/common/create/new.tsx` | `netlify/functions/videos.ts`, `netlify/functions/jobs.ts`, `netlify/functions/ai-orchestrator.ts`, `pages/api/v1/videos/*`, `supabase/functions/videos/index.ts` | `20260718_videco_app_tables.sql` + disabled `20260707` | `auth.uid() = user_id` | PARTIAL — `final_url`, `ai_preview`, `language`, `media_status` may be missing if disabled migration not applied |

### 4. ai_videos

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| video_id | uuid | References videos |
| status | text | |
| url | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/ai-videos/index.tsx`, `pages/campaign/steps/start.tsx`, `pages/embed/player/[id].tsx` | `netlify/functions/ai-orchestrator.ts`, `pages/api/v1/videos/poll.ts`, `src/services/aiClone.ts`, `supabase/functions/ai-orchestrator/index.ts` | `20260707_add_missing_schema.sql` (disabled) | `auth.uid() = user_id` | PARTIAL — table may not exist in live DB |

### 5. jobs

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| status | text | |
| job_details | jsonb | |
| created_at | timestamp | |
| updated_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| — | `netlify/functions/jobs.ts`, `netlify/functions/ai-orchestrator.ts`, `pages/api/v1/videos/clone.ts`, `pages/api/v1/videos/process.ts`, `pages/api/v1/videos/poll.ts`, `src/services/aiClone.ts`, `supabase/functions/jobs/index.ts` | `20260718_videco_app_tables.sql` | `auth.uid() = user_id` | PARTIAL |

### 6. leads

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| email | text | |
| name | text | |
| company | text | |
| status | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/leads/index.tsx`, `pages/campaign/steps/start.tsx` | `netlify/functions/leads.ts`, `pages/api/v1/leads/index.ts`, `pages/api/submissions/submit.ts`, `supabase/functions/leads/index.ts` | `20260718_videco_app_tables.sql` | `auth.uid() = user_id` | PARTIAL |

### 7. submissions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| video_id | uuid | References videos |
| form_data | jsonb | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| — | `pages/api/submissions/submit.ts`, `netlify/functions/api.ts`, `supabase/functions/api/index.ts` | `20260718_videco_app_tables.sql` | authenticated | PARTIAL |

### 8. feedback

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| video_id | uuid | References videos |
| rating | integer | |
| comment | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/feedback/index.tsx`, `pages/comments/index.tsx` | `pages/api/feedback/submit.ts`, `pages/api/mail/invite.ts`, `pages/api/mail/welcome.ts`, `netlify/functions/api.ts`, `supabase/functions/api/index.ts` | `20260718_videco_app_tables.sql` | authenticated | PARTIAL |

### 9. analytics

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| video_id | uuid | References videos |
| event | text | |
| data | jsonb | |
| user_agent | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/analytics/index.tsx`, `pages/embed/player/[id].tsx`, `pages/embed/[id].tsx` | `netlify/functions/api.ts`, `supabase/functions/api/index.ts` | `20260804_add_missing_tables.sql` | `auth.uid() = user_id or user_id is null` | PARTIAL — added in latest migration |

### 10. brand_kit

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| name | text | |
| colors | jsonb | |
| fonts | jsonb | |
| logos | jsonb | |
| created_at | timestamp | |
| updated_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/brand-kit/index.tsx`, `src/hooks/getBrandKit.ts` | — | `20260707_add_missing_schema.sql` (disabled) | `auth.uid() = user_id` | PARTIAL — table may not exist in live DB |

### 11. sub_accounts

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| main_account | text | |
| shared_account | text | |
| shared_account_user | uuid | References auth.users |
| name | text | |
| role | text | |
| workspace_id | uuid | References workspace |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/invite/index.tsx`, `src/hooks/useFetchTeamData.ts`, `pages/dashboard/index.tsx` | `pages/api/credits/deduct.ts`, `supabase/functions/api/index.ts` | `20260804_add_missing_tables.sql` | `auth.uid() = shared_account_user` | PARTIAL |

### 12. plan

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| plan_name | text | |
| stripe_id | text | |
| status | text | |
| free_trial_start_date | timestamp | |
| free_trial_ended | boolean | |
| video_limit | integer | |
| dynamic_videos_limit | integer | |
| created_at | timestamp | |
| updated_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `src/hooks/useUserPlan.ts`, `src/components/common/header/index.tsx`, `pages/auth/rockethub-signup.tsx` | `pages/api/credits/deduct.ts`, `supabase/functions/api/index.ts` | `20260804_add_missing_tables.sql` | `auth.uid() = user_id` | PARTIAL |

### 13. apikey

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| key | text | |
| name | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/settings/index.tsx` | `src/utils/apiAuth.ts`, `supabase/functions/api/index.ts` | `20260804_add_missing_tables.sql` | `auth.uid() = user_id` | PARTIAL |

### 14. usage

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| model | text | |
| provider | text | |
| action | text | |
| details | jsonb | Renamed from `meta` in `20260720` |
| cost_estimate | numeric | Renamed from `cost` in `20260720` |
| service | text | Added in disabled migration |
| tokens_in | integer | Added in disabled migration |
| tokens_out | integer | Added in disabled migration |
| video_id | uuid | Added in disabled migration |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| — | `pages/api/usage/log.ts`, `src/lib/usage.ts`, `src/lib/usageServer.ts` | `20260718_videco_app_tables.sql` + disabled migrations | `auth.uid() = user_id` | PARTIAL — column renames may not be applied |

### 15. comments

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| video_id | uuid | References videos |
| text | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/comments/index.tsx` | — | `20260804_add_missing_tables.sql` | `auth.uid() = user_id or user_id is null` | PARTIAL |

### 16. tenants

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/auth/rockethub-signup.tsx` | — | `20260718_videco_app_tables.sql` | `id = (select tenant_id from videos where user_id = auth.uid() limit 1)` | PARTIAL |

### 17. images

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| url | text | |
| prompt | text | |
| model | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| — | `netlify/functions/images.ts`, `supabase/functions/images/index.ts` | `20260718_videco_app_tables.sql` | `auth.uid() = user_id` | PARTIAL |

### 18. audios

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| url | text | |
| text | text | |
| voice | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| — | `netlify/functions/api.ts`, `supabase/functions/api/index.ts` | `20260718_videco_app_tables.sql` | `auth.uid() = user_id` | PARTIAL |

### 19. scripts

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| text | text | |
| model | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| — | `netlify/functions/api.ts`, `supabase/functions/api/index.ts` | `20260718_videco_app_tables.sql` | `auth.uid() = user_id` | PARTIAL |

### 20. storyboard_projects

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | References auth.users |
| tenant_id | uuid | Multi-tenant |
| name | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| — | `netlify/functions/api.ts`, `supabase/functions/api/index.ts` | `20260720_reconcile_schema.sql` | `auth.uid() = user_id` | PARTIAL |

### 21. storyboard_characters

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | References storyboard_projects |
| tenant_id | uuid | Multi-tenant |
| name | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| — | `netlify/functions/api.ts`, `supabase/functions/api/index.ts` | `20260720_reconcile_schema.sql` | tenant via join | PARTIAL |

### 22. storyboard_episodes

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | References storyboard_projects |
| tenant_id | uuid | Multi-tenant |
| name | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| — | `netlify/functions/api.ts`, `supabase/functions/api/index.ts` | `20260720_reconcile_schema.sql` | tenant via join | PARTIAL |

### 23. storyboard_shots

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| episode_id | uuid | References storyboard_episodes |
| tenant_id | uuid | Multi-tenant |
| name | text | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| — | `netlify/functions/api.ts`, `supabase/functions/api/index.ts` | `20260720_reconcile_schema.sql` | tenant via join | PARTIAL |

### 24. ltd_codes

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| code | text | |
| plan_id | uuid | |
| used | boolean | |
| created_at | timestamp | |

| Frontend Consumers | Backend Consumers | Migration | RLS Expectation | Status |
|--------------------|--------------------|-----------|-----------------|--------|
| `pages/auth/rockethub-signup.tsx` | — | `20260720_reconcile_schema.sql` | authenticated | PARTIAL |

---

## Schema Mismatches

| Issue | Location | Severity |
|-------|----------|----------|
| `profiles.full_name` vs `fullName` | `src/components/common/header/index.tsx`, `tasks/plan.md` | HIGH |
| `videos.final_url`, `ai_preview`, `language`, `media_status` may be missing | `pages/videos/index.tsx`, `src/services/aiClone.ts` | HIGH |
| `usage.details` vs `meta`, `cost_estimate` vs `cost` | `src/lib/log.ts`, `src/lib/usage.ts` | MEDIUM |
| `videos.metadata` renamed to `meta_data` | `src/services/aiClone.ts` (if references old name) | MEDIUM |
| `plan.free_trial_start_date`, `free_trial_ended` type assumptions | `src/components/common/header/index.tsx` | MEDIUM |
| `sub_accounts.shared_account_user` nullability | `src/hooks/useFetchTeamData.ts` | MEDIUM |
| `ai_videos` table may not exist in live DB | Multiple files | HIGH |
| `brand_kit` table may not exist in live DB | `pages/brand-kit/index.tsx` | MEDIUM |
| `analytics` table may not exist in live DB | `pages/analytics/index.tsx` | HIGH |
| `workspace` table may not exist in live DB | `src/components/common/sidebar/workspace.tsx` | HIGH |
| `apikey` table may not exist in live DB | `pages/settings/index.tsx` | MEDIUM |
| `comments` table may not exist in live DB | `pages/comments/index.tsx` | MEDIUM |

---

## RLS Policy Concerns

| Table | Policy Issue |
|-------|-------------|
| `tenants` | Policy uses subquery on `videos`; if user has no videos, they cannot read tenants |
| `sub_accounts` | Policy uses `shared_account_user = auth.uid()`; frontend queries by `main_account` which may not match |
| `analytics` | Policy allows `user_id is null`; could allow unauthorized reads |
| `workspace` | Policy uses `owner = auth.uid()`; workspace switching may fail if owner is not current user |
| `storyboard_*` | Tenant-based policies use joins; could be slow or fail if parent missing |

---

*End of database usage matrix.*
