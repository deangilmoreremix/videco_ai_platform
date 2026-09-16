# Phase 6 RLS Audit

**Date:** 2026-09-16  
**Branch:** `fix/phase-6-schema-reconciliation`  
**Status:** BLOCKED — awaiting live verification

---

## Overview

Row Level Security (RLS) policies were not modified during Phase 6. The migration is additive only and relies on existing policies.

This document provides instructions for verifying RLS in Supabase SQL Editor.

---

## Verification Steps

### 1. Check RLS Enabled Status

Run the first query from `docs/PHASE_6_RLS_VERIFICATION.sql` to confirm which tables have RLS enabled.

Expected result: all relevant tables should have `rls_enabled = true`.

### 2. Inspect Policies

Run the second query from `docs/PHASE_6_RLS_VERIFICATION.sql` to list all policies.

For each table, verify:
- `cmd` includes `SELECT`, `INSERT`, `UPDATE`, `DELETE` as appropriate
- `roles` includes `authenticated` (and possibly `service_role` for server-side operations)
- `using_expression` correctly restricts rows by `user_id = auth.uid()` or similar
- `with_check` correctly validates inserts/updates

### 3. Inspect Triggers

Run the third query to list triggers. Verify no unexpected triggers exist on Phase 6 tables.

### 4. Inspect Functions

Run the fourth query to list functions. Verify no unexpected functions reference Phase 6 tables in a security-sensitive way.

---

## Relevant Tables

| Table | Phase 6 Change | Expected RLS |
|-------|---------------|--------------|
| `videos` | 16 columns added | Existing policies apply |
| `plan` | 4 columns added | Existing policies apply |
| `ai_videos` | No schema change | Existing policies apply |
| `jobs` | No schema change | Existing policies apply |
| `leads` | No schema change | Existing policies apply |
| `feedback` | No schema change | Existing policies apply |

---

## Notes

- Service-role access bypasses RLS. Success with service-role is NOT proof of RLS correctness.
- Test with an authenticated user context to verify row-level restrictions.
- If any table shows `rls_enabled = false`, that is a security finding and must be addressed before production.
