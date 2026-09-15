# VidecoAI Completion Audit

**Date:** 2026-09-15  
**Branch:** stabilize/videco-completion-audit-2026-09-15  
**SHA:** fd20195b6a3de8e95f26f34012d01cc44afa4c24  
**Auditor:** Kilo  

---

## How to Read This Matrix

Each feature is classified using one of:

| Status | Meaning |
|--------|---------|
| WORKING | Verified functional end-to-end |
| BROKEN | Confirmed non-functional or crashes |
| PARTIAL | Some paths work, others don't |
| STUB | Returns success but does no real work |
| DEAD LEGACY | Code exists but is unreferenced/abandoned |
| NOT TESTED | No tests or verification exists |
| BLOCKED BY CREDENTIAL | Needs API key/env var to verify |
| NOT APPLICABLE | Feature not present in this build |

---

## Authentication

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| signup | `/auth/login` | `pages/auth/login.tsx` | Supabase Auth | `profiles`, `sub_accounts`, `workspace` | Supabase Auth | PARTIAL | login.tsx supports sign-in UI but signup flow is reported broken in `tasks/plan.md` ("/auth/login HTTP 500"); onboarding writes depend on live schema | Verify signup form submission; check RLS on `profiles` insert |
| login | `/auth/login` | `pages/auth/login.tsx`, `src/hoc/withAuthGuard.tsx` | Supabase Auth | `profiles` | Supabase Auth | BROKEN | `pages/videos/index.tsx` calls `useSession()` without import; auth guard uses `useSession` from `@supabase/auth-helpers-react` but dependency may be broken; TypeScript errors on auth pages | Verify login form submits; check session hydration |
| logout | `/auth/logout` | `pages/auth/logout.tsx` | Supabase Auth | — | Supabase Auth | PARTIAL | Route exists; need to verify redirect and session destruction | Manual logout flow test |
| password reset | — | Not clearly implemented | — | — | Supabase Auth | STUB | No dedicated password reset UI or API found | Search for reset flow |
| session persistence | — | `src/services/supabase.ts`, `src/services/index.ts` | Supabase Auth client | — | Supabase Auth | PARTIAL | Two competing Supabase client singletons (`src/services/supabase.ts` and lazy proxy in `src/services/index.ts`); both set `persistSession: true`; duplicate clients can cause multiple GoTrueClient warnings | Verify only one client is active in production |
| session refresh | — | Supabase client config | Supabase Auth client | — | Supabase Auth | PARTIAL | `autoRefreshToken: true` is set in both clients; refresh depends on single active client | Verify refresh under token expiry |
| auth redirects | `/dashboard`, protected pages | `src/hoc/withAuthGuard.tsx` | — | — | — | PARTIAL | Auth guard exists; need to verify unauthenticated redirect behavior | Manual protected-route test |
| protected pages | `/dashboard`, `/videos`, `/editor`, etc. | `src/hoc/withAuthGuard.tsx` | — | — | — | PARTIAL | Guard exists but multiple pages crash on null user/workspace state per `tasks/plan.md` | Verify dashboard load with no session |

---

## User and Workspace

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| profile | `/settings` | `pages/settings/index.tsx` | — | `profiles` | — | PARTIAL | Profile page exists; queries depend on `profiles` schema which may have column mismatches (`full_name` vs `fullName`) | Verify profile read/write |
| workspace creation | `/auth/rockethub-signup` | `pages/auth/rockethub-signup.tsx` | — | `workspace`, `tenants` | — | PARTIAL | Workspace creation flow exists; depends on `20260804_add_missing_tables.sql` being applied | Verify workspace seed on signup |
| workspace loading | Sidebar | `src/components/common/sidebar/workspace.tsx`, `src/store/workspace.ts` | — | `workspace` | — | PARTIAL | Zustand workspace store exists; sidebar queries `workspace` table; TypeScript errors on `name`/`id` properties | Verify workspace list loads |
| team data | `/invite` | `pages/invite/index.tsx`, `src/hooks/useFetchTeamData.ts` | — | `sub_accounts` | — | PARTIAL | `useFetchTeamData` exists but has unsafe assumptions about `res.data[0]` and `shared_account_user`; duplicate `supabase` identifier in `pages/invite/index.tsx` | Verify team listing with real data |
| team invitations | `/invite` | `pages/invite/index.tsx` | — | `sub_accounts` | Brevo (email) | PARTIAL | Invite UI exists; email sent via Brevo; invite acceptance flow unclear | Verify invite email delivery and acceptance |
| workspace switching | Sidebar | `src/components/common/sidebar/workspace.tsx` | — | `workspace` | — | PARTIAL | Workspace switcher UI exists; switching logic depends on `workspace` table and tenant_id | Verify multi-workspace behavior |

