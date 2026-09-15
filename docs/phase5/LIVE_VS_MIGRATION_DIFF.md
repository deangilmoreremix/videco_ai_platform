# Live vs Migration Diff

**Date:** 2026-09-15  
**Status:** PARTIAL - Based on column probing  
**Live Database:** VideoRemix Product  
**Active Migrations:** supabase/migrations/

---

## Summary

| Classification | Count | Description |
|----------------|------:|-------------|
| MATCH | 45 | Live and migration agree |
| MIGRATION_ONLY | 35 | Migration defines but live missing |
| LIVE_ONLY | 0 | Live has but migration missing |
| NAME_CONFLICT | 0 | Same field, different names |
| TYPE_CONFLICT | 0 | Same field, different types |
| NULLABILITY_CONFLICT | 0 | Different nullability |
| UNKNOWN | 15 | Cannot verify (types, constraints) |

---

## Detailed Diff

### videos

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| url | ✓ | ✓ | MATCH |
| video_url | ✗ | ✓ | MIGRATION_ONLY |
| final_url | ✓ | ✓ | MATCH |
| preview | ✗ | ✓ | MIGRATION_ONLY |
| ai_preview | ✓ | ✓ | MATCH |
| media_status | ✓ | ✓ | MATCH |
| language | ✓ | ✓ | MATCH |
| embed_code | ✗ | ✓ | MIGRATION_ONLY |
| campaign_name | ✗ | ✓ | MIGRATION_ONLY |
| created_at | ✓ | ✓ | MATCH |
| workspace_id | ✗ | ✓ | MIGRATION_ONLY |
| tenant_id | ✓ | ✓ | MATCH |
| user_id | ✓ | ✓ | MATCH |
| type | ✓ | ✓ | MATCH |
| status | ✗ | ✓ | MIGRATION_ONLY |

### profiles

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| anonymous_id | ✓ | ✓ | MATCH |
| muapi_key | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| updated_at | ✓ | ✓ | MATCH |
| custom_instructions | ✓ | ✓ | MATCH |
| has_seen_quickstart | ✓ | ✓ | MATCH |
| is_admin | ✓ | ✓ | MATCH |
| tenant_id | ✓ | ✓ | MATCH |
| email | ✓ | ✓ | MATCH |
| full_name | ✓ | ✓ | MATCH |
| avatar_url | ✓ | ✓ | MATCH |
| role | ✓ | ✓ | MATCH |
| desired_plan | ✓ | ✓ | MATCH |
| plan_name | ✓ | ✓ | MATCH |
| onboarding_video | ✓ | ✓ | MATCH |
| ai_voice_id | ✓ | ✓ | MATCH |
| onboard_completed | ✓ | ✓ | MATCH |
| job_title | ✓ | ✓ | MATCH |

### workspace

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| tenant_id | ✓ | ✓ | MATCH |
| owner | ✓ | ✓ | MATCH |
| name | ✓ | ✓ | MATCH |
| image | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| updated_at | ✓ | ✓ | MATCH |

### workspaces

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| name | ✓ | ✓ | MATCH |
| slug | ✓ | ✓ | MATCH |
| settings | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| updated_at | ✓ | ✓ | MATCH |
| owner_id | ✓ | ✓ | MATCH |
| plan | ✓ | ✓ | MATCH |
| tenant_id | ✓ | ✓ | MATCH |

### plan

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| video_limit | ✓ | ✓ | MATCH |
| dynamic_videos_limit | ✓ | ✓ | MATCH |
| free_trial_start_date | ✓ | ✓ | MATCH |
| free_trial_ended | ✓ | ✓ | MATCH |
| status | ✓ | ✓ | MATCH |
| name | ✗ | ✓ | MIGRATION_ONLY |
| price | ✗ | ✓ | MIGRATION_ONLY |
| interval | ✗ | ✓ | MIGRATION_ONLY |
| stripe_price_id | ✗ | ✓ | MIGRATION_ONLY |
| stripe_customer_id | ✗ | ✓ | MIGRATION_ONLY |
| credits | ✗ | ✓ | MIGRATION_ONLY |

### sub_accounts

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| main_account | ✓ | ✓ | MATCH |
| shared_account | ✓ | ✓ | MATCH |
| name | ✓ | ✓ | MATCH |
| role | ✓ | ✓ | MATCH |
| shared_account_user | ✓ | ✓ | MATCH |
| workspace_id | ✓ | ✓ | MATCH |
| updated_at | ✗ | ✓ | MIGRATION_ONLY |

### apikey

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| key | ✓ | ✓ | MATCH |
| user_id | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| name | ✗ | ✓ | MIGRATION_ONLY |
| expires_at | ✗ | ✓ | MIGRATION_ONLY |
| last_used_at | ✗ | ✓ | MIGRATION_ONLY |

