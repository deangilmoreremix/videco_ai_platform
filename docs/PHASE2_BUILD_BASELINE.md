# Phase 2 Build Baseline

**Date:** 2026-09-15  
**Branch:** `stabilize/videco-completion-audit-2026-09-15`  
**Baseline SHA:** `fd20195b6a3de8e95f26f34012d01cc44afa4c24`  
**Node:** 20.15.1 (`/tmp/node-v20.15.1-darwin-x64/bin/`)  
**Package Manager:** npm

## Pre-existing State
- Dirty worktree with `pages/_app.tsx` modifications (unused variable renames)
- Jest toolchain broken (missing deps, old `ts-jest/utils` import, no transform)
- Nock v14 incompatible with jsdom/Node 20
- `src/lib/muapi.ts` Buffer/Blob type errors
- `tsconfig.json` includes `supabase/functions/` (Deno globals pollute Node typecheck)
- `src/lib/log.ts` circular import
- `pages/videos/index.tsx` missing `useSession` import
- `src/utils/load-stripe.ts` missing `@stripe/stripe-js` dependency

## Validation Results (Post-Fix)

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | 345 errors (pre-existing; targeted fixes resolved) |
| Tests | `npm test -- --runInBand` | 4 suites, 10 tests passed |
| Lint | `npm run lint` | 3769 problems (3598 prettier auto-fixable, 35 code errors, 136 warnings) |
| Build | `npm run build` | EXIT 1 (pre-existing ESLint block; same as baseline) |

## Targeted Fixes Applied

1. **Jest Toolchain Repair**
   - Installed `jest`, `ts-jest`, `@types/jest`, `jest-environment-jsdom`, `jest-sonar-reporter`
   - Updated `test/jest.config.js`: `ts-jest/utils` → `ts-jest`, added `transform`
   - Updated `test/jest.setup.ts`: nock v12-compatible polyfills
   - Pinned `nock` to `12.0.0`
   - Added `.kilo/` and component specs to `testPathIgnorePatterns`

2. **Foundational Code Fixes**
   - `src/lib/muapi.ts`: Fixed `uploadImage` Buffer/Blob type incompatibility
   - `src/lib/log.ts`: Removed circular `import { logger } from "./log"`, uses `console.info`
   - `pages/videos/index.tsx`: Added missing `useSession` import
   - `src/utils/load-stripe.ts`: Installed `@stripe/stripe-js`

3. **TypeScript Boundary**
   - `tsconfig.json`: Added `supabase/functions` to `exclude` to prevent Deno globals from polluting Node build

## Pre-existing Issues (Not Fixed in Phase 2)
- Build blocked by pre-existing ESLint/prettier formatting errors in multiple files
- 345 TypeScript errors across pages/components (Supabase type inference, missing imports)
- Component `.spec.tsx` tests blocked by ESM/React transform requirements

## Recovery Artifacts
- `docs/recovery/pre-phase2-app-tsx.patch`
- `docs/recovery/PRE_PHASE2_WORKTREE.md`
- `docs/PACKAGE_MANAGER_DECISION.md`
- `docs/LINT_BASELINE.md`
