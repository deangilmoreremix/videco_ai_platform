# Phase 7 TypeScript Baseline

**Date:** 2026-09-16  
**Branch:** `fix/phase-7-typescript-build-stabilization`  
**Starting SHA:** `430a8a93348701f38175c2beae7de65d42bcc8d6`  
**Initial TypeScript errors:** `125`  
**Initial ESLint errors:** `0`  
**Initial ESLint warnings:** `136`  
**Tests:** `10 passed`  
**Build:** `PASS`

---

## Error Distribution by File

| File | Error Count | Category |
|------|-------------|----------|
| `src/components/features/editor-v2/new-elements/index.tsx` | 17 | EDITOR |
| `src/components/features/editor-v2/page-insights/steps/generate.tsx` | 14 | INSIGHTS |
| `src/components/features/editor-v2/page-aivideos/steps/generate.tsx` | 13 | AI_VIDEO |
| `src/components/features/editor-v2/page-aivideos/index.tsx` | 9 | AI_VIDEO |
| `src/components/features/editor-v2/header/index.tsx` | 7 | EDITOR |
| `src/lib/openai.ts` | 6 | OPENAI |
| `src/components/features/editor-v2/page-preview/index.tsx` | 6 | EDITOR |
| `src/components/features/editor-v2/page-aivideos/share-modal.tsx` | 5 | AI_VIDEO |
| `src/components/features/editor-v2/page-insights/index.tsx` | 4 | INSIGHTS |
| `src/components/features/editor-v2/page-aivideos/share-modal-video.tsx` | 4 | AI_VIDEO |
| `src/services/index.ts` | 3 | SERVICES |
| `src/components/features/player/index.tsx` | 3 | PLAYER |
| `src/components/features/editor-v2/timeline/index.tsx` | 3 | EDITOR |
| `src/components/features/editor-v2/header/image-preview.tsx` | 3 | EDITOR |
| `pages/videos/start.tsx` | 3 | VIDEO_UI |
| `src/components/features/player/elements-log.tsx` | 2 | PLAYER |
| `src/components/features/invite/index.tsx` | 2 | INVITE |
| `src/components/features/editor-v2/upload/v2.tsx` | 2 | EDITOR |
| `src/components/features/editor-v2/upload/index.tsx` | 2 | EDITOR |
| `src/components/features/editor-v2/theme-siderbar/index.tsx` | 2 | EDITOR |
| `src/components/features/editor-v2/page-insights/share-modal.tsx` | 2 | INSIGHTS |
| `src/components/features/editor-v2/page-insights/share-modal-video.tsx` | 2 | INSIGHTS |
| `src/components/features/analytics/top.tsx` | 2 | ANALYTICS |
| `src/components/features/analytics/single.tsx` | 2 | ANALYTICS |
| `src/components/common/onboarding/welcome.tsx` | 2 | ONBOARDING |
| `src/utils/apiAuth.ts` | 1 | AUTH |
| `src/components/features/player/elements/button.tsx` | 1 | PLAYER |
| `src/components/features/editor-v2/page-insights/steps/import.tsx` | 1 | INSIGHTS |
| `src/components/features/editor-v2/page-aivideos/steps/import.tsx` | 1 | AI_VIDEO |
| `src/components/features/analytics/click.tsx` | 1 | ANALYTICS |

**Total:** 125 errors

---

## Root Cause Analysis

### Shared Root Cause 1: Editor State/Callback Mismatches
- `new-elements/index.tsx` references `setIsHovered`, `setActive` instead of `_setIsHovered`, `_setActive`
- `player/index.tsx` references `setActiveElement`, `setPreviewFinished` instead of store-prefixed names
- **Impact:** ~20 errors

### Shared Root Cause 2: Missing Generic/State Typings in Generate Steps
- `page-aivideos/steps/generate.tsx` and `page-insights/steps/generate.tsx` use `unknown` state without proper typing
- Missing `useState<...>` generics for job data, form fields, and response payloads
- **Impact:** ~27 errors

