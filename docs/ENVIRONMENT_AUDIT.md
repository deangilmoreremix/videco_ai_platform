# VidecoAI Environment Audit

**Date:** 2026-09-15  
**Branch:** stabilize/videco-completion-audit-2026-09-15  
**SHA:** fd20195b6a3de8e95f26f34012d01cc44afa4c24  

---

## Environment Files

| File | Status | Notes |
|------|--------|-------|
| `.env.example` | Present | Primary documentation |
| `env.example` | Present | **DUPLICATE** of `.env.example` with slight differences |
| `.env.local` | Present | Contains actual secrets (not audited) |
| `DEPLOYMENT.md` | Present | Documents required variables |
| `DEPLOYMENT_SETUP.md` | Present | Additional deployment docs |
| `README.MD` | Present | May reference env vars |

---

## Environment Variable Inventory

### Supabase

| Variable | Required | Client/Server | Files Using It | Documented | Duplicated | Legacy | What Breaks If Missing |
|----------|----------|---------------|----------------|------------|------------|--------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | YES | Client + Server | `src/services/supabase.ts`, `src/services/index.ts`, `pages/_app.tsx`, `src/lib/storage.ts`, `pages/clones/create.tsx`, `pages/api/v1/videos/process.ts`, `pages/api/usage/log.ts` | ✅ `.env.example` | ✅ Also `SUPABASE_URL` | No | App cannot initialize Supabase client; auth and all DB queries fail |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | YES | Client + Server | `src/services/supabase.ts`, `src/services/index.ts`, `pages/_app.tsx`, `src/lib/storage.ts`, `pages/clones/create.tsx`, `pages/api/usage/log.ts` | ✅ `.env.example` | ✅ Also `SUPABASE_ANON_KEY` | No | App cannot initialize Supabase client; auth and all DB queries fail |
| `SUPABASE_SERVICE_ROLE_KEY` | YES | Server | `src/lib/storage.ts`, `pages/api/usage/log.ts`, `netlify/functions/*`, `pages/api/v1/videos/process.ts` | ✅ `.env.example` | — | No | Server-side operations that bypass RLS fail (storage, usage log, Netlify functions) |
| `SUPABASE_URL` | YES | Server | `netlify/functions/*` | ✅ `.env.example` | ✅ Also `NEXT_PUBLIC_SUPABASE_URL` | No | Netlify functions cannot create Supabase client |
| `SUPABASE_STORAGE_BUCKET` | YES | Client + Server | `src/lib/storage.ts` | ✅ `.env.example` | — | No | Storage uploads fail; defaults may apply |

### OpenAI

| Variable | Required | Client/Server | Files Using It | Documented | Duplicated | Legacy | What Breaks If Missing |
|----------|----------|---------------|----------------|------------|------------|--------|----------------------|
| `OPENAI_API_KEY` | YES | Server | `src/lib/openai.ts`, `src/services/aiClone.ts`, `netlify/functions/*`, `supabase/functions/*` | ✅ `.env.example` | — | No | Script generation, TTS, and personalization fail |
| `OPENAI_REALTIME_MODEL` | NO | Server | `src/lib/openai.ts` | ✅ `.env.example` | — | No | Falls back to `gpt-4o-realtime-preview` |
| `OPENAI_MODEL_FOR_SCRIPTS` | NO | Server | `src/lib/openai.ts` | ✅ `.env.example` | — | No | Falls back to `gpt-4o` |

### Muapi

| Variable | Required | Client/Server | Files Using It | Documented | Duplicated | Legacy | What Breaks If Missing |
|----------|----------|---------------|----------------|------------|------------|--------|----------------------|
| `MUAPI_API_KEY` | YES | Server | `src/lib/muapi.ts`, `src/services/aiClone.ts`, `netlify/functions/*` | ✅ `.env.example` | — | No | All AI video/image generation fails; falls back to stub or errors |
| `MUAPI_WEBHOOK_SECRET` | NO | Server | `src/lib/muapi.ts`, `pages/api/webhooks/muapi.ts` | ✅ `.env.example` | — | No | Webhook signature verification skipped with warning |
| `MUAPI_LIPSYNC_MODEL` | NO | Server | `src/services/aiClone.ts` | ✅ `.env.example` | — | No | Falls back to `sd-2-omni-reference` |
| `NEXT_PUBLIC_USE_MUAPI_AI` | NO | Client | `pages/api/v1/videos/process.ts`, `pages/api/v1/videos/clone.ts` | ✅ `.env.example` | ✅ Also `USE_MUAPI_AI` | No | If not `"true"`, falls back to stub mode |
| `NEXT_PUBLIC_MUAPI_AI` | NO | Client | — | ✅ `.env.example` | — | No | Not used in code; safe to remove |
| `USE_MUAPI_AI` | NO | Server | `pages/api/v1/videos/process.ts`, `pages/api/v1/videos/clone.ts` | ✅ `.env.example` | ✅ Also `NEXT_PUBLIC_USE_MUAPI_AI` | No | If not `"true"`, falls back to stub mode |

