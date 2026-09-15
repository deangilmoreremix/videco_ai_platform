# Lint Baseline

**Date:** 2026-09-15  
**Branch:** stabilize/videco-completion-audit-2026-09-15  

## ESLint Summary

| Category | Count | Description |
|----------|------:|-------------|
| **A. Formatting-only** | 3598 | `prettier/prettier` — indentation, line breaks, quote style |
| **B. Actual code errors** | 37 | Unused vars, require statements, empty functions/blocks |
| **C. Unused/dead variables** | 15 | Variables assigned but never used |
| **D. React/Next problems** | 0 | None found in lint output |
| **E. TypeScript-related lint failures** | 121 | `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-non-null-assertion` |
| **Total errors** | 3633 | |
| **Total warnings** | 136 | |

## Category B Details — Actual Code Errors

| Rule | Count | Files |
|------|------:|-------|
| `@typescript-eslint/no-unused-vars` | 15 | `pages/api/mail/*.ts`, `pages/api/webhooks/sync.ts`, `supabase/functions/videos/index.ts`, `src/lib/__tests__/*` |
| `@typescript-eslint/no-var-requires` | 2 | `test/jest.setup.ts` |
| `@typescript-eslint/no-empty-function` | 2 | API route files |
| `no-empty` | 2 | API route files |

## Category E Details — TypeScript Warnings

| Rule | Count | Description |
|------|------:|-------------|
| `@typescript-eslint/no-explicit-any` | ~100 | `any` types in API handlers, components, utilities |
| `@typescript-eslint/no-non-null-assertion` | ~21 | Non-null assertions (`!`) in Supabase functions and components |

## Phase 2 Focus

Phase 2 fixes only the **foundational code errors** that block build/tooling:
- Circular import in `src/lib/log.ts`
- Missing import in `pages/videos/index.tsx`
- Jest setup `require` statements
- Muapi Buffer/Blob type issue

All 3598 prettier formatting errors are deferred to a dedicated formatting commit.