### Shared Root Cause 3: Header/Preview Type Drift
- `header/index.tsx` and `header/image-preview.tsx` have mismatched Chakra prop types and missing imports
- `image-preview.tsx` references undefined `files` and incorrect `Image` usage
- **Impact:** ~10 errors

### Shared Root Cause 4: OpenAI SDK Signature Mismatch
- `src/lib/openai.ts` accesses `response.body` with incorrect typing for current SDK version
- **Impact:** 6 errors

### Shared Root Cause 5: Analytics Interface Mismatches
- `analytics/*` components expect data shapes that don't match actual query results
- **Impact:** 5 errors

### Shared Root Cause 6: Player/InteractiveElement Type Divergence
- `player/index.tsx` inline element type differs from `InteractiveElementType` in store
- Missing `buttonPosition`, `pos`, and optionality mismatches
- **Impact:** 3+ errors

### Shared Root Cause 7: Auth/Service Type Issues
- `utils/apiAuth.ts` and `services/index.ts` have Supabase client typing issues
- **Impact:** 4 errors

### Shared Root Cause 8: Video UI / Chakra Prop Mismatches
- `videos/start.tsx` passes custom props to Chakra `Image` that aren't in the component type
- **Impact:** 3 errors

---

## Error Groups by Category

### EDITOR (43 errors)
- `new-elements/index.tsx`: 17
- `header/index.tsx`: 7
- `page-preview/index.tsx`: 6
- `timeline/index.tsx`: 3
- `header/image-preview.tsx`: 3
- `upload/index.tsx`: 2
- `upload/v2.tsx`: 2
- `theme-siderbar/index.tsx`: 2
- `page-aivideos/index.tsx`: part of 9
- `page-aivideos/steps/generate.tsx`: part of 13

### INSIGHTS (22 errors)
- `page-insights/steps/generate.tsx`: 14
- `page-insights/index.tsx`: 4
- `page-insights/share-modal.tsx`: 2
- `page-insights/share-modal-video.tsx`: 2

### AI_VIDEO (32 errors)
- `page-aivideos/steps/generate.tsx`: 13
- `page-aivideos/index.tsx`: 9
- `page-aivideos/share-modal.tsx`: 5
- `page-aivideos/share-modal-video.tsx`: 4
- `page-aivideos/steps/import.tsx`: 1

### PLAYER (6 errors)
- `player/index.tsx`: 3
- `elements-log.tsx`: 2
- `elements/button.tsx`: 1

### OPENAI (6 errors)
- `lib/openai.ts`: 6

### ANALYTICS (5 errors)
- `analytics/top.tsx`: 2
- `analytics/single.tsx`: 2
- `analytics/click.tsx`: 1

### SERVICES (3 errors)
- `services/index.ts`: 3

### VIDEO_UI (3 errors)
- `videos/start.tsx`: 3

### ONBOARDING (2 errors)
- `common/onboarding/welcome.tsx`: 2

### INVITE (2 errors)
- `features/invite/index.tsx`: 2

### AUTH (1 error)
- `utils/apiAuth.ts`: 1

---

## Planned Fix Order

1. **Shared root cause 1:** Editor callbacks and state names (`new-elements`, `player`, `header`)
2. **Shared root cause 2:** Generate step typings (`page-aivideos`, `page-insights`)
3. **Shared root cause 3:** Header/preview types
4. **Shared root cause 4:** OpenAI SDK types
5. **Shared root cause 5:** Analytics interfaces
6. **Shared root cause 6:** Player element types
7. **Shared root cause 7:** Services/auth types
8. **Shared root cause 8:** Video UI Chakra props
9. **Remaining:** Onboarding, invite, insights imports

---

## Validation Plan

After each group:
- Run `npx tsc --noEmit --pretty false 2>&1 | grep -c "error TS"`
- Update this document with new count
- Ensure build still passes

Final targets:
- TypeScript: `0`
- ESLint errors: `0`
- Tests: all pass
- Build: `PASS`