---

## Dashboard

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| page load | `/dashboard` | `pages/dashboard/index.tsx` | — | `videos`, `analytics` | — | BROKEN | `tasks/plan.md` reports dashboard crashes on null user/workspace; multiple TypeScript errors on dashboard component | Verify dashboard loads without crash |
| real database data | `/dashboard` | `pages/dashboard/index.tsx` | — | `videos`, `analytics` | — | PARTIAL | Dashboard queries `videos` and `analytics`; depends on tables existing and RLS allowing access | Verify data population |
| video counts | `/dashboard` | `pages/dashboard/index.tsx` | — | `videos` | — | PARTIAL | Count queries exist; may fail if `videos` table missing or RLS blocks | Verify count queries return numbers |
| recent videos | `/dashboard` | `pages/dashboard/index.tsx` | — | `videos` | — | PARTIAL | Recent videos list exists; depends on `videos.media_status` and `final_url` columns | Verify recent list renders |
| empty states | `/dashboard` | `pages/dashboard/index.tsx` | — | — | — | PARTIAL | Empty state UI likely exists; needs verification when no videos | Verify empty state rendering |
| action buttons | `/dashboard` | `pages/dashboard/index.tsx` | — | — | — | PARTIAL | Action buttons exist; routing may be broken | Verify button navigation |

---

## Video Library

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| video listing | `/videos` | `pages/videos/index.tsx` | `pages/api/v1/videos/index.ts` | `videos` | — | PARTIAL | Listing API exists; frontend has TypeScript errors (`useSession` missing import, missing `url`/`campaign_name`/`created_at`/`final_url`/`embed_code` on video type) | Verify list renders with real data |
| create video | `/videos/start` | `pages/videos/start.tsx` | — | `videos` | — | PARTIAL | Create flow exists; has TypeScript errors (`_activeStep`, `_setActiveStep`, `Image` JSX, `loadingCampaign`) | Verify create flow completes |
| upload | `/videos/upload` | `pages/videos/upload.tsx` | — | `videos` | Supabase Storage | PARTIAL | Upload UI exists; TypeScript errors on state variables; storage helpers exist in `src/lib/storage.ts` | Verify upload to Supabase Storage |
| view | `/videos/[id]` | Not explicitly found | — | `videos` | — | PARTIAL | View likely embedded in listing; needs verification | Verify video detail view |
| edit | `/videos/edit` | `pages/videos/edit.tsx` | — | `videos` | — | PARTIAL | Edit page exists; depends on video schema alignment | Verify edit saves |
| delete | `/videos` | `pages/videos/index.tsx` | `pages/api/v1/videos/index.ts` (DELETE) | `videos` | — | PARTIAL | Delete button exists in listing; API supports delete | Verify delete removes record |
| duplicate | — | Not clearly implemented | — | — | — | DEAD LEGACY | No explicit duplicate UI or API found | Search for duplicate flow |
| status | `/videos` | `pages/videos/index.tsx` | — | `videos.media_status` | — | PARTIAL | Status display exists; depends on `media_status` column | Verify status rendering |
| thumbnails | `/videos` | `pages/videos/index.tsx` | — | `videos.preview` | Supabase Storage | PARTIAL | Thumbnail rendering exists; depends on `preview`/`final_url` columns | Verify thumbnail URLs |
| final URLs | `/videos` | `pages/videos/index.tsx` | — | `videos.final_url` | Supabase Storage / Muapi | PARTIAL | Final URL display exists; populated by Muapi webhook or poll | Verify URL after AI completion |

---

