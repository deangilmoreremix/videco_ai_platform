# Naming Contract

**Date:** 2026-09-15  
**Status:** PARTIAL - Based on live schema and code analysis

---

## Naming Patterns Observed

### Database (snake_case)

Live database uses **snake_case** for:
* Column names: `created_at`, `updated_at`, `tenant_id`, `user_id`, `free_trial_start_date`
* Table names: `profiles`, `workspaces`, `sub_accounts`, `ai_videos`

### Application Code (mixed)

Application code uses **mixed naming**:
* snake_case: `tenant_id`, `user_id`, `video_id`
* camelCase: `finalUrl` (expected but not in live schema)
* camelCase: `embedCode` (expected but not in live schema)
* camelCase: `campaignName` (expected but not in live schema)
* camelCase: `buttonPosition` (expected but not in live schema)
* camelCase: `defaultPosition` (expected but not in live schema)
* camelCase: `endTime` (expected but not in live schema)

---

## Verified Mappings

| Database Column | Live? | Code Expects | Status |
|----------------|------:|--------------|--------|
| id | ✓ | id | MATCH |
| created_at | ✓ | created_at | MATCH |
| updated_at | ✓ | updated_at | MATCH |
| tenant_id | ✓ | tenant_id | MATCH |
| user_id | ✓ | user_id | MATCH |
| video_id | ✓ | video_id | MATCH |
| free_trial_start_date | ✓ | free_trial_start_date | MATCH |
| free_trial_ended | ✓ | free_trial_ended | MATCH |
| button_position | ✗ | buttonPosition | MISMATCH |
| default_position | ✗ | defaultPosition | MISMATCH |
| end_time | ✗ | endTime | MISMATCH |
| final_url | ✓ | finalUrl | NAME_CONFLICT (but column exists) |
| embed_code | ✗ | embedCode | MISMATCH |
| campaign_name | ✗ | campaignName | MISMATCH |

---

## Naming Conflicts

### Confirmed Conflicts (Code vs Live)

1. **buttonPosition** vs **button_position**
   - Code: `buttonPosition`
   - Live: `button_position` (in disabled migration only)
   - Status: Table missing, cannot verify

2. **defaultPosition** vs **default_position**
   - Code: `defaultPosition`
   - Live: `default_position` (in disabled migration only)
   - Status: Table missing, cannot verify

3. **endTime** vs **end_time**
   - Code: `endTime`
   - Live: `end_time` (in disabled migration only)
   - Status: Table missing, cannot verify

### Potential Conflicts (Code vs Live)

1. **finalUrl** vs **final_url**
   - Code may use `finalUrl` in some places
   - Live: `final_url` exists
   - Status: Needs code audit

2. **embedCode** vs **embed_code**
   - Code may use `embedCode`
   - Live: `embed_code` does NOT exist
   - Status: Column missing from live

3. **campaignName** vs **campaign_name**
   - Code may use `campaignName`
   - Live: `campaign_name` does NOT exist
   - Status: Column missing from live

---

## Existing Mapping Layers

### src/utils/media.ts

Contains `getGifPreviewUrl` which maps:
* Input: `og_url` (camelCase parameter)
* Output: GIF preview URL

No evidence of systematic database-to-domain mapping.

### src/services/api/

API services appear to pass database column names directly to Supabase queries without mapping.

---

## Recommendations

1. **Do not rename database columns** to match frontend naming
2. **Create mapper/domain objects** for:
   - Video → VideoDomain
   - Lead → LeadDomain
   - Feedback → FeedbackDomain
   - InteractiveElement → InteractiveElementDomain
3. **Update TypeScript interfaces** to use actual database column names
4. **Add documentation** to each model indicating source of truth

---

## Preferred Architecture

```
Database Row (snake_case)
    ↓ [Mapper]
Domain Object (camelCase)
    ↓ [Component Props]
UI Component
```

Current state: **Missing** - code uses database column names directly in some places, camelCase in others, with no consistent mapping.
