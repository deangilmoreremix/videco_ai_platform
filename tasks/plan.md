# Implementation Plan: Fix VidecoAI Platform Audit Findings

## Overview
The VidecoAI platform is in a post-migration but pre-functional state after switching to Supabase + Netlify + Muapi + OpenAI. The live Supabase database schema is missing multiple tables referenced in the code, the login flow is completely broken (HTTP 500), and every authenticated page crashes on null user/workspace state. This plan fixes the critical blockers first, then repairs the database layer, then cleans up the remaining runtime and build issues.

## Architecture Decisions
- Keep Next.js Pages Router; do not migrate to App Router during this fix cycle.
- Keep Chakra UI v2.5 and Zustand; no UI library changes.
- Use Supabase as the source of truth for schema; migrations in `supabase/migrations/`.
- Auth will remain Supabase Auth via `@supabase/auth-helpers-react`.
- Netlify Functions remain the primary serverless backend; Supabase Edge Functions are secondary.
- Fix TypeScript safety incrementally; do not re-enable `strict: true` globally until all pages compile cleanly.

## Task List

### Phase 1: Critical Blockers — App Must Boot and Auth Must Work
- [ ] Task 1: Fix `/auth/login` HTTP 500 and restore working auth pages
- [ ] Task 2: Fix login page to support both sign-in and sign-up
- [ ] Task 3: Add client-side auth guard to protected routes
- [ ] Task 4: Fix multiple GoTrueClient instance warnings

### Checkpoint: Phase 1
- [ ] `/auth/login` loads without 500
- [ ] User can sign in and sign up
- [ ] Dashboard redirects unauthenticated users to login
- [ ] No console 500 errors on auth pages

### Phase 2: Database Schema — Make Queries Stop Failing
- [ ] Task 5: Create missing `analytics` table + RLS migration
- [ ] Task 6: Create missing `workspace` table + seed default workspace migration
- [ ] Task 7: Create missing `plan` table + seed migration
- [ ] Task 8: Create missing `sub_accounts` table + RLS migration
- [ ] Task 9: Create missing `apikey` table + RLS migration
- [ ] Task 10: Create missing `comments` table + RLS migration
- [ ] Task 11: Fix `profiles.full_name` column mismatch in live DB
- [ ] Task 12: Add missing `videos` columns (`final_url`, `training_audio`, `ai_preview`, `language`, `media_status`)

### Checkpoint: Phase 2
- [ ] All Supabase queries return 200 (no 400/404 table errors)
- [ ] Dashboard loads video data without crashing
- [ ] Analytics pages load without PGRST200 errors
- [ ] Team/workspace queries return data or gracefully empty

### Phase 3: Runtime Stability — Fix Hydration and Null Crashes
- [ ] Task 13: Fix `TopAnalytics` invalid `<p>` inside `<tbody>` DOM nesting
- [ ] Task 14: Fix `useFetchTeamData` null-safety for undefined user/workspace
- [ ] Task 15: Fix `LatestAnalytics` and `ClickAnalytics` invalid nesting if present
- [ ] Task 16: Fix missing `default_thumb.mp4` asset reference
- [ ] Task 17: Remove legacy `sync.so` references in clones/campaign pages
- [ ] Task 18: Replace `window.location.href` routing with `router.push`

### Checkpoint: Phase 3
- [ ] Zero hydration errors on Dashboard and Analytics pages
- [ ] No `TypeError: Cannot read properties of undefined` in console
- [ ] All video thumbnails render without 404
- [ ] SPA navigation works without full page reloads

### Phase 4: Feature Functionality
- [ ] Task 19: Fix video analytics counts (views, plays, leads, feedback)
- [ ] Task 20: Fix team invite and workspace switching flows
- [ ] Task 21: Fix plan/billing gating and upgrade prompts
- [ ] Task 22: Fix API key generation in Settings
- [ ] Task 23: Fix Zapier Automation page (client-id or graceful fallback)
- [ ] Task 24: Fix Embed/Player pages to use correct video schema

### Checkpoint: Phase 4
- [ ] Analytics counts reflect real data
- [ ] Team members can be invited and listed
- [ ] Plan limits are enforced correctly
- [ ] API key can be generated and displayed
- [ ] Embed URLs resolve correctly

### Phase 5: Code Quality and Build Health
- [ ] Task 25: Re-enable `ignoreBuildErrors: false` and fix TypeScript errors page-by-page
- [ ] Task 26: Re-enable `ignoreDuringBuilds: false` and fix ESLint errors
- [ ] Task 27: Remove large commented-out code blocks in Header, Sidebar, Dashboard
- [ ] Task 28: Fix fake Zustand defaults (`workspace.id: 1`, etc.) to query real tenant
- [ ] Task 29: Add missing `src/definitions`, `src/interfaces`, `src/styles` directories or remove aliases

### Checkpoint: Phase 5
- [ ] `next build` fails on real errors instead of hiding them
- [ ] No commented blocks > 20 lines remain in active pages
- [ ] Zustand stores hydrate from Supabase on app load

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Live Supabase schema cannot be modified | High | Provide SQL migration files and manual apply instructions |
| Removing `ignoreBuildErrors` reveals hundreds of errors | High | Fix page-by-page with `tsc --noEmit` scoped to `pages/` and `src/` |
| `default_thumb.mp4` does not exist and video previews break | Medium | Create placeholder MP4 or update all references to PNG |
| Netlify vs Supabase Edge Functions ambiguity | Medium | Standardize on Netlify Functions for `pages/api/` and `netlify/functions/` |
| Multiple GoTrueClient refactor breaks auth | Medium | Centralize client creation in `src/services/supabase.ts` only |

## Open Questions
- Should `analytics` events be inserted via Netlify Functions or directly from client? (Prefer Netlify Functions for reliability)
- Is `default_thumb.mp4` intended to be a video or image? (Likely image; rename or replace asset)
- Should workspace switching be tenant-based or user-preference based? (Prefer tenant-based per migration design)