## Recording

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| browser recording | `/recording` | `pages/recording/index.tsx` | — | — | — | PARTIAL | Recording page exists; uses `react-screen-capture`; actual browser recording implementation unclear | Verify screen/audio capture |
| media save | `/recording` | `pages/recording/index.tsx` | — | — | — | PARTIAL | Save flow exists; needs verification of blob handling | Verify recording blob saved |
| upload | `/recording` | `pages/recording/index.tsx` | — | `videos` | Supabase Storage | PARTIAL | Upload after recording exists; uses storage helpers | Verify upload after recording |
| editor handoff | `/recording` → `/editor` | `pages/recording/index.tsx` | — | `videos` | — | PARTIAL | Navigation to editor exists; depends on video record creation | Verify handoff creates video |

---

## Editor

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| video load | `/editor` | `src/components/features/editor-v2/index.tsx` | — | `videos` | — | PARTIAL | Editor loads video data; has TypeScript errors (`res` undefined, type mismatches) | Verify editor loads existing video |
| timeline | `/editor` | `src/components/features/editor-v2/timeline/index.tsx` | — | — | — | PARTIAL | Timeline component exists; has TypeScript/Draggable type errors | Verify timeline interaction |
| interactive elements | `/editor` | `src/components/features/editor-v2/new-elements/index.tsx`, `settings-siderbar/index.tsx` | — | `videos` (interactive elements JSON) | — | PARTIAL | Interactive elements UI exists; many missing variable errors (`setIsHovered`, `setActive`, `handleBlur`) | Verify CTA/form/question creation |
| CTA | `/editor` | Interactive elements | — | — | — | PARTIAL | CTA element type exists; needs verification | Verify CTA rendering in player |
| forms | `/editor` | Interactive elements | — | — | — | PARTIAL | Form element type exists; needs verification | Verify form submission |
| questions | `/editor` | Interactive elements | — | — | — | PARTIAL | Question element type exists; needs verification | Verify question rendering |
| calendar | `/editor` | Interactive elements | — | — | Calendar booking URL | PARTIAL | Calendar element exists; depends on `NEXT_PUBLIC_CALENDAR_BOOKING_URL` | Verify calendar link |
| save | `/editor` | `src/components/features/editor-v2/index.tsx` | — | `videos` | — | PARTIAL | Save flow exists; depends on Supabase update working | Verify save persists changes |
| reload | `/editor` | `src/components/features/editor-v2/index.tsx` | — | `videos` | — | PARTIAL | Reload from DB exists; depends on video record | Verify reload restores state |
| preview | `/editor` | `src/components/features/editor-v2/page-preview/index.tsx` | — | — | — | PARTIAL | Preview page exists; has TypeScript errors (`interactiveElements`, `setVideo`, Chakra icons missing) | Verify preview renders |
| publishing | `/editor` | `src/components/features/editor-v2/page-aivideos/index.tsx` | — | `videos`, `ai_videos` | — | PARTIAL | Publish/share flow exists; has TypeScript errors (`onOpen`, `getEmailEmbedCode`) | Verify publish updates status |
| share | `/editor` | Share modals | — | — | — | PARTIAL | Share modals exist; has TypeScript errors on Provider types | Verify share link generation |

---

