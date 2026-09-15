# VidecoAI Backend Ownership Matrix

**Date:** 2026-09-15  
**Branch:** stabilize/videco-completion-audit-2026-09-15  
**SHA:** fd20195b6a3de8e95f26f34012d01cc44afa4c24  

---

## Ownership Model

This repository uses THREE backend surfaces:

1. **Next.js API Routes** (`pages/api/`) — Serverless routes deployed with Next.js on Netlify.
2. **Netlify Functions** (`netlify/functions/`) — Standalone Netlify Functions, bundled with esbuild.
3. **Supabase Edge Functions** (`supabase/functions/`) — Deno-based Supabase Edge Functions.

**Current finding:** There is significant duplication across these three surfaces. Many operations have implementations in all three, creating ambiguity about which is canonical.

---

## Classification Key

| Classification | Meaning |
|----------------|---------|
| CANONICAL | The intended primary implementation |
| INTERNAL SERVICE | Helper called by other backend code |
| COMPATIBILITY WRAPPER | Thin wrapper for backward compatibility |
| WEBHOOK HANDLER | External webhook receiver |
| DUPLICATE | Parallel implementation of another endpoint |
| STUB | Returns success without real work |
| DEAD LEGACY | Exists but is unreferenced/abandoned |
| UNUSED | Code exists but no caller found |
| UNKNOWN | Cannot determine without runtime verification |

---

## User Action Ownership Matrix

