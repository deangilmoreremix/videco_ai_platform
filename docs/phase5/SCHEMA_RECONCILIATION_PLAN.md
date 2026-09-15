# Schema Reconciliation Plan

**Date:** 2026-09-15  
**Status:** DRAFT - Based on Phase 5 audit findings  
**Database:** VideoRemix Product (bzxohkrxcwodllketcpz)

---

## Executive Summary

The live database schema differs significantly from the active repository migrations and application code expectations. This plan recommends specific actions to reconcile these differences.

**Key Findings:**
* 35 TypeScript errors are caused by schema mismatches (code references non-existent columns)
* 2 TypeScript errors are caused by missing tables (editor_v2_interactive_elements)
* 161 TypeScript errors are NOT schema-dependent (imports, i18n, React, nullability)
* Most application tables are empty, suggesting development/staging environment
* 3 tables expected by code do not exist: `campaigns`, `invitations`, `editor_v2_interactive_elements`

---

## Recommendations by Category

### CODE_FIX (12 items)

Live schema is correct; code/types need adjustment.

| # | Table | Column | Action | Risk | Priority |
|---|-------|--------|--------|------|----------|
| 1 | videos | `name` | Remove from code queries | Low | P2 |
| 2 | videos | `workspace_id` | Remove from code queries | Low | P1 |
| 3 | videos | `status` | Remove from code queries | Low | P2 |
| 4 | videos | `preview` | Remove from code queries | Low | P2 |
| 5 | jobs | `updated_at` | Remove from code queries | Low | P2 |
| 6 | jobs | `result` | Remove from code queries | Low | P2 |
| 7 | jobs | `ai_video_id` | Remove from code queries | Low | P1 |
| 8 | ai_videos | `video_id` | Remove from code queries | Low | P1 |
| 9 | ai_videos | `job_id` | Remove from code queries | Low | P2 |
| 10 | leads | `session_id` | Remove from code queries | Low | P2 |
| 11 | leads | `campaign_id` | Remove from code queries | Low | P1 |
| 12 | leads | `company` | Remove from code queries | Low | P2 |

### TYPE_FIX (15 items)

Runtime code is correct; TypeScript definition is stale.

| # | Table | Column | Action | Risk | Priority |
|---|-------|--------|--------|------|----------|
| 1 | videos | `url` | Update TS type to include `url` | Low | P1 |
| 2 | videos | `final_url` | Update TS type to include `final_url` | Low | P1 |
| 3 | videos | `created_at` | Update TS type to include `created_at` | Low | P1 |
| 4 | videos | `ai_preview` | Update TS type to include `ai_preview` | Low | P2 |
| 5 | videos | `media_status` | Update TS type to include `media_status` | Low | P1 |
| 6 | videos | `language` | Update TS type to include `language` | Low | P2 |
| 7 | videos | `tenant_id` | Update TS type to include `tenant_id` | Low | P1 |
| 8 | videos | `user_id` | Update TS type to include `user_id` | Low | P1 |
| 9 | videos | `type` | Update TS type to include `type` | Low | P2 |
| 10 | feedback | `user_id`, `session_id`, `video_id`, `question`, `answer` | Update TS types | Low | P2 |
| 11 | leads | `name`, `email`, `user_id`, `video_id` | Update TS types | Low | P2 |
| 12 | plan | `video_limit`, `dynamic_videos_limit`, `free_trial_start_date`, `free_trial_ended`, `status` | Update TS types | Low | P1 |
| 13 | sub_accounts | `id`, `main_account`, `shared_account`, `name`, `role`, `shared_account_user`, `workspace_id` | Update TS types | Low | P2 |
| 14 | analytics | `event` | Update TS type to include `event` | Low | P2 |
| 15 | comments | `content` | Update TS type to include `content` | Low | P2 |

### MIGRATION_REQUIRED (8 items)

Application requires schema missing from live DB.