## AI Video

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| script generation | `/ai-videos` | `src/components/features/editor-v2/page-aivideos/steps/generate.tsx` | `pages/api/ai/personalize-script.ts` | — | OpenAI | PARTIAL | Script generation calls OpenAI; has TypeScript errors (`job`, `fname`, `email`, `website`, `onOpen`) | Verify script generation with real API key |
| AI video generation | `/ai-videos` | `src/components/features/editor-v2/page-aivideos/index.tsx` | `pages/api/v1/videos/process.ts`, `netlify/functions/ai-orchestrator.ts`, `supabase/functions/ai-orchestrator/index.ts` | `jobs`, `videos`, `ai_videos` | Muapi, OpenAI | PARTIAL | Dual-path: Muapi or stub; stub path returns `mode: "stub"` without processing | Verify Muapi path with valid key |
| preview | `/ai-videos` | `src/components/features/editor-v2/page-aivideos/index.tsx` | `pages/api/v1/videos/create-preview.ts` | `jobs` | Muapi | PARTIAL | Preview creation exists; calls `callMuapi("videos/preview")` | Verify preview job creation |
| Muapi request | — | `src/lib/muapi.ts` | `src/services/aiClone.ts` | — | Muapi | PARTIAL | Muapi client configured; requires `MUAPI_API_KEY`; `uploadFile` has Buffer/Blob type issues | Verify Muapi API connectivity |
| job record | — | — | `pages/api/v1/videos/process.ts`, `pages/api/v1/videos/clone.ts` | `jobs` | — | PARTIAL | Job records are created in both Muapi and stub paths | Verify job row insertion |
| job polling | — | — | `pages/api/v1/videos/poll.ts` | `jobs`, `videos`, `ai_videos` | Muapi | PARTIAL | Poll endpoint exists; calls `pollResult` from `src/lib/muapi.ts`; updates DB on completion | Verify polling updates status |
| webhook | — | — | `pages/api/webhooks/muapi.ts` | `videos`, `ai_videos` | Muapi | PARTIAL | Webhook endpoint exists; verifies signature; updates DB | Verify webhook registration and delivery |
| final output | — | — | `pages/api/v1/videos/poll.ts`, `pages/api/webhooks/muapi.ts` | `videos.final_url`, `ai_videos.url` | Muapi, Supabase Storage | PARTIAL | Final URL is set on completion; depends on Muapi returning `outputs[0].url` | Verify final_url populated |
| database persistence | — | — | Multiple API routes | `jobs`, `videos`, `ai_videos` | — | PARTIAL | Persistence logic exists; depends on tables existing and columns matching | Verify DB rows after operations |

**CONFIRMED ISSUE:** `pages/api/v1/videos/clone.ts` imports `createAIClone` from `src/services/aiClone.ts` but does NOT pass `ai_video_id` into the call at line 14-20. The `createAIClone` function signature accepts `ai_video_id?: string` but the route receives it from `req.body` and never forwards it. This means the job update at line 84-88 in `src/services/aiClone.ts` will update `jobs` with `id = params.ai_video_id`, which is `undefined`, causing the update to fail or affect zero rows.

---

## AI Clone

| Feature | Status | Problem | Verification Needed |
|---------|--------|---------|---------------------|
| Complete path from clone request to final video | PARTIAL | `pages/api/v1/videos/clone.ts` receives `ai_video_id` but fails to pass it into `createAIClone()`; fallback path returns `mode: "stub"` | Verify `ai_video_id` is passed to `createAIClone`; verify job updates and completion |
| Muapi lip-sync dispatch | PARTIAL | `src/services/aiClone.ts` uses OpenAI TTS + Muapi lip-sync; requires both API keys | Verify with valid Muapi + OpenAI keys |
| Job status updates | PARTIAL | `src/services/aiClone.ts` updates `jobs` and `videos` tables; depends on `ai_video_id` being passed | Verify status transitions |
| Completion handling | PARTIAL | `pages/api/v1/videos/poll.ts` and `pages/api/webhooks/muapi.ts` handle completion | Verify completion updates DB |

---

## Personalization

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| OpenAI usage | `/ai-videos` | `src/components/features/editor-v2/page-aivideos/steps/generate.tsx` | `pages/api/ai/personalize-script.ts` | — | OpenAI | PARTIAL | OpenAI client configured; script generation exists | Verify with valid API key |
| dynamic script/content | `/ai-videos` | `src/components/features/editor-v2/page-aivideos/steps/generate.tsx` | — | — | OpenAI | PARTIAL | Dynamic content generation exists; depends on OpenAI API | Verify personalization |
| lead-specific data | `/campaign` | `pages/campaign/steps/start.tsx` | — | `leads` | — | PARTIAL | Campaign step uses lead data; depends on leads table | Verify lead data in script |
| generated video | `/ai-videos` | `src/components/features/editor-v2/page-aivideos/index.tsx` | `pages/api/v1/videos/process.ts` | `ai_videos` | Muapi, OpenAI | PARTIAL | Video generation from personalized script exists | Verify end-to-end generation |

---