| User Action | Frontend Caller | Endpoint | Implementation | Auth | DB | External Provider | Classification |
|-------------|-----------------|----------|---------------|------|----|-------------------|----------------|
| List videos | `pages/videos/index.tsx` | `pages/api/v1/videos/index.ts` | Next.js API route | Session via Supabase client | `videos` | — | CANONICAL |
| List videos | — | `netlify/functions/videos.ts` | Netlify Function | x-tenant-id header | `videos` | — | DUPLICATE |
| List videos | — | `supabase/functions/videos/index.ts` | Supabase Edge Function | x-tenant-id header | `videos` | — | DUPLICATE |
| Create video | `pages/videos/start.tsx` | `pages/api/v1/videos/index.ts` (POST) | Next.js API route | Session | `videos` | — | CANONICAL |
| Update video | `pages/videos/edit.tsx` | `pages/api/v1/videos/index.ts` (PUT) | Next.js API route | Session | `videos` | — | CANONICAL |
| Delete video | `pages/videos/index.tsx` | `pages/api/v1/videos/index.ts` (DELETE) | Next.js API route | Session | `videos` | — | CANONICAL |
| Get video assets | — | `pages/api/v1/videos/assets.ts` | Next.js API route | Session | Supabase Storage | — | CANONICAL |
| AI process video | `pages/ai-videos/index.tsx` | `pages/api/v1/videos/process.ts` | Next.js API route | Session | `jobs`, `videos` | Muapi (or stub) | CANONICAL (with stub fallback) |
| AI process video | — | `netlify/functions/ai-orchestrator.ts` | Netlify Function | x-tenant-id | `jobs`, `videos`, `ai_videos` | Muapi, OpenAI | DUPLICATE |
| AI process video | — | `supabase/functions/ai-orchestrator/index.ts` | Supabase Edge Function | x-tenant-id | `jobs`, `videos`, `ai_videos` | Muapi, OpenAI | DUPLICATE |
| AI clone video | `pages/clones/create.tsx` | `pages/api/v1/videos/clone.ts` | Next.js API route | Session | `jobs`, `videos` | Muapi (or stub) | CANONICAL (with stub fallback) |
| AI clone video | — | `netlify/functions/ai-orchestrator.ts` | Netlify Function | x-tenant-id | `jobs`, `videos` | Muapi, OpenAI | DUPLICATE |
| AI clone video | — | `supabase/functions/ai-orchestrator/index.ts` | Supabase Edge Function | x-tenant-id | `jobs`, `videos` | Muapi, OpenAI | DUPLICATE |
| Poll AI job | — | `pages/api/v1/videos/poll.ts` | Next.js API route | Session | `jobs`, `videos`, `ai_videos` | Muapi | CANONICAL |
| Poll AI job | — | `netlify/functions/jobs.ts` | Netlify Function | x-tenant-id | `jobs` | Muapi | DUPLICATE |
| Poll AI job | — | `supabase/functions/jobs/index.ts` | Supabase Edge Function | x-tenant-id | `jobs` | Muapi | DUPLICATE |
| Get clone status | `pages/clones/create.tsx` | `pages/api/v1/videos/get-clone.ts` | Next.js API route | Session | `videos` | — | CANONICAL |
| Create AI preview | — | `pages/api/v1/videos/create-preview.ts` | Next.js API route | Session | `jobs` | Muapi | CANONICAL |
| Generate image | `pages/ai-videos/index.tsx` | `netlify/functions/images.ts` | Netlify Function | x-tenant-id | `images` | Muapi | CANONICAL (no Next.js equivalent) |
| Generate image | — | `supabase/functions/images/index.ts` | Supabase Edge Function | x-tenant-id | `images` | Muapi | DUPLICATE |
| List images | — | `netlify/functions/images.ts` | Netlify Function | x-tenant-id | `images` | — | CANONICAL |
| List images | — | `supabase/functions/images/index.ts` | Supabase Edge Function | x-tenant-id | `images` | — | DUPLICATE |
| Generate video (text-to-video) | — | `netlify/functions/videos.ts` | Netlify Function | x-tenant-id | `videos` | Muapi | CANONICAL (no Next.js equivalent) |
| Generate video (text-to-video) | — | `supabase/functions/videos/index.ts` | Supabase Edge Function | x-tenant-id | `videos` | Muapi | DUPLICATE |
| List videos (admin) | — | `netlify/functions/videos.ts` | Netlify Function | x-tenant-id | `videos` | — | CANONICAL |
| List videos (admin) | — | `supabase/functions/videos/index.ts` | Supabase Edge Function | x-tenant-id | `videos` | — | DUPLICATE |
| Auth (admin create user) | — | `netlify/functions/auth.ts` | Netlify Function | Service role | `profiles` | Supabase Auth | CANONICAL |
| Auth (admin create user) | — | `supabase/functions/auth/index.ts` | Supabase Edge Function | Service role | `profiles` | Supabase Auth | DUPLICATE |
| List leads | `pages/leads/index.tsx` | `pages/api/v1/leads/index.ts` | Next.js API route | Session | `leads` | — | CANONICAL |
| Create lead | `pages/leads/index.tsx` | `netlify/functions/leads.ts` | Netlify Function | x-tenant-id | `leads` | — | CANONICAL |
| Create lead | — | `supabase/functions/leads/index.ts` | Supabase Edge Function | x-tenant-id | `leads` | — | DUPLICATE |
| List leads | — | `netlify/functions/leads.ts` | Netlify Function | x-tenant-id | `leads` | — | CANONICAL |
| List leads | — | `supabase/functions/leads/index.ts` | Supabase Edge Function | x-tenant-id | `leads` | — | DUPLICATE |
| Muapi webhook | Muapi service | `pages/api/webhooks/muapi.ts` | Next.js API route | None (signature verified) | `videos`, `ai_videos` | Muapi | CANONICAL |
| Muapi webhook | Muapi service | `netlify/functions/ai-orchestrator.ts` | Netlify Function | Signature | `videos`, `ai_videos` | Muapi | DUPLICATE |
| Muapi webhook | Muapi service | `supabase/functions/ai-orchestrator/index.ts` | Supabase Edge Function | Signature | `videos`, `ai_videos` | Muapi | DUPLICATE |
| Sync webhook | — | `pages/api/webhooks/sync.ts` | Next.js API route | Session | `videos` | — | STUB (no real sync logic) |
| Usage log | `src/lib/muapi.ts` | `pages/api/usage/log.ts` | Next.js API route | None | `usage` | — | CANONICAL |
| Credits deduct | — | `pages/api/credits/deduct.ts` | Next.js API route | Session | `plan`, `videos`, `ai_videos` | — | CANONICAL |
| Form submission (public) | `pages/embed/player/[id].tsx` | `pages/api/submissions/submit.ts` | Next.js API route | None | `submissions`, `leads` | — | CANONICAL |
| Feedback submit | `pages/feedback/index.tsx` | `pages/api/feedback/submit.ts` | Next.js API route | Session | `feedback` | — | CANONICAL |
| Send invite email | `pages/invite/index.tsx` | `pages/api/mail/invite.ts` | Next.js API route | Session | — | Brevo | CANONICAL |
| Send welcome email | — | `pages/api/mail/welcome.ts` | Next.js API route | Session | — | Brevo | CANONICAL |
| Send delete email | — | `pages/api/mail/delete.ts` | Next.js API route | Session | — | Brevo | CANONICAL |
| Start trial (Brevo) | — | `pages/api/brevo/start-trial.ts` | Next.js API route | None | — | Brevo | CANONICAL |
| S3 upload (legacy) | `src/components/features/editor-v2/header/image-preview.tsx` | `pages/api/s3-upload.ts` | Next.js API route (next-s3-upload) | — | S3 | DEAD LEGACY |
| Script generation | `pages/ai-videos/index.tsx` | `pages/api/ai/personalize-script.ts` | Next.js API route | Session | — | OpenAI | CANONICAL |
| Script generation | — | `netlify/functions/api.ts` | Netlify Function | x-tenant-id | — | OpenAI | DUPLICATE |
| Script generation | — | `supabase/functions/api/index.ts` | Supabase Edge Function | x-tenant-id | — | OpenAI | DUPLICATE |
| Personalization | `pages/clones/create.tsx` | `netlify/functions/ai-orchestrator.ts` | Netlify Function | x-tenant-id | `videos` | OpenAI, Muapi | CANONICAL |
| Personalization | — | `supabase/functions/ai-orchestrator/index.ts` | Supabase Edge Function | x-tenant-id | `videos` | OpenAI, Muapi | DUPLICATE |

