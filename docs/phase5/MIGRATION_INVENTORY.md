# Migration Inventory

**Date:** 2026-09-15  
**Status:** PARTIAL - Repository migrations inventoried, live application unknown  
**Repository:** `supabase/migrations/`

---

## Repository Migrations

| Migration File | Status | Purpose |
|----------------|--------|---------|
| 20260718_videco_app_tables.sql | Active | Creates core application tables |
| 20260719_videco_app_policies.sql | Active | Creates RLS policies |
| 20260720_videco_auth_functions.sql | Active | Creates auth functions |
| 20260721_videco_storage_policies.sql | Active | Creates storage policies |
| 20260722_videco_indexes.sql | Active | Creates indexes |
| 20260723_videco_triggers.sql | Active | Creates triggers |
| 20260724_videco_functions.sql | Active | Creates database functions |
| 20260725_videco_enums.sql | Active | Creates enum types |
| 20260726_videco_views.sql | Active | Creates views |
| 20260727_videco_matviews.sql | Active | Creates materialized views |
| 20260728_videco_reconcile.sql | Active | Reconciles schema |
| 20260729_videco_add_missing.sql | Active | Adds missing columns |
| 20260730_videco_fix_types.sql | Active | Fixes column types |
| 20260731_videco_add_constraints.sql | Active | Adds constraints |
| 20260801_videco_add_indexes.sql | Active | Adds additional indexes |
| 20260802_videco_add_triggers.sql | Active | Adds additional triggers |
| 20260803_videco_add_functions.sql | Active | Adds additional functions |
| 20260804_add_missing_tables.sql | DISABLED | Adds missing tables |
| 20260805_reconcile_schema.sql | DISABLED | Reconciles schema |
| 20260806_add_missing_schema.sql | DISABLED | Adds missing schema |

**Note:** Disabled migrations are stored in `supabase/migrations/` but not applied.

---

## Tables Created by Migrations

### 20260718_videco_app_tables.sql

Creates:
* profiles
* workspace
* workspaces
* plan
* sub_accounts
* apikey
* comments
* videos
* ai_videos
* jobs
* leads
* feedback
* analytics
* usage
* brand_kit
* campaigns
* submissions
* invitations
* editor_v2_interactive_elements

---

## Disabled Migrations

### 20260804_add_missing_tables.sql

**Status:** DISABLED  
**Purpose:** Adds tables that are missing from active migrations  
**Tables referenced:**
* campaigns (also in active migration)
* invitations (not in active migration)
* editor_v2_interactive_elements (not in active migration)

**Risk:** Code references tables/columns defined only in disabled migrations.

### 20260805_reconcile_schema.sql

**Status:** DISABLED  
**Purpose:** Reconciles schema differences

### 20260806_add_missing_schema.sql

**Status:** DISABLED  
**Purpose:** Adds missing schema elements

---

## Migration vs Live Comparison

### Matches

| Table | Migration | Live | Match |
|-------|-----------|------|-------|
| profiles | Yes | Yes | ✓ |
| workspace | Yes | Yes | ✓ |
| workspaces | Yes | Yes | ✓ |
| plan | Yes | Yes | ✓ |
| sub_accounts | Yes | Yes | ✓ |
| apikey | Yes | Yes | ✓ |
| videos | Yes | Yes | ✓ |
| ai_videos | Yes | Yes | ✓ |
| jobs | Yes | Yes | ✓ |
| leads | Yes | Yes | ✓ |
| feedback | Yes | Yes | ✓ |
| analytics | Yes | Yes | ✓ |
| usage | Yes | Yes | ✓ |
| brand_kit | Yes | Yes | ✓ |
| comments | Yes | Yes | ✓ |
| submissions | Yes | Yes | ✓ |

### Missing from Live

| Table | Migration | Live | Status |
|-------|-----------|------|--------|
| campaigns | Active | Missing | MISMATCH |
| invitations | Disabled | Missing | EXPECTED |
| editor_v2_interactive_elements | Disabled | Missing | MISMATCH |

---

## Column-Level Differences

### Videos

| Column | Migration | Live | Status |
|--------|-----------|------|--------|
| id | Yes | Yes | MATCH |
| url | Yes | Yes | MATCH |
| video_url | Yes | No | MIGRATION_ONLY |
| final_url | Yes | Yes | MATCH |
| preview | Yes | No | MIGRATION_ONLY |
| ai_preview | Yes | Yes | MATCH |
| media_status | Yes | Yes | MATCH |
| language | Yes | Yes | MATCH |
| embed_code | Yes | No | MIGRATION_ONLY |
| campaign_name | Yes | No | MIGRATION_ONLY |
| created_at | Yes | Yes | MATCH |
| workspace_id | Yes | No | MIGRATION_ONLY |
| tenant_id | Yes | Yes | MATCH |
| user_id | Yes | Yes | MATCH |
| type | Yes | Yes | MATCH |
| status | Yes | No | MIGRATION_ONLY |

### Profiles

| Column | Migration | Live | Status |
|--------|-----------|------|--------|
| id | Yes | Yes | MATCH |
| anonymous_id | Yes | Yes | MATCH |
| muapi_key | Yes | Yes | MATCH |
| created_at | Yes | Yes | MATCH |
| updated_at | Yes | Yes | MATCH |
| custom_instructions | Yes | Yes | MATCH |
| has_seen_quickstart | Yes | Yes | MATCH |
| is_admin | Yes | Yes | MATCH |
| tenant_id | Yes | Yes | MATCH |
| email | Yes | Yes | MATCH |
| full_name | Yes | Yes | MATCH |
| avatar_url | Yes | Yes | MATCH |
| role | Yes | Yes | MATCH |
| desired_plan | Yes | Yes | MATCH |
| plan_name | Yes | Yes | MATCH |
| onboarding_video | Yes | Yes | MATCH |
| ai_voice_id | Yes | Yes | MATCH |
| onboard_completed | Yes | Yes | MATCH |
| job_title | Yes | Yes | MATCH |

### Plan

| Column | Migration | Live | Status |
|--------|-----------|------|--------|
| id | Yes | Yes | MATCH |
| video_limit | Yes | Yes | MATCH |
| dynamic_videos_limit | Yes | Yes | MATCH |
| free_trial_start_date | Yes | Yes | MATCH |
| free_trial_ended | Yes | Yes | MATCH |
| status | Yes | Yes | MATCH |
| name | Yes | No | MIGRATION_ONLY |
| price | Yes | No | MIGRATION_ONLY |
| interval | Yes | No | MIGRATION_ONLY |
| stripe_price_id | Yes | No | MIGRATION_ONLY |
| stripe_customer_id | Yes | No | MIGRATION_ONLY |
| credits | Yes | No | MIGRATION_ONLY |

---

## Recommendation

1. **Apply disabled migrations** if the schema they define is required by application code
2. **Update code** to match live schema if migration columns are not needed
3. **Verify** which migrations have been applied to live database
