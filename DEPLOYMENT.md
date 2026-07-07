# Videco Platform - Deployment Guide

## Tech Stack Migration

This application has been migrated to use:
- **Supabase** - Edge Functions, Storage, and Authentication
- **Muapi** - Image and Video AI generation
- **Netlify** - Hosting and serverless functions
- **OpenAI** - Responses API, TTS, and LLM

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `MUAPI_API_KEY` | Muapi API key for video generation |
| `MUAPI_WEBHOOK_SECRET` | Webhook signature verification |
| `OPENAI_API_KEY` | OpenAI API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOKS_SECRET` | Stripe webhook secret |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_USE_MUAPI_AI` | `true` | Enable Muapi for AI video generation |
| `NEXT_PUBLIC_USE_SUPABASE_STORAGE` | `true` | Enable Supabase Storage instead of Cloudinary |

## Supabase Setup

### 1. Create Storage Buckets

```sql
-- In Supabase SQL editor
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('user-uploads', 'user-uploads', true),
  ('ai-assets', 'ai-assets', true);
```

### 2. Run Migrations

```bash
supabase db push
```

### 3. Deploy Edge Functions

```bash
supabase functions deploy ai-orchestrator
```

## Netlify Setup

### 1. Install Netlify CLI

```bash
npm install -g netlify-cli
```

### 2. Link Project

```bash
netlify link
```

### 3. Set Environment Variables

```bash
netlify env:set SUPABASE_SERVICE_ROLE_KEY your_key
netlify env:set MUAPI_API_KEY your_key
netlify env:set OPENAI_API_KEY your_key
netlify env:set STRIPE_SECRET_KEY sk_xxx
netlify env:set STRIPE_WEBHOOKS_SECRET whsec_xxx
```

### 4. Deploy

```bash
netlify deploy --prod
```

## Local Development

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Run with Netlify functions
netlify dev
```

## API Endpoints

### Video Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/videos/clone` | POST | Create AI clone (lipsync) |
| `/api/v1/videos/process` | POST | Process AI video |
| `/api/v1/videos/poll` | POST | Poll Muapi job status |
| `/api/v1/videos/cloudinary` | POST | Upload video to storage |
| `/api/ai/personalize-script` | POST | Generate personalized script |
| `/api/webhooks/muapi` | POST | Muapi webhook handler |

### Netlify Functions

| Function | Endpoint |
|----------|----------|
| `stripe-webhook` | `/api/stripe/webhooks` |

## Usage

1. Upload or record a video in the editor
2. Navigate to AI video generation or clone creation
3. The system will:
   - Generate audio with OpenAI TTS (if needed)
   - Call Muapi for lipsync/video generation
   - Poll for job completion
   - Update video status when complete

## Rollback

To rollback to legacy implementation:
1. Set `NEXT_PUBLIC_USE_MUAPI_AI=false` in `.env.local`
2. Set `NEXT_PUBLIC_USE_SUPABASE_STORAGE=false`
3. Restart the development server