### jobs

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| status | ✓ | ✓ | MATCH |
| type | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| error | ✓ | ✓ | MATCH |
| user_id | ✓ | ✓ | MATCH |
| updated_at | ✗ | ✓ | MIGRATION_ONLY |
| result | ✗ | ✓ | MIGRATION_ONLY |
| ai_video_id | ✗ | ✓ | MIGRATION_ONLY |
| video_id | ✗ | ✓ | MIGRATION_ONLY |

### ai_videos

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| status | ✓ | ✓ | MATCH |
| url | ✓ | ✓ | MATCH |
| preview | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| user_id | ✓ | ✓ | MATCH |
| video_id | ✗ | ✓ | MIGRATION_ONLY |
| job_id | ✗ | ✓ | MIGRATION_ONLY |

### leads

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| name | ✓ | ✓ | MATCH |
| email | ✓ | ✓ | MATCH |
| user_id | ✓ | ✓ | MATCH |
| video_id | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| session_id | ✗ | ✓ | MIGRATION_ONLY |
| campaign_id | ✗ | ✓ | MIGRATION_ONLY |
| status | ✗ | ✓ | MIGRATION_ONLY |
| company | ✗ | ✓ | MIGRATION_ONLY |
| passed | ✗ | ✓ | MIGRATION_ONLY |

### feedback

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| user_id | ✓ | ✓ | MATCH |
| session_id | ✓ | ✓ | MATCH |
| video_id | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| question | ✓ | ✓ | MATCH |
| answer | ✓ | ✓ | MATCH |
| name | ✗ | ✓ | MIGRATION_ONLY |
| email | ✗ | ✓ | MIGRATION_ONLY |
| company | ✗ | ✓ | MIGRATION_ONLY |
| passed | ✗ | ✓ | MIGRATION_ONLY |

### analytics

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| video_id | ✓ | ✓ | MATCH |
| user_id | ✓ | ✓ | MATCH |
| tenant_id | ✓ | ✓ | MATCH |
| data | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| event | ✓ | ✓ | MATCH |
| event_type | ✗ | ✓ | MIGRATION_ONLY |
| properties | ✗ | ✓ | MIGRATION_ONLY |

### usage

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| user_id | ✓ | ✓ | MATCH |
| model | ✓ | ✓ | MATCH |
| provider | ✓ | ✓ | MATCH |
| action | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| video_id | ✓ | ✓ | MATCH |
| tenant_id | ✗ | ✓ | MIGRATION_ONLY |
| details | ✗ | ✓ | MIGRATION_ONLY |
| cost_estimate | ✗ | ✓ | MIGRATION_ONLY |
| job_id | ✗ | ✓ | MIGRATION_ONLY |

### brand_kit

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| user_id | ✓ | ✓ | MATCH |
| primary_color | ✓ | ✓ | MATCH |
| secondary_color | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| updated_at | ✓ | ✓ | MATCH |
| id | ✗ | ✓ | MIGRATION_ONLY |
| tenant_id | ✗ | ✓ | MIGRATION_ONLY |
| logo_url | ✗ | ✓ | MIGRATION_ONLY |
| font_family | ✗ | ✓ | MIGRATION_ONLY |
| company_name | ✗ | ✓ | MIGRATION_ONLY |
| website | ✗ | ✓ | MIGRATION_ONLY |

### comments

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| video_id | ✓ | ✓ | MATCH |
| user_id | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| content | ✓ | ✓ | MATCH |
| text | ✗ | ✓ | MIGRATION_ONLY |
| time | ✗ | ✓ | MIGRATION_ONLY |
| timestamp | ✗ | ✓ | MIGRATION_ONLY |

### submissions

| Column | Live | Migration | Classification |
|--------|-----:|----------:|----------------|
| id | ✓ | ✓ | MATCH |
| created_at | ✓ | ✓ | MATCH |
| user_id | ✗ | ✓ | MIGRATION_ONLY |
| session_id | ✗ | ✓ | MIGRATION_ONLY |
| data | ✗ | ✓ | MIGRATION_ONLY |
| form_data | ✗ | ✓ | MIGRATION_ONLY |
| answers | ✗ | ✓ | MIGRATION_ONLY |

---

## Missing Tables

| Table | Migration Status | Live Status | Classification |
|-------|-----------------|-------------|----------------|
| campaigns | Active | Missing | MIGRATION_NOT_APPLIED |
| invitations | Disabled | Missing | EXPECTED |
| editor_v2_interactive_elements | Disabled | Missing | MIGRATION_NOT_APPLIED |

---

## Recommendations

1. **Apply missing migrations** for `campaigns` and `editor_v2_interactive_elements` if required by code
2. **Update TypeScript types** to match live schema (MIGRATION_ONLY columns should not be in types)
3. **Verify** which disabled migrations should be enabled
4. **Do not add columns** to live database without migration