---

## Duplication Summary

| Operation | Next.js API | Netlify Function | Supabase Edge Function |
|-----------|-------------|------------------|------------------------|
| Video CRUD | ✅ CANONICAL | ✅ DUPLICATE | ✅ DUPLICATE |
| AI process/clone | ✅ CANONICAL (stub fallback) | ✅ DUPLICATE | ✅ DUPLICATE |
| Job poll | ✅ CANONICAL | ✅ DUPLICATE | ✅ DUPLICATE |
| Image gen | ❌ | ✅ CANONICAL | ✅ DUPLICATE |
| Video gen | ❌ | ✅ CANONICAL | ✅ DUPLICATE |
| Leads | ✅ CANONICAL (list) / ❌ (create) | ✅ CANONICAL (create/list) | ✅ DUPLICATE |
| Auth | ❌ | ✅ CANONICAL | ✅ DUPLICATE |
| Webhooks | ✅ CANONICAL | ✅ DUPLICATE | ✅ DUPLICATE |
| Script gen | ✅ CANONICAL | ✅ DUPLICATE | ✅ DUPLICATE |
| Personalization | ❌ | ✅ CANONICAL | ✅ DUPLICATE |

---

## Recommendations

1. **Designate ONE canonical owner per operation.**
2. **Next.js API routes** should own all operations called directly from the frontend.
3. **Netlify Functions** should own operations that require service-role access or are called by external webhooks.
4. **Supabase Edge Functions** should be removed or consolidated into Netlify Functions to eliminate duplication.
5. **Webhook handlers** should have a single canonical endpoint registered with the external provider.

---

*End of backend ownership matrix.*