| # | Table | Column/Table | Evidence | Risk | Priority |
|---|-------|--------------|----------|------|----------|
| 1 | videos | `embed_code` | Code queries for embed sharing | Low | P1 |
| 2 | videos | `campaign_name` | Code queries for campaign name | Low | P1 |
| 3 | plan | `name`, `price`, `interval` | Code expects plan details | Low | P2 |
| 4 | plan | `stripe_price_id`, `stripe_customer_id` | Stripe integration | Medium | P1 |
| 5 | plan | `credits` | Credit system | Medium | P1 |
| 6 | editor_v2_interactive_elements | Entire table | Editor/player persistence | High | P0 |
| 7 | campaigns | Entire table | Campaign management | High | P0 |
| 8 | invitations | Entire table | Team invitations | Medium | P1 |

### MAPPER_FIX (2 items)

DB naming and domain naming differ intentionally.

| # | Property | DB Column | Code Property | Action |
|---|----------|-----------|---------------|--------|
| 1 | button position | `button_position` | `buttonPosition` | Add mapper |
| 2 | default position | `default_position` | `defaultPosition` | Add mapper |

**Note:** These only apply if `editor_v2_interactive_elements` table is created.

### REMOVE_LEGACY_REFERENCE (8 items)

Code references truly obsolete behavior.

| # | Table | Column | Evidence | Action |
|---|-------|--------|----------|--------|
| 1 | feedback | `passed` | No migration defines it | Remove from code |
| 2 | leads | `passed` | No migration defines it | Remove from code |
| 3 | feedback | `name`, `email`, `company` | No migration defines them | Remove from code |
| 4 | leads | `company` | No migration defines it | Remove from code |
| 5 | brand_kit | `tenant_id`, `logo_url`, `font_family`, `company_name`, `website` | No migration defines them | Remove from code |
| 6 | usage | `tenant_id`, `details`, `cost_estimate`, `job_id` | No migration defines them | Remove from code |
| 7 | analytics | `event_type`, `properties` | No migration defines them | Remove from code |
| 8 | submissions | `user_id`, `session_id`, `data`, `form_data`, `answers` | No migration defines them | Remove from code |

---

## Recommended Execution Order

### Phase 1: Critical Fixes (P0)

1. **Apply disabled migration** for `editor_v2_interactive_elements`
   * Enables editor/player persistence
   * Resolves 2+ TypeScript errors
   * Risk: Low (table is empty)

2. **Verify `campaigns` table status**
   * If needed: Create migration for `campaigns` table
   * If not needed: Remove campaign references from code

### Phase 2: High Priority (P1)

3. **Apply missing columns** to `videos` table:
   * `embed_code`
   * `campaign_name`
   * Resolves 3 TypeScript errors

4. **Update TypeScript types** for verified columns:
   * `videos.url`, `final_url`, `created_at`, etc.
   * Resolves ~10 TypeScript errors

5. **Add Stripe columns** to `plan` table:
   * `stripe_price_id`
   * `stripe_customer_id`
   * Required for billing

### Phase 3: Medium Priority (P2)

6. **Remove legacy references** from code:
   * `feedback.passed`
   * `leads.passed`
   * `brand_kit.tenant_id`, etc.
   * Resolves ~20 TypeScript errors

7. **Add remaining plan columns**:
   * `name`, `price`, `interval`, `credits`

8. **Create mapper layer** for naming conventions

### Phase 4: Polish

9. **Fix non-schema TypeScript errors**:
   * Missing imports
   * i18n typing
   * React/JSX issues
   * Nullability

10. **Verify RLS policies**
11. **Verify functions/triggers**
12. **Run production build**

---

## Risk Mitigation

1. **Backup database** before any migration
2. **Test migrations** in development first
3. **Verify no data loss** - most tables are empty
4. **Rollback plan** for each migration
5. **Code review** for all TYPE_FIX and CODE_FIX changes

---

## Open Questions

1. Are `campaigns` and `invitations` tables required for MVP?
2. Should `editor_v2_interactive_elements` use disabled migration or new migration?
3. Is Stripe integration active or planned for future?
4. Are there production data concerns for empty tables?

---

## Next Steps

1. Review this plan with team
2. Prioritize items based on business needs
3. Create migration files for MIGRATION_REQUIRED items
4. Implement CODE_FIX and TYPE_FIX items
5. Verify with `npx tsc --noEmit` and `npm run build`
