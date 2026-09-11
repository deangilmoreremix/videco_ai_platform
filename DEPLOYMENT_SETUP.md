# Deployment & Environment Setup — VidecoAI

This guide gets the VidecoAI app from this repo running end-to-end against the new stack:

- **Supabase** — Auth + Postgres + Storage + Edge Functions
- **Netlify** — Hosting (Next.js) + Functions (`netlify/functions/api.ts`)
- **Muapi** (`api.muapi.ai`) — AI video / image / audio generation
- **OpenAI** — TTS (`tts-1`) + script generation (Chat / Responses API)

Code wiring is complete and `next build` passes. The only remaining blocker is that
`.env.local` ships with **placeholder secrets**, so at runtime the AI bridge
(`pages/api/v1/videos/process.ts` → `{NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-orchestrator`)
fails. Replace the placeholders below and you get a working app.

> All paths below are relative to the repo root.

---

## 1. Environment Variables Inventory

Source of truth: `.env.local`. Cross-checked against the code that reads each var:

- `netlify/functions/api.ts` → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MUAPI_API_KEY`, `OPENAI_API_KEY`, `WEBHOOK_SHARED_SECRET`
- `supabase/functions/ai-orchestrator/index.ts` → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MUAPI_API_KEY`, `OPENAI_API_KEY`, `MUAPI_WEBHOOK_SECRET`, `INTERNAL_FUNCTION_SECRET`
- `src/lib/muapi.ts` → `MUAPI_API_KEY`, `MUAPI_WEBHOOK_SECRET`
- `src/lib/openai.ts` → `OPENAI_API_KEY`, `OPENAI_MODEL_FOR_SCRIPTS`, `OPENAI_REALTIME_MODEL`
- `src/lib/storage.ts` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### (a) Already meaningful (no change needed for local dev)

| Variable | Current value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:54321` | Local Supabase URL from `supabase start`. Swap for cloud URL in prod. |
| `SUPABASE_URL` | `http://localhost:54321` | Server-side Supabase URL (used by Netlify fn + edge fn). Must match the above. |
| `SUPABASE_STORAGE_BUCKET` | `user-uploads` | Storage bucket name. Must exist in Supabase Storage. |
| `NEXT_PUBLIC_USE_MUAPI_AI` | `true` | Enables the Muapi/edge-function AI path in `pages/api/v1/videos/process.ts`. |
| `USE_MUAPI_AI` | `true` | Server-side mirror of the above. |
| `MUAPI_LIPSYNC_MODEL` | `sd-2-omni-reference` | Default lipsync/omni model used by the edge orchestrator. |
| `OPENAI_MODEL_FOR_SCRIPTS` | `gpt-4o` | Default model for script generation. |
| `OPENAI_REALTIME_MODEL` | `gpt-4o-realtime-preview` | Realtime API model (client-side feature). |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | App public URL. |
| `NEXT_PUBLIC_APP_ENV` | `development` | App environment flag. |
| `NEXT_PUBLIC_RECORDING_URL` | `http://localhost:5173` | Recording app URL (legacy/transitional). |

### (b) Placeholder — MUST be replaced

| Variable | Placeholder | What it is | Where to get it |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_supabase_anon_key` | Supabase **anon / public** key. | Supabase: `supabase start` prints it locally, or Project Settings → API → `anon public` key in cloud. |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_supabase_service_role_key` | Supabase **service_role** key (bypasses RLS). Server-only — never expose to the client. | `supabase start` prints it; or Project Settings → API → `service_role` key. |
| `OPENAI_API_KEY` | `sk-your_openai_api_key` | OpenAI API key (TTS + Chat/Responses access). | https://platform.openai.com/api-keys — key needs TTS (`tts-1`) + chat/model access. |
| `MUAPI_API_KEY` | `your_muapi_api_key` | Muapi API key (auth header `x-api-key`). | https://muapi.ai dashboard → API keys. |
| `MUAPI_WEBHOOK_SECRET` | `your_muapi_webhook_secret` | Shared secret to verify Muapi webhook signatures (HMAC-SHA256). | Generate: `openssl rand -hex 32`. Also set on Muapi side if they sign payloads. |
| `WEBHOOK_SHARED_SECRET` | _(empty)_ | Shared secret checked against the `x-muapi-webhook-secret` header in `netlify/functions/api.ts` (webhooks route). | Generate: `openssl rand -hex 32`. Must match what Muapi sends. |
| `INTERNAL_FUNCTION_SECRET` | _(empty)_ | Internal secret the edge function accepts as `x-internal-secret` for non-webhook auth. | Generate: `openssl rand -hex 32`. Optional but recommended. |

### (c) Missing / optional — required only if you use those features

These are **empty** in `.env.local`. None are read by the core AI/video flow, but
several are referenced by code paths; fill them if/when you wire the feature back in.