## Campaigns

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| create | `/campaign/steps/start` | `pages/campaign/steps/start.tsx` | — | `campaigns` (implied) | — | PARTIAL | Campaign creation UI exists; table reference unclear | Verify campaign record creation |
| edit | `/campaign` | `pages/campaign/index.tsx` | — | `campaigns` (implied) | — | PARTIAL | Campaign list exists; edit flow unclear | Verify edit flow |
| lead association | `/campaign` | `pages/campaign/steps/start.tsx` | — | `leads`, `campaigns` | — | PARTIAL | Lead selection exists; depends on leads table | Verify association |
| video association | `/campaign` | `pages/campaign/steps/start.tsx` | — | `videos`, `campaigns` | — | PARTIAL | Video selection exists | Verify association |
| campaign execution | `/campaign` | `pages/campaign/index.tsx` | — | `campaigns` | — | PARTIAL | Execution flow unclear; may depend on automation | Verify campaign sends |
| campaign status | `/campaign` | `pages/campaign/index.tsx` | — | `campaigns` | — | PARTIAL | Status display exists | Verify status tracking |

---

## Leads

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| create | `/leads` | `pages/leads/index.tsx` | `pages/api/v1/leads/index.ts` | `leads` | — | PARTIAL | Lead creation UI and API exist | Verify lead creation |
| import | `/leads` | `pages/leads/index.tsx` | — | `leads` | — | PARTIAL | CSV import via `react-papaparse` exists | Verify CSV import |
| list | `/leads` | `pages/leads/index.tsx` | `pages/api/v1/leads/index.ts` | `leads` | — | PARTIAL | Lead listing exists | Verify list loads |
| association | `/campaign` | `pages/campaign/steps/start.tsx` | — | `leads`, `campaigns` | — | PARTIAL | Lead-to-campaign association exists | Verify association |
| public capture | — | `pages/embed/player/[id].tsx`, `pages/embed/[id].tsx` | `pages/api/submissions/submit.ts` | `submissions`, `leads` | — | PARTIAL | Public embed pages capture leads via form submissions | Verify public capture flow |
| persistence | — | — | Multiple API routes | `leads` | — | PARTIAL | Leads persisted via Supabase insert | Verify persistence |

---

## Player

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| public video | `/embed/[id]`, `/embed/player/[id]` | `pages/embed/[id].tsx`, `pages/embed/player/[id].tsx` | — | `videos`, `ai_videos` | — | PARTIAL | Public embed pages exist; analytics tracking exists | Verify public video loads |
| playback | `/embed/player/[id]` | `pages/embed/player/[id].tsx` | — | — | react-player | PARTIAL | Uses `react-player` for playback | Verify playback |
| CTA | `/embed/player/[id]` | `pages/embed/player/[id].tsx`, `src/components/features/player/index.tsx` | — | — | — | PARTIAL | CTA elements rendered in player | Verify CTA display |
| forms | `/embed/player/[id]` | Player components | `pages/api/submissions/submit.ts` | `submissions` | — | PARTIAL | Form elements in player; submission API exists | Verify form submission |
| questions | `/embed/player/[id]` | Player components | — | — | — | PARTIAL | Question element type exists | Verify question rendering |
| calendar | `/embed/player/[id]` | Player components | — | — | Calendar URL | PARTIAL | Calendar CTA exists | Verify calendar link |
| tracking | `/embed/player/[id]` | `pages/embed/player/[id].tsx`, `pages/embed/[id].tsx` | — | `analytics` | — | PARTIAL | Analytics tracking on play/click/conversion exists | Verify tracking events |

---

## Analytics

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| views | `/analytics` | `pages/analytics/index.tsx` | — | `analytics` | — | PARTIAL | Analytics page queries `analytics` table; table added in migration | Verify view counts |
| plays | `/analytics` | `pages/analytics/index.tsx` | — | `analytics` | — | PARTIAL | Play tracking exists | Verify play events |
| clicks | `/analytics` | `pages/analytics/index.tsx` | — | `analytics` | — | PARTIAL | Click tracking exists | Verify click events |
| conversions | `/analytics` | `pages/analytics/index.tsx` | — | `analytics` | — | PARTIAL | Conversion tracking exists | Verify conversion events |
| leads | `/analytics` | `pages/analytics/index.tsx` | — | `analytics` | — | PARTIAL | Lead tracking exists | Verify lead events |
| feedback | `/analytics` | `pages/analytics/index.tsx` | — | `feedback` | — | PARTIAL | Feedback display exists | Verify feedback counts |
| dashboard metrics | `/dashboard` | `pages/dashboard/index.tsx` | — | `analytics`, `videos` | — | PARTIAL | Dashboard shows metrics; crashes on null state | Verify metrics render |

