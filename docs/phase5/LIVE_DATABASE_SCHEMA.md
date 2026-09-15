# Live Database Schema Audit

**Date:** 2026-09-15  
**Project:** VideoRemix Product (bzxohkrxcwodllketcpz)  
**Organization:** rcvtpghgokqvfiateraz  
**Region:** us-east-1  
**Database Version:** PostgreSQL 17.6.1.084  
**Inspected By:** Phase 5 Read-Only Audit

## Access Method

* Supabase REST API via service-role key
* Supabase Management API: project metadata only (no schema endpoints accessible)
* Direct PostgreSQL connection: not available
* Local Supabase CLI: available but Docker not installed, so local dev commands unavailable

## Limitations

* Cannot query `information_schema` or `pg_catalog` directly through REST API
* Cannot run raw SQL
* Cannot inspect constraints, indexes, or RLS policies directly
* Schema inference is based on column probing and code analysis

---

## Table Inventory

### Tables Confirmed Existing

| Table | Columns Confirmed | Empty? | Notes |
|-------|------------------|--------|-------|
| profiles | 19 | Unknown | Full column list verified |
| workspace | 7 | Unknown | Singular form |
| workspaces | 9 | Unknown | Plural form |
| plan | 6 | Unknown | Only `plan` exists, not `plans` |
| sub_accounts | 7 | Yes | Empty table |
| apikey | 4 | Yes | Empty table |
| videos | 10 | Yes | Empty table |
| ai_videos | 6 | Yes | Empty table |
| jobs | 6 | Yes | Empty table |
| leads | 6 | Yes | Empty table |
| feedback | 7 | Yes | Empty table |
| analytics | 7 | Yes | Empty table |
| usage | 7 | Yes | Empty table |
| brand_kit | 5 | Yes | Empty table |
| comments | 4 | Yes | Empty table |
| submissions | 2 | Yes | Empty table |

### Tables Confirmed Missing

| Table | Code References | Migration References |
|-------|----------------|---------------------|
| campaigns | Yes | Yes |
| invitations | Yes | No |
| editor_v2_interactive_elements | Yes | No |
| interactive_elements | No | No |
| editor_elements | No | No |
| video_elements | No | No |
| elements | No | No |
| player_elements | No | No |
| plans | Yes | Yes |
| user_plans | No | No |
| subscriptions | No | No |

---

## Column Definitions

### profiles

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| anonymous_id | uuid | Yes | |
| muapi_key | text | Yes | |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |
| custom_instructions | text | Yes | |
| has_seen_quickstart | boolean | Yes | |
| is_admin | boolean | Yes | |
| tenant_id | uuid | Yes | |
| email | text | Yes | |
| full_name | text | Yes | |
| avatar_url | text | Yes | |
| role | text | Yes | |
| desired_plan | text | Yes | |
| plan_name | text | Yes | |
| onboarding_video | text | Yes | |
| ai_voice_id | text | Yes | |
| onboard_completed | boolean | Yes | |
| job_title | text | Yes | |

### workspace (singular)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| tenant_id | uuid | Yes | |
| owner | uuid | Yes | |
| name | text | Yes | |
| image | text | Yes | |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

### workspaces (plural)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| name | text | Yes | |
| slug | text | Yes | |
| settings | jsonb | Yes | |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |
| owner_id | uuid | Yes | |
| plan | text | Yes | |
| tenant_id | uuid | Yes | |

### plan

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| video_limit | integer | Yes | |
| dynamic_videos_limit | integer | Yes | |
| free_trial_start_date | timestamp | Yes | |
| free_trial_ended | boolean | Yes | |
| status | text | Yes | |

**Missing columns (expected by code but not found):**
- name
- price
- interval
- stripe_price_id
- stripe_customer_id
- credits

### sub_accounts

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| main_account | uuid | Yes | |
| shared_account | uuid | Yes | |
| name | text | Yes | |
| role | text | Yes | |
| shared_account_user | text | Yes | |
| workspace_id | uuid | Yes | |

**Missing columns (expected by code but not found):**
- updated_at

### apikey

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| key | text | Yes | |
| user_id | uuid | Yes | |
| created_at | timestamp | Yes | |

**Missing columns (expected by code but not found):**
- name
- expires_at
- last_used_at

### videos

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| url | text | Yes | |
| final_url | text | Yes | |
| ai_preview | text | Yes | |
| media_status | text | Yes | |
| language | text | Yes | |
| created_at | timestamp | Yes | |
| tenant_id | uuid | Yes | |
| user_id | uuid | Yes | |
| type | text | Yes | |

**Missing columns (expected by code but not found):**
- video_url
- preview
- embed_code
- campaign_name
- workspace_id
- status
- name
- updated_at

### ai_videos

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| status | text | Yes | |
| url | text | Yes | |
| preview | text | Yes | |
| created_at | timestamp | Yes | |
| user_id | uuid | Yes | |

**Missing columns (expected by code but not found):**
- video_id
- job_id

### jobs

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| status | text | Yes | |
| type | text | Yes | |
| created_at | timestamp | Yes | |
| error | text | Yes | |
| user_id | uuid | Yes | |

**Missing columns (expected by code but not found):**
- updated_at
- result
- ai_video_id
- video_id

### leads

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| name | text | Yes | |
| email | text | Yes | |
| user_id | uuid | Yes | |
| video_id | uuid | Yes | |
| created_at | timestamp | Yes | |

**Missing columns (expected by code but not found):**
- session_id
- campaign_id
- status
- company
- passed

### feedback

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| user_id | uuid | Yes | |
| session_id | uuid | Yes | |
| video_id | uuid | Yes | |
| created_at | timestamp | Yes | |
| question | text | Yes | |
| answer | text | Yes | |

