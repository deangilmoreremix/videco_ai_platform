# Videco Platform Deployment Guide

This document outlines the deployment process for the Videco platform migrated to the 2026 tech stack.

## Tech Stack

- **Frontend**: Next.js 14 (React 18)
- **Backend/API**: 
  - Supabase Edge Functions (AI orchestration)
  - Netlify Functions (Stripe webhooks, usage logging)
- **Storage**: Supabase Storage (user-uploads bucket)
- **Database**: Supabase PostgreSQL
- **AI Services**: 
  - Muapi (video/image generation)
  - OpenAI (script generation, TTS, Realtime API)
- **Hosting**: Netlify
- **Feature Flags**: `NEXT_PUBLIC_USE_MUAPI_AI` for dual-path compatibility

## Prerequisites

1. **Supabase Project**:
   - Create a new Supabase project
   - Enable the following extensions: `uuid-ossp`, `pg_net`
   - Create Storage bucket: `user-uploads` (public access)

2. **Netlify Account**:
   - Create a new site connected to this repository
   - Configure build command: `npm run build`
   - Publish directory: `.next`

3. **Environment Variables**:
   - See `.env.example` for required variables
   - Required: 
     - Supabase URL & anon/public keys
     - Supabase service role key
     - Muapi API key & webhook secret
     - OpenAI API key
     - Netlify site URL

## Deployment Steps

### 1. Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link local project to Supabase
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push

# Start Supabase locally (for development)
supabase start
```

### 2. Muapi Configuration

1. Sign up at [Muapi.so](https://muapi.so)
2. Create an API key
3. Set up webhook endpoint: `https://your-site.netlify.app/api/webhooks/muapi`
4. Add webhook secret to environment variables

### 3. OpenAI Configuration

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to environment variables

### 4. Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to site
netlify link

# Deploy
netlify deploy --prod
```

### 5. Environment Variables

Create `.env.production` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Muapi
MUAPI_API_KEY=your_muapi_key
MUAPI_WEBHOOK_SECRET=your_webhook_secret

# OpenAI
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL_FOR_SCRIPTS=gpt-4o
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17

# App
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
NEXT_PUBLIC_USE_MUAPI_AI=true  # Set to false to fallback to legacy services
NEXT_PUBLIC_CLOUDINARY_TRANSFORM_PREFIX=https://res.cloudinary.com/dhd6m0fh3/video/upload/c_scale,h_400/e_loop/dl_200,vs_30/
```

## Architecture Overview

### Data Flow

1. **Video Generation**:
   - User uploads media → Stored in Supabase Storage (`user-uploads` bucket)
   - AI processing triggered via Supabase Edge Function (`ai-orchestrator`)
   - Edge function calls Muapi for generation
   - Results stored back in Supabase Storage
   - Usage logged to `public.usage` table

2. **Script Generation & TTS**:
   - OpenAI API called directly from Next.js API routes or Edge Functions
   - Usage logged via client/server loggers

3. **Webhooks**:
   - Muapi webhooks → Netlify function → Updates video status
   - Stripe webhooks → Netlify function → Updates subscription/plans

### Key Components

- **Supabase Edge Function**: `supabase/functions/ai-orchestrator/index.ts`
  - Handles: clone, process, personalize, poll, webhook actions
  - Dual-path: Uses Muapi when `NEXT_PUBLIC_USE_MUAPI_AI=true`, falls back to legacy

- **Netlify Functions**:
  - `netlify/functions/stripe-webhook.ts`: Handles Stripe events
  - `netlify/functions/usage-log.ts`: Alternative usage logging endpoint

- **Storage Structure**:
  - `user-uploads/`: User uploaded media
  - `ai-generated/`: Muapi generated videos/images
  - `scripts/`: OpenAI generated scripts
  - `audio/`: TTS generated audio

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type checking
npm run typecheck
```

## Feature Flags

- `NEXT_PUBLIC_USE_MUAPI_AI`: 
  - `true`: Use Muapi for AI generation (default)
  - `false`: Fallback to legacy Sync.so/Cloudinary/Speechify services
  - Enables zero-downtime rollback

## Monitoring & Maintenance

### Usage Tracking

The `public.usage` table tracks:
- AI generation credits (Muapi)
- Token consumption (OpenAI)
- Storage usage
- API call counts

### Logs

- Supabase Edge Function logs: Accessible via Supabase dashboard
- Netlify Function logs: Available in Netlify dashboard
- Client-side usage logging: Best-effort via `/api/usage/log`

### Backup & Recovery

- Supabase provides automated backups
- Storage files are replicated
- Critical metadata in PostgreSQL database

## Troubleshooting

### Common Issues

1. **Storage Permission Errors**:
   - Ensure `user-uploads` bucket is set to public
   - Check Supabase service role key has correct permissions

2. **AI Generation Failures**:
   - Verify Muapi API key and credits
   - Check webhook secret matches Muapi configuration
   - Review Edge Function logs for detailed errors

3. **Build Failures**:
   - Ensure all environment variables are set
   - Check for TypeScript errors with `npm run typecheck`
   - Verify Node.js version compatibility

### Health Checks

- API Health: `https://your-site.netlify.app/api/health`
- Supabase Status: Check dashboard
- Muapi Status: Check API key validity

## Rollback Procedure

To rollback to legacy services:

1. Set `NEXT_PUBLIC_USE_MUAPI_AI=false` in environment variables
2. Redeploy: `netlify deploy --prod`
3. Monitor for errors in logs
4. Verify legacy services (Sync.so, Cloudinary, Speechify) are accessible

## Contact

For deployment issues, check:
- Netlify deploy logs
- Supabase function logs
- Browser console for frontend errors