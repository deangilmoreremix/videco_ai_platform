# Function and Trigger Audit

**Date:** 2026-09-15  
**Status:** BLOCKED - Cannot inspect without direct database access  
**Database:** VideoRemix Product (bzxohkrxcwodllketcpz)

---

## Access Limitation

Direct inspection of functions and triggers requires:
* PostgreSQL connection to query `pg_proc`, `pg_trigger`, `pg_event_trigger`
* Supabase Studio access
* Supabase Management API with database admin permissions

Current access does not allow this.

---

## Functions Expected by Code

### handle_new_user()

**Purpose:** Create profile when user signs up  
**Called by:** Auth trigger on `auth.users`  
**Evidence:** Referenced in `supabase/functions/auth/index.ts`

### handle_user_update()

**Purpose:** Update profile when user data changes  
**Called by:** Auth trigger on `auth.users`  
**Evidence:** Referenced in auth code

### get_app_slug()

**Purpose:** Return application slug  
**Evidence:** Mentioned in Supabase error message earlier

### Other Expected Functions

* Workspace creation function
* Plan assignment function
* Usage logging function
* Video processing trigger functions

---

## Triggers Expected by Code

### on_auth_user_created

**Table:** auth.users  
**Event:** INSERT  
**Purpose:** Create profile and workspace on signup

### on_user_updated

**Table:** auth.users  
**Event:** UPDATE  
**Purpose:** Sync profile changes

### on_video_created

**Table:** videos  
**Event:** INSERT  
**Purpose:** Initialize video processing

### on_job_created

**Table:** jobs  
**Event:** INSERT  
**Purpose:** Start async processing

---

## Verification Required

To complete this audit, run:

```sql
-- List all functions
SELECT n.nspname as schema,
       p.proname as function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schema, function_name;

-- List all triggers
SELECT n.nspname as schema,
       c.relname as table_name,
       t.tgname as trigger_name,
       pg_catalog.pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
LEFT JOIN pg_class c ON c.oid = t.tgrelid
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND NOT t.tgisinternal
ORDER BY schema, table_name, trigger_name;
```

---

## Risk

* **P0**: If `handle_new_user()` is missing, signup will fail silently or crash
* **P0**: If workspace creation trigger is missing, users will have no workspace
* **P1**: If video processing triggers are missing, AI features will not work

---

## Recommendation

**HIGH PRIORITY**: Complete function/trigger audit before production deployment. Use Supabase Studio or direct database connection.
