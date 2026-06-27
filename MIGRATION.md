## Client-side migration map

### Old (Next.js API routes)
`pages/api/v1/videos/index.ts` -> `GET /api/v1/videos`
`pages/api/v1/auth/login.ts` -> `POST /api/v1/auth/login`
`pages/api/stripe/*` -> `POST /api/stripe/webhooks`, `/api/stripe/checkout`

### New targets
- `GET/POST /api/v1/videos` -> Supabase Edge `supabase/functions/video` (direct PostgREST or RPC)
- Auth is now handled via Supabase Auth + JWT `tenant_id` claim
- Media upload -> Supabase Storage -> Mux (via `netlify/functions/proxy.ts`)
- AI generation -> OpenAI Responses API (via `netlify/functions/proxy.ts`)
- Payments -> Stripe (via `netlify/functions/proxy.ts`)
