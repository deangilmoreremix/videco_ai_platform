-- ============================================================================
-- Phase 6 RLS Verification
-- Run these queries in Supabase SQL Editor to verify RLS status.
-- ============================================================================

-- 1. Tables with RLS enabled
select
    schemaname,
    tablename,
    rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in (
      'profiles',
      'workspace',
      'workspaces',
      'plan',
      'videos',
      'ai_videos',
      'jobs',
      'leads',
      'feedback',
      'analytics',
      'usage',
      'brand_kit',
      'submissions',
      'apikey'
  )
order by tablename;

-- 2. Policies attached to each table
select
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
      'profiles',
      'workspace',
      'workspaces',
      'plan',
      'videos',
      'ai_videos',
      'jobs',
      'leads',
      'feedback',
      'analytics',
      'usage',
      'brand_kit',
      'submissions',
      'apikey'
  )
order by tablename, cmd, policyname;

-- 3. Triggers on relevant tables
select
    trigger_schema,
    event_object_table,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
      'profiles',
      'workspace',
      'workspaces',
      'plan',
      'videos',
      'ai_videos',
      'jobs',
      'leads',
      'feedback',
      'analytics',
      'usage',
      'brand_kit',
      'submissions',
      'apikey'
  )
order by event_object_table, trigger_name;

-- 4. Functions owned by the database (non-enumerable)
select
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
order by p.proname;