---

## Brand Kit

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| save | `/brand-kit` | `pages/brand-kit/index.tsx` | — | `brand_kit` | — | PARTIAL | Brand kit page exists; save flow exists | Verify save to DB |
| load | `/brand-kit` | `pages/brand-kit/index.tsx` | — | `brand_kit` | — | PARTIAL | Load from DB exists | Verify load |
| edit | `/brand-kit` | `pages/brand-kit/index.tsx` | — | `brand_kit` | — | PARTIAL | Edit UI exists | Verify edit persists |
| editor usage | `/editor` | `src/components/features/editor-v2/header/index.tsx` | — | `brand_kit` | — | PARTIAL | Brand kit used in editor header; has TypeScript errors | Verify brand assets load in editor |

---

## Comments / Feedback

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| create | `/comments` | `pages/comments/index.tsx` | `pages/api/feedback/submit.ts` | `feedback` | — | PARTIAL | Comment creation exists | Verify comment save |
| list | `/comments` | `pages/comments/index.tsx` | — | `feedback` | — | PARTIAL | Comment listing exists | Verify list loads |
| associate correctly | `/comments` | `pages/comments/index.tsx` | — | `feedback` | — | PARTIAL | Comments associated with video/user | Verify association |

---

## Settings

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| profile | `/settings` | `pages/settings/index.tsx` | — | `profiles` | — | PARTIAL | Settings page exists | Verify profile edit |
| workspace | `/settings` | `pages/settings/index.tsx` | — | `workspace` | — | PARTIAL | Workspace settings exist | Verify workspace edit |
| API keys | `/settings` | `pages/settings/index.tsx` | — | `apikey` | — | PARTIAL | API key generation UI exists | Verify key generation |
| integrations | `/integrations` | `pages/integrations/index.tsx` | — | — | — | PARTIAL | Integration catalog exists | Verify integration links |
| account settings | `/settings` | `pages/settings/index.tsx` | — | `profiles` | — | PARTIAL | Account settings exist | Verify account changes |

---

## Billing

| Feature | UI/Route | Frontend Files | Backend/API | Database | External Service | Status | Problem | Verification Needed |
|---------|----------|---------------|-------------|----------|-----------------|--------|---------|---------------------|
| Stripe dependency | — | `src/utils/load-stripe.ts` | — | `plan` | Stripe | BROKEN | `@stripe/stripe-js` is NOT in `package.json`; TypeScript error: "Cannot find module '@stripe/stripe-js'" | Install Stripe package or remove billing |
| pricing UI | `/pricing` | `src/components/common/pricing/table.tsx`, `pages/pricing/index.tsx` | — | `plan` | — | PARTIAL | Pricing table exists; has TypeScript errors (`router`, `frequency`) | Verify pricing renders |
| checkout | — | Not clearly implemented | — | `plan` | Stripe | DEAD LEGACY | No Stripe checkout route found; Stripe routes were deleted per `DEPLOYMENT_SETUP.md` | Verify no checkout flow |
| webhook | — | Not clearly implemented | — | `plan` | Stripe | DEAD LEGACY | No Stripe webhook route found; `DEPLOYMENT.md` references legacy `netlify/functions/stripe-webhook.ts` which does not exist | Verify no webhook |
| subscription state | — | `src/hooks/useUserPlan.ts`, `src/components/common/header/index.tsx` | — | `plan` | — | PARTIAL | Plan state loaded from `plan` table; TypeScript errors on `free_trial_start_date`, `status`, `free_trial_ended` | Verify plan state loads |
| credits | — | `pages/api/credits/deduct.ts` | `pages/api/credits/deduct.ts` | `plan` | — | PARTIAL | Credit deduction API exists; depends on plan limits | Verify credit checks |
| usage | — | `src/lib/usage.ts`, `pages/api/usage/log.ts` | `pages/api/usage/log.ts` | `usage` | — | PARTIAL | Usage logging exists; depends on `usage` table | Verify usage records |
| gating | — | `src/components/common/pricing/table.tsx`, `pages/api/credits/deduct.ts` | — | `plan` | — | PARTIAL | Plan gating exists; depends on plan limits | Verify gating blocks when exceeded |
| upgrades | — | Not clearly implemented | — | `plan` | Stripe | DEAD LEGACY | No upgrade flow found after Stripe removal | Verify no upgrade path |
| cancellations | — | Not clearly implemented | — | `plan` | Stripe | DEAD LEGACY | No cancellation flow found | Verify no cancellation path |

