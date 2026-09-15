# RLS Audit

**Date:** 2026-09-15  
**Status:** BLOCKED - Cannot inspect RLS policies with current access  
**Database:** VideoRemix Product (bzxohkrxcwodllketcpz)

---

## Access Limitation

Direct inspection of RLS policies requires one of:
* PostgreSQL connection to query `pg_policies`
* Supabase Studio access
* Supabase Management API with database admin permissions

Current access (Supabase REST API with service-role key) does not expose RLS metadata.

---

## Inferred RLS Requirements from Code

Based on application code analysis, the following tables likely require RLS:

### User/tenant-isolated tables

| Table | Expected Isolation | Evidence |
|-------|-------------------|----------|
| profiles | tenant-level | `tenant_id` column exists |
| videos | tenant + user | `tenant_id`, `user_id` columns exist |
| leads | user + video | `user_id`, `video_id` columns exist |
| feedback | user + video | `user_id`, `video_id` columns exist |
| analytics | tenant + video + user | `tenant_id`, `video_id`, `user_id` columns exist |
| usage | user + tenant | `user_id` exists, `tenant_id` expected but missing |
| brand_kit | user + tenant | `user_id` exists, `tenant_id` expected but missing |
| comments | user + video | `user_id`, `video_id` columns exist |
| sub_accounts | workspace | `workspace_id` column exists |

### Public access tables

| Table | Expected Access | Evidence |
|-------|-----------------|----------|
| videos (player) | Public read for published videos | Code has public embed pages |
| submissions | Public insert for form submissions | API route allows anonymous submit |

### Service-role only tables

| Table | Expected Access | Evidence |
|-------|-----------------|----------|
| apikey | Service role only | Contains API keys |
| plan | Service role or admin | Contains plan data |

---

## Risk Assessment

### P0 SECURITY Risks (Cannot Verify)

1. **Tenant isolation** - Cannot verify if `tenant_id`-based RLS is enforced on:
   - profiles
   - videos
   - analytics
   - usage
   - brand_kit

2. **User ownership** - Cannot verify if `user_id`-based RLS is enforced on:
   - videos
   - leads
   - feedback
   - comments
   - ai_videos
   - jobs

3. **Public player access** - Cannot verify if public embed pages have proper RLS for:
   - Published videos only
   - Password-protected videos
   - Expired videos

4. **Anonymous submissions** - Cannot verify if submissions table allows anonymous INSERT but restricts SELECT/UPDATE/DELETE

### P1 Risks

1. **API key exposure** - Cannot verify if `apikey` table is service-role only
2. **Plan data exposure** - Cannot verify if `plan` table is properly protected
3. **Cross-tenant data leakage** - Cannot verify workspace/tenant isolation

---

## Required Verification

To complete RLS audit, the following queries are needed:

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Recommendation

**HIGH PRIORITY**: Complete RLS verification before production deployment. Current state is `BLOCKED_BY_CREDENTIAL` - direct database access required.
