# VEDECO -> Netlify + Supabase Migration Guide

## Overview

This migration replaces the Next.js API routes with a serverless architecture powered by Netlify Functions and Supabase Edge Functions.

## Architecture

### Netlify Functions (`netlify/functions/`)
- `app.ts` — Main API router handling all `/api/*` routes (all existing API logic consolidated here)
- `inngest.ts` — Inngest workflow definitions for AI video processing

### Standalone utility (optional)
- `proxy.ts` — External API proxy for OpenAI, Mux, Sync.so (can be called via `/api/proxy`)

### Supabase Edge Functions (`supabase/functions/`)
- `video/index.ts` — Multi-tenant video operations
- `image/index.ts` — Multi-tenant image operations
- `auth/index.ts` — Auth event sink
- `leads/index.ts` — Leads CRUD with tenant isolation
- `submissions/index.ts` — Form submissions with tenant isolation
- `videos/index.ts` — Video CRUD with tenant isolation

### Supabase Migrations
- `supabase/migrations/20240101_tenant_isolation.sql` — Multi-tenancy RLS policies

## Feature Mapping

| Feature | Old Path | New Handler |
|---------|----------|-------------|
| AI Video Intro | `POST /api/v1/videos/create-intro` | `app.ts` -> Inngest `ai/intro` |
| AI Video Process | `POST /api/v1/videos/process` | `app.ts` -> Inngest `ai/process` |
| AI Video Clone | `POST /api/v1/videos/clone` | `app.ts` -> Inngest `ai/clone` |
| AI Video Onboarding | `POST /api/v1/videos/onboarding` | `app.ts` -> Inngest `ai/onboarding` |
| Cloudinary Upload | `POST /api/v1/videos/cloudinary` | `app.ts` -> Cloudinary Direct |
| Mux Preview | `POST /api/v1/videos/create-preview` | `app.ts` -> Mux API |
| Clone Status | `POST /api/v1/videos/get-clone` | `app.ts` -> Sync.so |
| Upload Endpoint | `POST /api/v1/videos/endpoint` | `app.ts` -> Mux Upload |
| Video List | `GET /api/v1/videos` | `app.ts` -> Supabase |
| Stripe Webhooks | `POST /api/stripe/webhook` | `app.ts` -> Stripe SDK |
| Stripe Checkout | `POST /api/stripe/checkout` | `app.ts` -> Stripe SDK |
| Stripe Portal | `POST /api/stripe/portal` | `app.ts` -> Stripe SDK |
| Stripe Customer | `POST /api/stripe/customer` | `app.ts` -> Stripe SDK |
| Credits Deduct | `POST /api/credits/deduct` | `app.ts` -> Supabase |
| Mail Invite | `POST /api/mail/invite` | `app.ts` -> Brevo |
| Mail Welcome | `POST /api/mail/welcome` | `app.ts` -> Brevo |
| Mail Delete | `POST /api/mail/delete` | `app.ts` -> Brevo |
| Feedback Submit | `POST /api/feedback/submit` | `app.ts` -> Supabase |
| Form Submission | `POST /api/v1/submissions` | `app.ts` -> Supabase |
| File Upload | `POST /api/upload` | `app.ts` -> Supabase Storage |
| Brevo Start Trial | `POST /api/brevo/start-trial` | `app.ts` -> Brevo Contacts |
| Sync Webhook | `POST /api/webhooks/sync` | `app.ts` -> Supabase |
| Downgrade | `POST /api/stripe/downgrade` | `app.ts` -> Stripe SDK |
| One-time Purchase | `POST /api/stripe/one-time-purchase` | `app.ts` -> Stripe SDK |
| S3 Upload Replacement | `POST /api/s3-upload` | `app.ts` -> Supabase Storage |
| External API Proxy | `POST /api/proxy` | `app.ts` -> proxied call |

## Environment Variables

### Client-side (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

### Server-side (Netlify / Supabase)
See `.env.server.example` for all required secrets:
- Supabase
- Stripe
- OpenAI
- Mux
- Sync.so
- Cloudinary
- Brevo
- ScreenshotOne

## Multi-Tenancy

Tenant isolation is enforced at the database layer using Supabase RLS policies:
- `tenant_id` column added to core tables
- RLS policies ensure `tenant_id = auth.jwt() ->> 'tenant_id'`
- Supabase Edge Functions require `x-tenant-id` header
- Netlify Functions handle tenant via Supabase Service Role

## Deployment

### Netlify
1. Connect repo to Netlify
2. Set build command: `yarn build && next export`
3. Set publish directory: `out`
4. Add all env vars from `.env.server.example` in Netlify dashboard
5. Deploy

### Supabase
1. Run migrations: `supabase migration up`
2. Deploy Edge Functions: `supabase functions deploy video --file ./supabase/functions/video/index.ts`
3. Enable RLS on all tables
4. Set `SUPABASE_SERVICE_ROLE_KEY` in Netlify env