| Variable | Read by | Status |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client auth (see above) | Already listed in (b). |
| `VIDEOCO_SECRET_KEY` | (legacy) | Optional. |
| `FEEDBACK_SECRET_KEY` | (legacy feedback) | Optional. |
| `S3_UPLOAD_KEY` / `S3_UPLOAD_SECRET` / `S3_UPLOAD_BUCKET` / `S3_UPLOAD_REGION` | S3 uploads | Optional — Supabase Storage is the current path. |
| `NEXT_PUBLIC_UPLOAD_CLIENT_KEY` | upload widget | Optional. |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_USETIFUL_TOKEN`, `NEXT_PUBLIC_CRISP_WEBSITE_ID`, `NEXT_PUBLIC_PRODUCTLIFT_*`, `NEXT_PUBLIC_ZAPIER_CLIENT_ID`, `NEXT_PUBLIC_CALENDAR_BOOKING_URL`, `NEXT_PUBLIC_SLACK_INVITE_URL`, `SCREENSHOTONE_API_KEY` | Analytics / 3rd-party widgets | All optional; safe to leave blank. |
| `NEXT_PUBLIC_MUAPI_AI` | (empty) | Unused override; leave blank. |
| **Stripe keys** (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, etc.) | _none_ | **Not required.** Stripe routes were deleted during migration; payments are not wired. Re-add later if needed. |

---

## 2. Database Setup (Supabase)

The functions expect these tables (verified as created by `supabase/migrations/*.sql`):
`jobs`, `videos`, `ai_videos`, `usage`, `scripts`, `leads`, `submissions`, `feedback`,
`images`, `audios`, `profiles`, `storyboard_projects`, `storyboard_characters`,
`storyboard_episodes`, `storyboard_shots`, `tenants`, `brand_kit`.

> If you see a "relation does not exist" error at runtime for any table above, that
> migration did not apply — run the migration steps below (or add the missing table
> via a new migration) and re-deploy the edge function.

### Local (recommended for dev)

```bash
# 1. Install the Supabase CLI if you haven't:
#    brew install supabase/tap/supabase  (macOS)  OR  npm i -g supabase

# 2. (only if not already a Supabase project)
supabase init

# 3. Start local stack (Postgres on :54322, API+Studio on :54321, etc.)
supabase start
#    -> prints NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
#       (already set in .env.local for localhost:54321)

# 4. Apply all migrations (creates the tables listed above)
supabase db push
#    OR, to apply migrations one-by-one in order:
supabase migration up

# 5. (Optional) Seed data — note: supabase/seed.sql is currently EMPTY,
#    so this is a no-op until you add rows:
supabase seed
```

Copy the anon + service_role keys from `supabase start` output into `.env.local`
if they differ from the placeholders already there.

### Cloud (Supabase project)

```bash
# Link to your cloud project
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase db push

# Get keys from: Project Settings → API
#   - NEXT_PUBLIC_SUPABASE_URL      = https://<project-ref>.supabase.co
#   - NEXT_PUBLIC_SUPABASE_ANON_KEY = anon public key
#   - SUPABASE_URL                  = https://<project-ref>.supabase.co
#   - SUPABASE_SERVICE_ROLE_KEY     = service_role key
```

Update both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL` in `.env.local` to the
cloud URL for production.

---

## 3. Edge Function Deploy (Supabase)

The orchestrator at `supabase/functions/ai-orchestrator/index.ts` does the real AI work
(clone / process / personalize-script / poll / muapi-webhook). It reads its secrets
from **Supabase secrets**, not `.env.local`.

```bash
# Deploy the function
supabase functions deploy ai-orchestrator

# Set the secrets the function reads (Deno.env.get):
supabase secrets set \
  MUAPI_API_KEY=<your-muapi-api-key> \
  OPENAI_API_KEY=<your-openai-api-key> \
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
  MUAPI_WEBHOOK_SECRET=<your-muapi-webhook-secret> \
  INTERNAL_FUNCTION_SECRET=<your-internal-function-secret>

# Optional but recommended: also expose SUPABASE_URL to the function
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
```

> The function uses `Deno.env.get("SUPABASE_URL")`. When deployed to a Supabase
> project this is provided automatically; for local testing with `supabase functions
> serve` you may need to pass it.

### Register the Muapi webhook

Point Muapi's webhook callback at the deployed function so generation results are
written back to the DB automatically (recommended over manual polling):

```
https://<project-ref>.supabase.co/functions/v1/ai-orchestrator
```

Configure Muapi to send `action=muapi-webhook` in the body (the function switches on
`payload.action`). If Muapi signs payloads, set `MUAPI_WEBHOOK_SECRET` to match the
value used on the Muapi side so signature verification passes
(`src/lib/muapi.ts` / `ai-orchestrator` HMAC-SHA256 check).

---

## 4. Netlify Deploy (Hosting + Functions)

`netlify.toml` already routes Next.js and forwards `/functions/v1/api/*` →
`/.netlify/functions/api` (and sibling routes for auth/images/jobs/leads/videos and
the `webhooks/muapi` → `ai-orchestrator` redirect).

### Local

```bash
# Run Netlify Functions + Next.js dev together
netlify dev
#    -> serves the app on http://localhost:3000 (per [dev] in netlify.toml)
```

### Production

```bash
# Deploy (CLI)
netlify deploy --prod

# Or connect the repo in the Netlify dashboard; build command is already
# set: `yarn build`, publish dir `.next`.
```

### Netlify environment variables

The Netlify function (`netlify/functions/api.ts`) reads secrets from the environment.
Set these in the **Netlify dashboard → Site settings → Environment variables** (they
are auto-injected into the function at runtime — you do NOT put them in a separate
`.env` for the function):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MUAPI_API_KEY`
- `OPENAI_API_KEY`
- `WEBHOOK_SHARED_SECRET` (must match what Muapi sends on the `/webhooks/muapi` route)

These should mirror the same real values you set for Supabase/local. The Next.js app
itself still reads `NEXT_PUBLIC_*` values from `.env.local` / Netlify build env.

---

## 5. Local Dev Happy Path

```bash
# 1. Install deps
yarn install

# 2. Make sure .env.local has REAL values for:
#      NEXT_PUBLIC_SUPABASE_URL   (http://localhost:54321 for local)
#      SUPABASE_URL               (http://localhost:54321 for local)
#      NEXT_PUBLIC_SUPABASE_ANON_KEY
#      SUPABASE_SERVICE_ROLE_KEY
#      MUAPI_API_KEY
#      OPENAI_API_KEY
#      NEXT_PUBLIC_USE_MUAPI_AI=true   (already set)
#      USE_MUAPI_AI=true               (already set)
#    Generate the webhook/internal secrets if you use webhooks:
#      WEBHOOK_SHARED_SECRET=$(openssl rand -hex 32)
#      MUAPI_WEBHOOK_SECRET=$(openssl rand -hex 32)
#      INTERNAL_FUNCTION_SECRET=$(openssl rand -hex 32)

# 3. Start Supabase locally (creates DB + keys)
supabase start

# 4. Apply migrations
supabase db push

# 5. Run the app
yarn dev
#    -> http://localhost:3000  (Next.js; Netlify dev uses 3000 too)
```

Open `http://localhost:3000`, sign up / log in (Supabase Auth), and you're in.

---

## 6. Verification

1. **Auth works** — Visit `/dashboard`. If you're redirected to login, Supabase Auth
   is wired correctly. Create an account (the `auth/signup` route also writes a
   `profiles` row).
2. **AI bridge fires** — From the app, trigger a clone/process (a `videos/process`
   or `videos/clone` action). `pages/api/v1/videos/process.ts` will POST to
   `{NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-orchestrator` with `action=process` /
   `clone`. You should get back `{ success: true, mode: "muapi", result: {...} }`.
3. **Job is recorded** — In the Supabase dashboard (or `supabase db` / SQL), check the
   `jobs` table: a row with `status` `processing`/`in_progress` should appear, then
   move to `completed` once Muapi + the edge function finish (via webhook or poll).
4. **Edge function logs** — Watch the orchestrator:
   ```bash
   supabase functions logs ai-orchestrator
   ```
   You should see `[ai-orchestrator] received action: process` (etc.) and no
   `Unauthorized` / `OPENAI_KEY` / `MUAPI_KEY` errors.
5. **Netlify function (alt path)** — If you exercise the Netlify routes
   (`/.netlify/functions/api`), confirm rows land in `videos`/`images`/`audios`/`jobs`
   and no `401 Invalid webhook secret` appears on the webhook route.

If you see `Unauthorized` from the edge function, the auth header isn't carrying the
service role key or `INTERNAL_FUNCTION_SECRET` / `x-muapi-webhook` isn't set. If you
see `Muapi submit failed`, the `MUAPI_API_KEY` is wrong. If scripts/TTS 500, the
`OPENAI_API_KEY` is wrong or lacks TTS access.

---

## 7. Known Gaps / Next Steps

- **Stripe not wired.** All Stripe routes/pages were deleted during the migration.
  There is no payments/billing flow. Re-add later if required; no Stripe env vars are
  needed today.
- **Placeholder secrets.** `MUAPI_API_KEY` and `OPENAI_API_KEY` (and the Supabase
  keys) are placeholders in the committed `.env.local`. The app cannot generate AI
  content until real keys are supplied (this doc, sections 1–5).
- **Edge function Deno compatibility.** `supabase/functions/ai-orchestrator/index.ts`
  is a Deno-served function. It imports `jsr:@supabase/supabase-js@2` and Node's
  `crypto`. If `supabase functions deploy` surfaces Deno type/runtime issues, verify
  the imports resolve under the project's Deno version and that `SUPABASE_URL` is
  available to the function. No specific breakage is claimed here — validate on first
  deploy via `supabase functions logs ai-orchestrator`.
- **Empty seed.** `supabase/seed.sql` is empty; `supabase seed` is currently a no-op.
- **Webhook secret mismatch risk.** `WEBHOOK_SHARED_SECRET` (Netlify route) and
  `MUAPI_WEBHOOK_SECRET` (edge function) are independent. Ensure each matches what
  Muapi actually sends, or webhook verification will reject callbacks.
- **`NEXT_PUBLIC_MUAPI_AI` is blank and unused** — leave as-is; the effective switch
  is `NEXT_PUBLIC_USE_MUAPI_AI=true`.
