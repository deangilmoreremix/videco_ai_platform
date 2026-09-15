# Interactive Element Schema Contract

**Date:** 2026-09-15  
**Status:** BLOCKED - Table does not exist in live database  
**Table:** editor_v2_interactive_elements (expected)

---

## Problem Statement

The editor-v2 and player components rely on an `InteractiveElementType` interface that maps to a database table. This table does NOT exist in the live database.

**Live status:** Table missing  
**Migration status:** Defined in disabled migration `20260804_add_missing_tables.sql`  
**Code status:** Actively used in editor and player

---

## Expected Contract

### Editor Creates Element

| Property | Editor Uses | Type | Required |
|----------|-------------|------|----------|
| id | Yes | string | Yes |
| type | Yes | string | Yes |
| time | Yes | number | Yes |
| endTime | Yes | number | No |
| name | Yes | string | No |
| url | Yes | string | No |
| link | Yes | string | No |
| buttonPosition | Yes | string | No |
| defaultPosition | Yes | { x: number; y: number } | No |
| user_id | Yes | string | Yes |
| answer_placeholder | Yes | string | No |

### Player Uses Element

| Property | Player Uses | Type | Required |
|----------|-------------|------|----------|
| id | Yes | string | Yes |
| type | Yes | string | Yes |
| time | Yes | number | Yes |
| endTime | Yes | number | No |
| name | Yes | string | No |
| url | Yes | string | No |
| link | Yes | string | No |
| buttonPosition | Yes | string | No |
| defaultPosition | Yes | { x: number; y: number } | No |

### Database Storage

| Property | DB Column | Type | Nullable |
|----------|-----------|------|----------|
| id | id | uuid | No |
| video_id | video_id | uuid | Yes |
| user_id | user_id | uuid | Yes |
| type | type | text | Yes |
| time | time | numeric | Yes |
| endTime | end_time | numeric | Yes |
| name | name | text | Yes |
| url | url | text | Yes |
| link | link | text | Yes |
| buttonPosition | button_position | text | Yes |
| defaultPosition | default_position | jsonb | Yes |
| answer_placeholder | answer_placeholder | text | Yes |

---

## Current State

### What Works

1. Editor state management in Zustand
2. Element creation in UI
3. Serialization to JSON in editor

### What is Broken

1. **Persistence** - Elements cannot be saved to database (table missing)
2. **Player loading** - Player cannot load elements from database
3. **TypeScript** - Interface incomplete, causing 2 build errors

### Root Cause

The `editor_v2_interactive_elements` table was defined in a disabled migration (`20260804_add_missing_tables.sql`) but was never applied to the live database.

---

## Options

### Option 1: Apply Disabled Migration

* **Action:** Enable and apply `20260804_add_missing_tables.sql`
* **Risk:** Low - table is empty, no data loss
* **Benefit:** Fixes persistence and player loading
* **TypeScript impact:** Resolves 2 errors

### Option 2: Remove Interactive Elements Feature

* **Action:** Remove editor-v2 interactive elements code
* **Risk:** Medium - feature partially built
* **Benefit:** Eliminates schema dependency
* **TypeScript impact:** Resolves 2+ errors

### Option 3: Use Alternative Storage

* **Action:** Store elements in existing `videos` table JSON column
* **Risk:** Medium - schema change required
* **Benefit:** No new table needed
* **TypeScript impact:** Resolves 2+ errors

---

## Recommendation

**Option 1** is recommended because:
1. The disabled migration already defines the table
2. No data migration needed (table is empty)
3. Matches original application design
4. Lowest risk

**Do not implement in Phase 5.** This is a documentation phase only.

---

## Contract Verification

To verify this contract, the following are needed:
1. Apply disabled migration to development environment
2. Create test element via editor
3. Verify element persists to database
4. Verify player can read element
5. Update TypeScript interface to match verified schema