**Missing columns (expected by code but not found):**
- name
- email
- company
- passed

### analytics

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| video_id | uuid | Yes | |
| user_id | uuid | Yes | |
| tenant_id | uuid | Yes | |
| data | jsonb | Yes | |
| created_at | timestamp | Yes | |
| event | text | Yes | |

**Missing columns (expected by code but not found):**
- event_type
- properties

### usage

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| user_id | uuid | Yes | |
| model | text | Yes | |
| provider | text | Yes | |
| action | text | Yes | |
| created_at | timestamp | Yes | |
| video_id | uuid | Yes | |

**Missing columns (expected by code but not found):**
- tenant_id
- details
- cost_estimate
- job_id

### brand_kit

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| user_id | uuid | Yes | |
| primary_color | text | Yes | |
| secondary_color | text | Yes | |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

**Missing columns (expected by code but not found):**
- id
- tenant_id
- logo_url
- font_family
- company_name
- website

### comments

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| video_id | uuid | Yes | |
| user_id | uuid | Yes | |
| created_at | timestamp | Yes | |
| content | text | Yes | |

**Missing columns (expected by code but not found):**
- text
- time
- timestamp

### submissions

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | No | Primary key |
| created_at | timestamp | Yes | |

**Missing columns (expected by code but not found):**
- user_id
- session_id
- data
- form_data
- answers

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| videos | Unknown | Video storage |
| user-data | Unknown | User data |
| smartcrm-contacts | Unknown | SmartCRM integration |
| smartcrm-deals | Unknown | SmartCRM integration |
| smartcrm-calendar | Unknown | SmartCRM integration |
| smartcrm-agents | Unknown | SmartCRM integration |
| smartcrm-avatars | Unknown | SmartCRM integration |
| smartcrm-documents | Unknown | SmartCRM integration |
| app-assets | Unknown | Application assets |
| user-uploads | Unknown | User uploads |
| training-videos | Unknown | Training videos |
| webinar-replays | Unknown | Webinar replays |
| generated-images | Unknown | Generated images |
| generated-thumbnails | Unknown | Generated thumbnails |
| remix-media-assets | Unknown | Remix media |
| remix-user-uploads | Unknown | Remix uploads |
| presentation-images | Unknown | Presentation images |
| campaign-videos | Unknown | Campaign videos |
| generated-media | Unknown | Generated media |
| brand-assets | Unknown | Brand assets |
| tenant-assets | Unknown | Tenant assets |
| tenant-generations | Unknown | Tenant generations |
| tenant-thumbnails | Unknown | Tenant thumbnails |
| shared-content | Unknown | Shared content |
| frame-media | Unknown | Frame media |
| pomelli-assets | Unknown | Pomelli assets |
| campaign-images | Unknown | Campaign images |
| user-assets | Unknown | User assets |
| campaign-audio | Unknown | Campaign audio |
| videco-videos | Unknown | Videco videos |
| brand-photoshoots | Unknown | Brand photoshoots |
| vfx-uploads | Unknown | VFX uploads |
| thumbnails | Unknown | Thumbnails |
| card-avatars | Unknown | Card avatars |
| template-thumbnails | Unknown | Template thumbnails |
| recordings | Unknown | Recordings |
| uploads | Unknown | General uploads |
| brander_user-profiles | Unknown | Brander profiles |
| brander_generated-assets | Unknown | Brander generated assets |
| brander_brand-assets | Unknown | Brander brand assets |
| brander_user-uploads | Unknown | Brander user uploads |

**Note:** Could not determine public/private status for each bucket due to API limitations.

---

## RLS Status

**Cannot be determined** with current access. The Supabase REST API does not expose RLS policy metadata, and direct database connection is not available.

To determine RLS status, the following would be needed:
* Direct PostgreSQL connection to query `pg_policies`
* Supabase Studio access
* Supabase Management API access with appropriate permissions

---

## Functions and Triggers

**Cannot be determined** with current access. Would require direct database connection or Management API access.

---

## Migration History

**Cannot be determined** with current access. Would require direct database connection or Management API access to compare applied migrations vs repository migrations.

---

## Summary

### What Was Verified

1. **Table existence** - Confirmed which tables exist in the live database
2. **Column existence** - Confirmed which columns exist by probing with SELECT queries
3. **Storage buckets** - Listed all buckets (43 buckets found)
4. **Data presence** - Confirmed most tables are empty

### What Could Not Be Verified

1. **Column types** - Could not determine PostgreSQL data types
2. **Nullability** - Could not determine which columns are nullable
3. **Defaults** - Could not determine default values
4. **Primary keys** - Could not verify PK constraints (though `id` columns appear to be UUIDs)
5. **Foreign keys** - Could not verify FK relationships
6. **RLS policies** - Could not inspect RLS configuration
7. **Indexes** - Could not inspect indexes
8. **Functions/triggers** - Could not inspect database functions
9. **Migration history** - Could not determine which migrations are applied

### Key Findings

1. **Missing tables**: `campaigns`, `invitations`, `editor_v2_interactive_elements`, `plans` do not exist
2. **Schema drift**: Many columns expected by code do not exist in live database
3. **Empty database**: Most application tables appear to be empty
4. **Dual workspace tables**: Both `workspace` (singular) and `workspaces` (plural) exist

### Recommendations

1. **Direct database access required** for complete schema verification
2. **Supabase Studio** should be used to inspect RLS, constraints, and types
3. **Migration audit** needed to reconcile code expectations with live schema
4. **TypeScript types** should be updated based on verified live schema, not assumptions
