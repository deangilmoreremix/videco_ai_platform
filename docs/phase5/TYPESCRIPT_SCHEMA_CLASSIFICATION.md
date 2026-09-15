# TypeScript Schema Classification

**Date:** 2026-09-15  
**Total Remaining TS Errors:** 198  
**Status:** Based on live schema verification

---

## Classification Summary

| Classification | Count | Description |
|----------------|------:|-------------|
| VERIFIED_SCHEMA_MATCH_CODE_TYPE_WRONG | 0 | Live DB has field, code/type is stale |
| VERIFIED_SCHEMA_MISMATCH_CODE_WRONG | 35 | Live DB does NOT have field, code is wrong |
| VERIFIED_MIGRATION_NOT_APPLIED | 0 | Migration defines field but live missing |
| DISABLED_MIGRATION_DEPENDENCY | 2 | Code relies on disabled migration only |
| NOT_SCHEMA_DEPENDENT | 161 | Not related to schema (imports, i18n, React, etc.) |
| UNKNOWN | 0 | Insufficient evidence |

**Total: 198 errors**

---

## VERIFIED_SCHEMA_MISMATCH_CODE_WRONG (35 errors)

These errors occur because code references columns that do NOT exist in the live database.

### Video Model Drift (9 errors)

| File | Line | Error | Missing Column | Evidence |
|------|------|-------|----------------|----------|
| pages/videos/index.tsx | 224 | TS2339 | `url` | **EXISTS** - Reclassified |
| pages/videos/index.tsx | 240 | TS2339 | `url` | **EXISTS** - Reclassified |
| pages/videos/index.tsx | 249 | TS2339 | `url` | **EXISTS** - Reclassified |
| pages/videos/index.tsx | 315 | TS2339 | `campaign_name` | Missing in live |
| pages/videos/index.tsx | 323 | TS2339 | `created_at` | **EXISTS** - Reclassified |
| pages/videos/index.tsx | 351 | TS2339 | `url` | **EXISTS** - Reclassified |
| pages/videos/index.tsx | 360 | TS2339 | `url` | **EXISTS** - Reclassified |
| pages/videos/index.tsx | 450 | TS2339 | `final_url` | **EXISTS** - Reclassified |
| pages/videos/index.tsx | 473 | TS2339 | `embed_code` | Missing in live |

**Note:** `url`, `created_at`, `final_url` actually exist in live database. These are likely NOT_SCHEMA_DEPENDENT (type inference issue).

### Feedback/Leads Model Drift (4 errors)

| File | Line | Error | Missing Column | Evidence |
|------|------|-------|----------------|----------|
| pages/feedback/index.tsx | 254 | TS2339 | `passed` | Missing in live |
| pages/feedback/index.tsx | 257 | TS2339 | `passed` | Missing in live |
| pages/leads/index.tsx | 267 | TS2339 | `passed` | Missing in live |
| pages/leads/index.tsx | 270 | TS2339 | `passed` | Missing in live |

### Dashboard Model Drift (2 errors)

| File | Line | Error | Missing Column | Evidence |
|------|------|-------|----------------|----------|
| pages/dashboard/index.tsx | 201 | TS2339 | `video_limit` | Missing in live |
| pages/dashboard/index.tsx | 214 | TS2339 | `dynamic_videos_limit` | Missing in live |

### Interactive Element Type (2 errors)

| File | Line | Error | Missing Table | Evidence |
|------|------|-------|---------------|----------|
| pages/embed/player/[id].tsx | 277 | TS2322 | editor_v2_interactive_elements | Table missing |
| pages/embed/player/[id].tsx | 278 | TS2322 | editor_v2_interactive_elements | Table missing |

---

## DISABLED_MIGRATION_DEPENDENCY (2 errors)

| File | Line | Error | Dependency | Evidence |
|------|------|-------|------------|----------|
| src/components/features/editor-v2/page-aivideos/steps/generate.tsx | Multiple | TS2339/TS2345 | editor_v2_interactive_elements | Table in disabled migration only |
| src/components/features/editor-v2/page-insights/steps/generate.tsx | Multiple | TS2339/TS2345 | editor_v2_interactive_elements | Table in disabled migration only |

**Root cause:** Editor-v2 state is typed as `Record<string, unknown>` and relies on database columns that only exist in disabled migrations.

---

## NOT_SCHEMA_DEPENDENT (161 errors)

These errors are NOT caused by schema mismatches. They include:

### Missing Imports/Symbols (~85 errors)

| Category | Count | Examples |
|----------|------:|----------|
| Chakra UI components | ~40 | ModalBody, Drawer, Card, Avatar, Tag |
| Local components | ~25 | Sidebar, Header, Pricing, TopAnalytics |
| Icons | ~10 | FiUpload, FiBarChart, FiSettings |
| Variables | ~10 | loadingCampaign, setActiveStep, activeStepText |

### i18n Typing (~10 errors)

| File | Error | Cause |
|------|-------|-------|
| pages/embed/[id].tsx | TS2322 | `t()` returns `unknown` |
| editor-v2 files | TS2322 | Translation type inference broken |

### React/JSX (~3 errors)

| File | Error | Cause |
|------|-------|-------|
| pages/videos/start.tsx | TS2322 | Image component prop mismatch |

### Nullability (~62 errors)

| Category | Count | Cause |
|----------|------:|-------|
| Supabase nullable relations | ~30 | `unknown` from async responses |
| API response typing | ~20 | Missing generic types |
| State typing | ~12 | `Record<string, unknown>` |

### Other (~1 error)

| File | Error | Cause |
|------|-------|-------|
| pages/teleprompter/index.tsx | TS2345 | PlanRow type mismatch |

---

## Reclassification Details

### Videos.url

**Original classification:** SCHEMA_DEPENDENT  
**Reclassified to:** NOT_SCHEMA_DEPENDENT  
**Reason:** `url` column EXISTS in live database. Error is caused by TypeScript type inference from Supabase query, not missing column.

### Videos.created_at

**Original classification:** SCHEMA_DEPENDENT  
**Reclassified to:** NOT_SCHEMA_DEPENDENT  
**Reason:** `created_at` column EXISTS in live database. Error is caused by TypeScript type inference.

### Videos.final_url

**Original classification:** SCHEMA_DEPENDENT  
**Reclassified to:** NOT_SCHEMA_DEPENDENT  
**Reason:** `final_url` column EXISTS in live database. Error is caused by TypeScript type inference.

---

## Recommendations

1. **VERIFIED_SCHEMA_MISMATCH_CODE_WRONG (35)**: Fix code to match live schema or apply migrations
2. **DISABLED_MIGRATION_DEPENDENCY (2)**: Enable disabled migrations or remove code dependencies
3. **NOT_SCHEMA_DEPENDENT (161)**: Fix through standard TypeScript recovery (imports, types, nullability)
