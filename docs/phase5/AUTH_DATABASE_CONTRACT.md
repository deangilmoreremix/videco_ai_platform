# Auth Database Contract

**Date:** 2026-09-15  
**Status:** PARTIAL - Based on code analysis and schema probing  
**Database:** VideoRemix Product (bzxohkrxcwodllketcpz)

---

## Verified Database Requirements

### auth.users (Supabase Managed)

* Not directly inspected (managed by Supabase Auth)
* Application expects standard Supabase auth fields

### profiles Table

| Column | Live | Purpose |
|--------|------|---------|
| id | ✓ | References auth.users.id |
| email | ✓ | User email |
| tenant_id | ✓ | Tenant isolation |
| role | ✓ | User role |
| plan_name | ✓ | Current plan |
| desired_plan | ✓ | Plan upgrade intent |
| is_admin | ✓ | Admin flag |
| onboard_completed | ✓ | Onboarding state |
| has_seen_quickstart | ✓ | Quickstart state |
| custom_instructions | ✓ | AI customization |
| ai_voice_id | ✓ | Voice selection |
| onboarding_video | ✓ | Onboarding progress |
| anonymous_id | ✓ | Anonymous tracking |
| muapi_key | ✓ | Muapi integration |
| full_name | ✓ | Display name |
| avatar_url | ✓ | Profile image |
| job_title | ✓ | Job title |

**Missing columns (expected by code):**
- None identified

### workspace / workspaces Tables

| Column | Live | Purpose |
|--------|------|---------|
| id | ✓ | Workspace ID |
| tenant_id | ✓ | Tenant isolation |
| owner | ✓ (workspace) | Owner reference |
| owner_id | ✓ (workspaces) | Owner reference |
| name | ✓ | Workspace name |
| slug | ✓ (workspaces) | URL slug |
| image | ✓ (workspace) | Workspace image |
| settings | ✓ (workspaces) | JSON settings |

### plan Table

| Column | Live | Purpose |
|--------|------|---------|
| id | ✓ | Plan ID |
| video_limit | ✓ | Video limit |
| dynamic_videos_limit | ✓ | Dynamic limit |
| free_trial_start_date | ✓ | Trial start |
| free_trial_ended | ✓ | Trial end flag |
| status | ✓ | Plan status |

**Missing columns (expected by code):**
- name, price, interval, stripe_price_id, stripe_customer_id, credits

---

## Auth Flow Assumptions (from code)

### Signup

1. User signs up via Supabase Auth
2. Profile created with `tenant_id`
3. Workspace created
4. Plan assigned (default or trial)

### Login

1. Supabase Auth handles authentication
2. `useSession()` provides user context
3. Profile loaded via `user_id`

### Session

1. Supabase manages JWT
2. `tenant_id` extracted from profile or JWT claims
3. All queries filtered by `tenant_id`

---

## Database Triggers/Functions (Expected)

Cannot verify existence without direct database access.

Expected:
* `handle_new_user()` - Creates profile on signup
* `handle_user_update()` - Updates profile on user change
* Workspace creation trigger
* Plan assignment trigger

---

## Gaps

1. **Cannot verify triggers** - No direct DB access
2. **Cannot verify functions** - No direct DB access
3. **Cannot verify RLS on auth tables** - No direct DB access
4. **Plan-Stripe integration** - `stripe_price_id` and `stripe_customer_id` missing from live

---

## Recommendations

1. **Verify triggers exist** using Supabase Studio or direct DB access
2. **Verify profile creation** on signup works correctly
3. **Verify tenant isolation** is enforced at database level
4. **Add missing plan columns** if Stripe integration is required
5. **Document auth contract** once triggers/functions are verified