---

## Integrations

| Integration | Files | Status | Problem | Verification Needed |
|-------------|-------|--------|---------|---------------------|
| Brevo (email) | `pages/api/brevo/start-trial.ts`, `pages/api/mail/delete.ts`, `pages/api/mail/invite.ts`, `pages/api/mail/welcome.ts` | PARTIAL | Emails sent via Brevo SMTP/API; requires Brevo API key | Verify email delivery |
| Partnero (affiliate) | `src/services/api/partnero.ts`, `pages/auth/rockethub-signup.tsx`, `pages/auth/login.tsx`, `pages/_document.tsx` | PARTIAL | Partnero tracking script loaded; signup helper exists | Verify affiliate tracking |
| Zapier | `pages/automation/index.tsx`, `pages/integrations/index.tsx`, `global.d.ts` | PARTIAL | Zapier embed UI exists; client ID required | Verify Zapier embed loads |
| Muapi (AI generation) | `src/lib/muapi.ts`, `netlify/functions/*`, `supabase/functions/*`, `pages/api/v1/videos/*`, `src/services/aiClone.ts` | PARTIAL | Muapi is primary AI provider; requires `MUAPI_API_KEY`; dual-path with stub fallback | Verify Muapi connectivity |
| OpenAI (scripts/TTS) | `src/lib/openai.ts`, `src/services/aiClone.ts`, `netlify/functions/*`, `supabase/functions/*` | PARTIAL | OpenAI used for script gen and TTS; requires `OPENAI_API_KEY` | Verify OpenAI connectivity |
| Supabase (auth/storage/db) | `src/services/*`, `netlify/functions/*`, `supabase/functions/*`, `pages/api/*` | PARTIAL | Supabase is core stack; multiple client implementations; schema may be missing tables | Verify Supabase connectivity |
| Netlify (hosting/functions) | `netlify.toml`, `netlify/functions/*`, `package.json` | PARTIAL | Netlify configured as hosting; functions deployed | Verify Netlify deployment |
| PostHog (analytics) | `package.json` | PARTIAL | `posthog-js` installed; initialization not verified | Verify PostHog initialization |
| Usetiful (UX) | `pages/videos/index.tsx` | PARTIAL | Usetiful script loaded dynamically; token required | Verify Usetiful loads |
| Cloudinary (legacy) | `DEPLOYMENT.md`, `src/utils/videoTransform.ts` | DEAD LEGACY | Cloudinary referenced in docs and transform utility; replaced by Supabase Storage | Verify no active Cloudinary usage |
| S3 Upload (legacy) | `pages/api/s3-upload.ts`, `src/components/features/editor-v2/header/image-preview.tsx` | DEAD LEGACY | `next-s3-upload` still in package.json but S3 route is legacy; Supabase Storage is current | Verify no active S3 uploads |

---

## Summary Counts

| Status | Count |
|--------|-------|
| WORKING | 0 |
| BROKEN | 4 |
| PARTIAL | 56 |
| STUB | 2 |
| DEAD LEGACY | 5 |
| NOT TESTED | 0 |
| BLOCKED BY CREDENTIAL | 0 |
| NOT APPLICABLE | 3 |

**Note:** Most features are classified as PARTIAL because the code exists and has a defined path, but runtime verification is blocked by:
- Missing or broken Supabase schema in live database
- TypeScript compilation errors preventing clean builds
- Missing API keys (Muapi, OpenAI, Brevo, etc.)
- Multiple Supabase client implementation issues
- Null state crashes on authenticated pages

---

*End of completion audit.*