**⚠️ CRITICAL:** Both `NEXT_PUBLIC_USE_MUAPI_AI` and `USE_MUAPI_AI` control the same flag. If neither is `"true"`, AI operations return `success: true` with `mode: "stub"` — a fake success path.

### Site / App

| Variable | Required | Client/Server | Files Using It | Documented | Duplicated | Legacy | What Breaks If Missing |
|----------|----------|---------------|----------------|------------|------------|--------|----------------------|
| `NEXT_PUBLIC_SITE_URL` | YES | Client | `pages/_app.tsx`, redirects | ✅ `.env.example` | — | No | Auth redirects and webhook URLs may be wrong |
| `NEXT_PUBLIC_APP_ENV` | NO | Client | `pages/_app.tsx` | ✅ `.env.example` | — | No | No functional break; used for environment detection |
| `NODE_ENV` | Auto | Both | `src/lib/muapi.ts`, `src/lib/openai.ts` | Not in `.env.example` | — | No | No break; standard Next.js variable |

### Analytics / Tracking / UX

| Variable | Required | Client/Server | Files Using It | Documented | Duplicated | Legacy | What Breaks If Missing |
|----------|----------|---------------|----------------|------------|------------|--------|----------------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | NO | Client | `pages/_app.tsx` | ✅ `.env.example` | — | No | PostHog analytics disabled |
| `NEXT_PUBLIC_USETIFUL_TOKEN` | NO | Client | `pages/videos/index.tsx`, `pages/dashboard/index.tsx`, `pages/campaign/index.tsx`, `pages/invite/index.tsx`, `src/components/common/create/new.tsx`, `pages/clones/index.tsx` | ✅ `.env.example` | — | No | Usetiful UX tool disabled |
| `NEXT_PUBLIC_CRISP_WEBSITE_ID` | NO | Client | `pages/_app.tsx`, `pages/support/index.tsx` | ✅ `.env.example` | — | No | Crisp chat disabled |
| `NEXT_PUBLIC_PRODUCTLIFT_SIDEBAR_ID` | NO | Client | `src/components/common/header/index.tsx` | ✅ `.env.example` | — | No | ProductLift sidebar disabled |
| `NEXT_PUBLIC_PRODUCTLIFT_WIDGET_ID` | NO | Client | — | ✅ `.env.example` | — | No | ProductLift widget disabled |

### Integrations

