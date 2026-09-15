# Query Schema Mismatches

**Date:** 2026-09-15  
**Status:** PARTIAL - Based on code analysis and live schema verification  
**Live Database:** VideoRemix Product (bzxohkrxcwodllketcpz)

---

## Methodology

* Inspected application code for Supabase queries (`.from()`, `.select()`, `.insert()`, `.update()`, `.upsert()`, `.delete()`, `.rpc()`)
* Compared queried columns against live schema
* Classified severity based on application impact

---

## Query Mismatches

### videos/index.tsx

| File | Query | Column | Live Status | Migration Status | Severity |
|------|-------|--------|-------------|-----------------|----------|
| pages/videos/index.tsx | `.select("url, name, ...")` | name | Missing | Defined | P1 |
| pages/videos/index.tsx | `.select("url, ...")` | url | Exists | Defined | MATCH |
| pages/videos/index.tsx | `.select("campaign_name, ...")` | campaign_name | Missing | Defined | P1 |
| pages/videos/index.tsx | `.select("created_at, ...")` | created_at | Exists | Defined | MATCH |
| pages/videos/index.tsx | `.select("final_url, ...")` | final_url | Exists | Defined | MATCH |
| pages/videos/index.tsx | `.select("embed_code, ...")` | embed_code | Missing | Defined | P1 |
| pages/videos/index.tsx | `.select("workspace_id, ...")` | workspace_id | Missing | Defined | P1 |

### dashboard/index.tsx

| File | Query | Column | Live Status | Migration Status | Severity |
|------|-------|--------|-------------|-----------------|----------|
| pages/dashboard/index.tsx | `.select("video_limit, ...")` | video_limit | Missing | Defined | P1 |
| pages/dashboard/index.tsx | `.select("dynamic_videos_limit, ...")` | dynamic_videos_limit | Missing | Defined | P1 |

### feedback/index.tsx

| File | Query | Column | Live Status | Migration Status | Severity |
|------|-------|--------|-------------|-----------------|----------|
| pages/feedback/index.tsx | `.select("passed, ...")` | passed | Missing | Defined | P2 |
| pages/feedback/index.tsx | `.select("name, email, company")` | name, email, company | Missing | Defined | P2 |

### leads/index.tsx

| File | Query | Column | Live Status | Migration Status | Severity |
|------|-------|--------|-------------|-----------------|----------|
| pages/leads/index.tsx | `.select("passed, ...")` | passed | Missing | Defined | P2 |
| pages/leads/index.tsx | `.select("name, email, company")` | name, email, company | Missing | Defined | P2 |

### header/index.tsx

| File | Query | Column | Live Status | Migration Status | Severity |
|------|-------|--------|-------------|-----------------|----------|
| src/components/common/header/index.tsx | trial fields | free_trial_start_date, free_trial_ended, status | Exists | Defined | MATCH |

### editor-v2 files

| File | Query | Column | Live Status | Migration Status | Severity |
|------|-------|--------|-------------|-----------------|----------|
| src/components/features/editor-v2/page-aivideos/steps/generate.tsx | job state | job fields | Table missing | Disabled migration | P0 |
| src/components/features/editor-v2/index.tsx | interactive elements | InteractiveElementType fields | Table missing | Disabled migration | P0 |
| src/components/features/player/index.tsx | player props | element fields | Table missing | Disabled migration | P0 |

---

## Severity Classification

### P0 - Breaks Core Runtime

1. **editor_v2_interactive_elements table missing** - Editor and player cannot function without this table
2. **Job state typing** - AI video generation workflow broken

### P1 - Breaks Major Feature

1. **videos.name** - Video listing broken
2. **videos.campaign_name** - Campaign features broken
3. **videos.embed_code** - Embed sharing broken
4. **videos.workspace_id** - Workspace isolation broken
5. **dashboard video_limit** - Plan enforcement broken
6. **dashboard dynamic_videos_limit** - Plan enforcement broken

### P2 - Secondary/Polish

1. **feedback.passed** - Feedback filtering broken
2. **leads.passed** - Lead filtering broken
3. **feedback/leads name/email/company** - Display broken

---

## Recommendations

1. **P0**: Apply disabled migration for `editor_v2_interactive_elements` or create new migration
2. **P1**: Apply missing columns to `videos`, `dashboard` queries
3. **P2**: Evaluate if columns are truly needed or can be removed from code
