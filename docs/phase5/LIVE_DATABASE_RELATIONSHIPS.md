# Live Database Relationships

**Date:** 2026-09-15  
**Status:** PARTIAL - Based on column probing and code analysis  
**Limitation:** Cannot verify foreign key constraints directly

---

## Inferred Relationships

### User → Profile

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| profiles | auth.users | id | uuid | Partial (id exists in profiles) |
| profiles | tenant | tenant_id | uuid | Partial (column exists) |

**Notes:**
- `profiles.id` likely references `auth.users.id`
- `profiles.tenant_id` suggests tenant isolation
- `profiles.email` exists, suggesting email-based user identification

### User → Workspace

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| workspaces | profiles | owner_id | uuid | Partial (column exists) |
| workspace | profiles | owner | uuid | Partial (column exists) |
| workspace | tenant | tenant_id | uuid | Partial (column exists) |

**Notes:**
- Both `workspace` and `workspaces` tables exist
- `workspaces.owner_id` likely references `profiles.id`
- `workspace.owner` likely references `profiles.id`
- `workspaces.tenant_id` and `workspace.tenant_id` suggest tenant isolation

### Workspace → Videos

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| videos | workspace | workspace_id | uuid | NO - column does not exist |

**Notes:**
- Code expects `videos.workspace_id` but column does not exist in live database
- Videos have `tenant_id` and `user_id` instead

### Video → Jobs

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| jobs | videos | video_id | uuid | NO - column does not exist |

**Notes:**
- Code expects `jobs.video_id` but column does not exist
- Jobs have `user_id` but no explicit video linkage

### Video → AI Videos

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| ai_videos | videos | video_id | uuid | NO - column does not exist |

**Notes:**
- Code expects `ai_videos.video_id` but column does not exist
- ai_videos have `user_id` but no explicit video linkage

### Video → Leads

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| leads | videos | video_id | uuid | Partial (column exists) |

**Notes:**
- `leads.video_id` exists and likely references `videos.id`
- Code also expects `leads.session_id` and `leads.campaign_id` which do not exist

### Video → Analytics

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| analytics | videos | video_id | uuid | Partial (column exists) |
| analytics | user | user_id | uuid | Partial (column exists) |
| analytics | tenant | tenant_id | uuid | Partial (column exists) |

**Notes:**
- `analytics.video_id`, `user_id`, `tenant_id` all exist

### Video → Comments

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| comments | videos | video_id | uuid | Partial (column exists) |
| comments | user | user_id | uuid | Partial (column exists) |

**Notes:**
- `comments.video_id` and `user_id` exist

### Video → Submissions

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| submissions | videos | ? | ? | UNKNOWN |

**Notes:**
- Code expects `submissions` to have `video_id` or similar linkage
- Live `submissions` table only has `id` and `created_at`
- Cannot verify relationship

### User → Sub Accounts

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| sub_accounts | workspace | workspace_id | uuid | Partial (column exists) |
| sub_accounts | user | main_account | uuid | Partial (column exists) |
| sub_accounts | user | shared_account | uuid | Partial (column exists) |

**Notes:**
- `sub_accounts.workspace_id` exists
- `sub_accounts.main_account` and `shared_account` exist
- `sub_accounts.shared_account_user` exists (text type)

### User → API Keys

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| apikey | user | user_id | uuid | Partial (column exists) |

**Notes:**
- `apikey.user_id` exists
- `apikey.key` exists

### User → Brand Kit

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| brand_kit | user | user_id | uuid | Partial (column exists) |

**Notes:**
- `brand_kit.user_id` exists
- `brand_kit.tenant_id` does NOT exist (expected by code)

### User → Usage

| From | To | Column | Type | Verified |
|------|----|--------|------|----------|
| usage | user | user_id | uuid | Partial (column exists) |
| usage | videos | video_id | uuid | Partial (column exists) |

**Notes:**
- `usage.user_id` and `video_id` exist
- `usage.tenant_id` does NOT exist (expected by code)

### Campaign Relationships

**Cannot be verified** - `campaigns` table does not exist in live database.

Code expects:
- `leads.campaign_id` - does not exist
- `campaigns` table - does not exist
- Campaign-video relationships - cannot be verified

### Interactive Element Relationships

**Cannot be verified** - `editor_v2_interactive_elements` table does not exist in live database.

Code expects:
- `InteractiveElementType` interface with properties: `id`, `type`, `time`, `endTime`, `name`, `url`, `link`, `buttonPosition`, `defaultPosition`, `user_id`, `answer_placeholder`
- Relationship to videos via `video_id`
- Relationship to users via `user_id`

---

## Relationship Summary

| Relationship | Expected by Code | Verified Live | Status |
|--------------|-----------------|---------------|--------|
| User → Profile | Yes | Partial | Profile columns exist, FK not verified |
| User → Workspace | Yes | Partial | Columns exist, FK not verified |
| Workspace → Videos | Yes (via workspace_id) | NO | videos.workspace_id missing |
| Video → Jobs | Yes (via video_id) | NO | jobs.video_id missing |
| Video → AI Videos | Yes (via video_id) | NO | ai_videos.video_id missing |
| Video → Leads | Yes (via video_id) | Partial | leads.video_id exists |
| Video → Analytics | Yes (via video_id) | Partial | analytics.video_id exists |
| Video → Comments | Yes (via video_id) | Partial | comments.video_id exists |
| Video → Submissions | Yes | UNKNOWN | submissions columns missing |
| User → Sub Accounts | Yes | Partial | Columns exist, FK not verified |
| User → API Keys | Yes | Partial | Columns exist |
| User → Brand Kit | Yes | Partial | Columns exist, tenant_id missing |
| User → Usage | Yes | Partial | Columns exist, tenant_id missing |
| Campaign → Leads | Yes | NO | campaigns table missing |
| Campaign → Videos | Yes | NO | campaigns table missing |
| Video → Interactive Elements | Yes | NO | table missing |

---

## Orphaned Relationships

The following relationships are referenced in code but have no live database support:

1. `videos.workspace_id` - column missing
2. `jobs.video_id` - column missing
3. `jobs.ai_video_id` - column missing
4. `ai_videos.video_id` - column missing
5. `ai_videos.job_id` - column missing
6. `leads.session_id` - column missing
7. `leads.campaign_id` - column missing
8. `leads.passed` - column missing
9. `feedback.passed` - column missing
10. `feedback.name`, `email`, `company` - columns missing
11. `brand_kit.tenant_id`, `logo_url`, etc. - columns missing
12. `usage.tenant_id`, `details`, `cost_estimate` - columns missing
13. `analytics.event_type`, `properties` - columns missing
14. `submissions.user_id`, `session_id`, `data` - columns missing
15. `campaigns` table - entirely missing
16. `editor_v2_interactive_elements` table - entirely missing