| Variable | Required | Client/Server | Files Using It | Documented | Duplicated | Legacy | What Breaks If Missing |
|----------|----------|---------------|----------------|------------|------------|--------|----------------------|
| `NEXT_PUBLIC_CALENDAR_BOOKING_URL` | NO | Client | `pages/campaign/index.tsx` | ✅ `.env.example` | — | No | Calendar CTA link missing |
| `NEXT_PUBLIC_SLACK_INVITE_URL` | NO | Client | `src/components/common/sidebar/index.tsx` | ✅ `.env.example` | — | No | Slack invite link missing |
| `NEXT_PUBLIC_ZAPIER_CLIENT_ID` | NO | Client | `pages/automation/index.tsx` | ✅ `.env.example` | — | No | Zapier embed fails |
| `NEXT_PUBLIC_UPLOAD_CLIENT_KEY` | NO | Client | — | ✅ `.env.example` | — | No | Not used in code; safe to remove |
| `BREVO_KEY` | YES | Server | `pages/api/brevo/start-trial.ts` | ❌ `.env.example` | — | No | Trial registration email fails |
| `BREVO_SECRET_KEY` | YES | Server | `pages/api/brevo/start-trial.ts` | ❌ `.env.example` | — | No | Brevo API authentication fails |
| `BREVO_API_KEY` | YES | Server | `pages/api/mail/delete.ts`, `pages/api/mail/invite.ts`, `pages/api/mail/welcome.ts` | ❌ `.env.example` | ✅ Also `BREVO_KEY` | No | Email sending fails |
| `VIDECO_SECRET_KEY` | YES | Server | `pages/api/submissions/submit.ts`, `pages/api/v1/leads/index.ts`, `pages/api/feedback/submit.ts`, `pages/api/mail/invite.ts`, `pages/api/mail/welcome.ts`, `pages/api/mail/delete.ts`, `src/services/api/stripe-event.ts`, `src/services/api/sendEmail.ts`, `src/services/api/startTrial.ts`, `src/services/api/submitFormData.ts` | ✅ `.env.example` | — | No | Internal API authentication fails |
| `FEEDBACK_SECRET_KEY` | YES | Server | `pages/api/feedback/submit.ts` | ✅ `.env.example` | — | No | Feedback submission auth fails |
| `WEBHOOK_SECRET` | YES | Server | `pages/api/webhooks/sync.ts` | ✅ `.env.example` | — | No | Sync webhook auth fails |
| `WEBHOOK_SHARED_SECRET` | NO | Server | `netlify/functions/api.ts` | ✅ `.env.example` | — | No | Netlify function webhook auth fails |

### Storage (Legacy S3)

| Variable | Required | Client/Server | Files Using It | Documented | Duplicated | Legacy | What Breaks If Missing |
|----------|----------|---------------|----------------|------------|------------|--------|----------------------|
| `S3_UPLOAD_KEY` | NO | Server | — | ❌ `.env.example` (only in `env.example`) | — | YES | S3 uploads fail; Supabase Storage is current |
| `S3_UPLOAD_SECRET` | NO | Server | — | ❌ `.env.example` (only in `env.example`) | — | YES | S3 uploads fail |
| `S3_UPLOAD_BUCKET` | NO | Server | — | ❌ `.env.example` (only in `env.example`) | — | YES | S3 uploads fail |
| `S3_UPLOAD_REGION` | NO | Server | — | ❌ `.env.example` (only in `env.example`) | — | YES | S3 uploads fail |

### Legacy / Transitional

| Variable | Required | Client/Server | Files Using It | Documented | Duplicated | Legacy | What Breaks If Missing |
|----------|----------|---------------|----------------|------------|------------|--------|----------------------|
| `NEXT_PUBLIC_RECORDING_URL` | NO | Client | `pages/recording/index.tsx` | ✅ `.env.example` | — | YES | Recording embed falls back to localhost:5173 |
| `SCREENSHOTONE_API_KEY` | NO | Server | — | ✅ `.env.example` | — | YES | No break; not used in code |
| `INTERNAL_FUNCTION_SECRET` | NO | Server | `netlify/functions/ai-orchestrator.ts` | ✅ `.env.example` | — | YES | Internal function auth may be weaker |
| `WEBHOOK_SHARED_SECRET` | NO | Server | `netlify/functions/api.ts` | ✅ `.env.example` | — | YES | Webhook auth falls back to empty string |

### Stripe (Removed but Referenced)

| Variable | Required | Client/Server | Files Using It | Documented | Duplicated | Legacy | What Breaks If Missing |
|----------|----------|---------------|----------------|------------|------------|--------|----------------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | YES | Client | `src/utils/load-stripe.ts` | ❌ `.env.example` | — | YES | TypeScript error: cannot find `@stripe/stripe-js` module; no Stripe routes exist |
| `STRIPE_SECRET_KEY` | YES | Server | — | ❌ `.env.example` | — | YES | No Stripe code uses it |
| `STRIPE_WEBHOOK_SECRET` | YES | Server | — | ❌ `.env.example` | — | YES | No Stripe webhook exists |

---

## Discrepancies Between `.env.example` and `env.example`

| Variable | In `.env.example` | In `env.example` | Notes |
|----------|-------------------|------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | Same |
| `SUPABASE_URL` | ✅ | ✅ | Same |
| `SUPABASE_STORAGE_BUCKET` | ✅ | ✅ | Same |
| `OPENAI_API_KEY` | ✅ | ✅ | Same |
| `OPENAI_REALTIME_MODEL` | ✅ | ✅ | Same |
| `OPENAI_MODEL_FOR_SCRIPTS` | ✅ | ✅ | Same |
| `MUAPI_API_KEY` | ✅ | ✅ | Same |
| `MUAPI_WEBHOOK_SECRET` | ✅ | ✅ | Same |
| `MUAPI_LIPSYNC_MODEL` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_USE_MUAPI_AI` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_MUAPI_AI` | ✅ | ✅ | Same |
| `USE_MUAPI_AI` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_SITE_URL` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_APP_ENV` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_POSTHOG_KEY` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_USETIFUL_TOKEN` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_CALENDAR_BOOKING_URL` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_SLACK_INVITE_URL` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_CRISP_WEBSITE_ID` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_PRODUCTLIFT_SIDEBAR_ID` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_PRODUCTLIFT_WIDGET_ID` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_ZAPIER_CLIENT_ID` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_UPLOAD_CLIENT_KEY` | ✅ | ✅ | Same |
| `VIDECO_SECRET_KEY` | ✅ | ✅ | Same |
| `FEEDBACK_SECRET_KEY` | ✅ | ✅ | Same |
| `WEBHOOK_SECRET` | ✅ | ✅ | Same |
| `NEXT_PUBLIC_RECORDING_URL` | ✅ | ✅ | Same |
| `SCREENSHOTONE_API_KEY` | ✅ | ✅ | Same |
| `INTERNAL_FUNCTION_SECRET` | ✅ | ✅ | Same |
| `WEBHOOK_SHARED_SECRET` | ✅ | ✅ | Same |
| `S3_UPLOAD_KEY` | ❌ | ✅ | **Only in `env.example`** |
| `S3_UPLOAD_SECRET` | ❌ | ✅ | **Only in `env.example`** |
| `S3_UPLOAD_BUCKET` | ❌ | ✅ | **Only in `env.example`** |
| `S3_UPLOAD_REGION` | ❌ | ✅ | **Only in `env.example`** |
| `BREVO_KEY` | ❌ | ❌ | Not in either; used in code |
| `BREVO_SECRET_KEY` | ❌ | ❌ | Not in either; used in code |
| `BREVO_API_KEY` | ❌ | ❌ | Not in either; used in code |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ❌ | ❌ | Not in either; used in code |
| `STRIPE_SECRET_KEY` | ❌ | ❌ | Not in either; used in code |
| `STRIPE_WEBHOOK_SECRET` | ❌ | ❌ | Not in either; used in code |

---

## Fake/Stub Success Paths Triggered by Environment

| Flag | Path | Behavior |
|------|------|----------|
| `NEXT_PUBLIC_USE_MUAPI_AI !== "true"` AND `USE_MUAPI_AI !== "true"` | `pages/api/v1/videos/process.ts`, `pages/api/v1/videos/clone.ts` | Returns `{ success: true, mode: "stub", job_id }` — creates DB row but performs no AI work |
| `MUAPI_API_KEY` missing | `src/lib/muapi.ts` | Logs warning; all Muapi calls will fail with 401 |
| `OPENAI_API_KEY` missing | `src/lib/openai.ts` | Logs warning; all OpenAI calls will fail with 401 |
| `MUAPI_WEBHOOK_SECRET` missing | `src/lib/muapi.ts`, `pages/api/webhooks/muapi.ts` | Skips signature verification with warning |
| `NEXT_PUBLIC_ALLOW_ANON === "true"` | `pages/_app.tsx` | Allows unauthenticated access to app |

---

## Recommended Cleanup

1. **Consolidate** `.env.example` and `env.example` into a single file.
2. **Remove** S3 variables (`S3_UPLOAD_*`) — Supabase Storage is the current owner.
3. **Remove** Stripe variables — Stripe routes and dependencies are gone.
4. **Remove** `NEXT_PUBLIC_MUAPI_AI` — not used in code.
5. **Remove** `NEXT_PUBLIC_UPLOAD_CLIENT_KEY` — not used in code.
6. **Add** missing Brevo variables (`BREVO_KEY`, `BREVO_SECRET_KEY`, `BREVO_API_KEY`).
7. **Unify** `NEXT_PUBLIC_USE_MUAPI_AI` and `USE_MUAPI_AI` into a single server-side flag.
8. **Document** that `NEXT_PUBLIC_ALLOW_ANON=true` bypasses auth guards.

---

*End of environment audit.*
