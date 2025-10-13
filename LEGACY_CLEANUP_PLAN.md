# Legacy Client Portal Cleanup Plan

**Date Created:** 2025-10-06
**Status:** PENDING REVIEW
**Risk Level:** LOW (no active clients using legacy systems)

---

## Executive Summary

This cleanup plan removes two legacy client collaboration systems that have been superseded by the **Booking Collaborate** (`/booking/:bookingId/collaborate`) system.

**Current Active System:**
- ✅ Booking Collaborate - React-based collaboration using `bookings.collaborationToken`

**Legacy Systems to Remove:**
1. ❌ Client Portal - Unused React page with custom UI (`/client-portal/:contractId`)
2. ❌ Collaborative Form Generator - Server-generated HTML forms (`/api/collaborative-form/:token`)

---

## Analysis Complete: What We Found

### Active System (Keep)
- `client/src/pages/booking-collaborate.tsx` - **KEEP** (actively used)
- `server/routes/booking-collaboration-routes.ts` - **KEEP** (actively used)
- `bookings.collaborationToken` column - **KEEP** (actively used)

### Legacy System #1: Client Portal (Remove)
**Files to Delete:**
- `client/src/pages/client-portal.tsx` - Custom React portal page (never linked)
- `server/routes/client-portal-routes.ts` - API routes for React portal
- Route registration in `server/routes/index.ts` (line 17, 154)
- Route definition in `client/src/App.tsx` (line 32, 316)

**Database Fields (Deprecate but Keep for History):**
- `contracts.clientPortalToken` - Used by legacy system
- `contracts.clientPortalUrl` - Used by legacy system
- `contracts.clientPortalQrCode` - Used by legacy system

### Legacy System #2: Collaborative Form Generator (Remove)
**Files to Delete:**
- `server/core/collaborative-form-generator.ts` - Generates static HTML forms
- `server/routes/collaborative-form-routes.ts` - API routes for HTML forms
- `server/routes/regenerate-portal.ts` - Regeneration utility
- `server/routes/client-routes.ts` (lines 9-54) - `/api/portal/:contractId` endpoint only
- `client/src/components/field-lock-manager.tsx` - Field locking feature (unused)
- Route registration in `server/routes/index.ts` (lines 18-19, 155-156)

**Scripts to Delete (Maintenance/Testing):**
- `scripts/audit-portal-alignment.ts`
- `scripts/fix-client-portal.ts`
- `scripts/regenerate-r2-form.ts`
- `scripts/test-r2-form-save.ts`

**Database Fields (Deprecate but Keep):**
- `bookings.field_locks` - Used for collaborative form locking

---

## What Gets Updated (Not Deleted)

### Files That Reference Legacy But Need Cleanup

**1. `server/core/contract-signing-email.ts`** (lines 16-23)
- Currently stores `clientPortalToken`, `clientPortalUrl`, `clientPortalQrCode` to contract
- These values are generated but point to Booking Collaborate (correct behavior)
- **Action:** Update comments to clarify these fields are for historical tracking only

**2. `server/storage/contract-storage.ts`** (lines 148-152, 217-221)
- Handles `clientPortalToken`, `clientPortalUrl`, `clientPortalQrCode` in CRUD operations
- **Action:** Keep these (needed for database compatibility) but add deprecation comments

**3. `shared/schema.ts`** (contracts table)
- Defines `clientPortalUrl`, `clientPortalToken`, `clientPortalQrCode` columns
- **Action:** Keep definitions but mark as deprecated with comments

**4. `client/src/components/mobile-nav.tsx`**
- May have routing logic that checks for client-portal paths
- **Action:** Remove any client-portal path checks if present

---

## Files to Keep (Active Usage Confirmed)

- `server/core/client-portal.ts` - **KEEP** (actually generates Booking Collaborate links despite name)
- `server/routes/booking-collaboration-routes.ts` - **KEEP** (active system)
- `client/src/pages/booking-collaborate.tsx` - **KEEP** (active system)
- All `booking.collaboration_token*` database columns - **KEEP**

---

## Execution Plan (3 Phases)

### Phase 1: Create Rollback Point ✅
```bash
git add -A
git commit -m "Rollback point before legacy client portal cleanup"
```

### Phase 2: Delete Legacy Files
**Order matters to avoid breaking imports:**

1. Remove route registrations first
2. Delete route files
3. Delete React components
4. Delete core generators
5. Delete utility scripts
6. Update references with deprecation comments

### Phase 3: Verify & Test
1. Check server starts without errors
2. Test contract signing flow
3. Test Booking Collaborate access
4. Verify no broken imports

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking active collaboration links | LOW | HIGH | Active system uses different routes |
| Database migration issues | NONE | N/A | Not touching database structure |
| Import errors from deleted files | LOW | MEDIUM | Systematic removal with verification |
| Accidental deletion of active code | VERY LOW | HIGH | Careful review of each file |

---

## Detailed File Removal List

### Client-Side (React) Files
```
DELETE: client/src/pages/client-portal.tsx
DELETE: client/src/components/field-lock-manager.tsx
UPDATE: client/src/App.tsx (remove line 32: import, line 316: route)
UPDATE: client/src/components/mobile-nav.tsx (remove client-portal checks if any)
```

### Server-Side (API) Files
```
DELETE: server/routes/client-portal-routes.ts
DELETE: server/routes/collaborative-form-routes.ts
DELETE: server/routes/regenerate-portal.ts
DELETE: server/core/collaborative-form-generator.ts
UPDATE: server/routes/client-routes.ts (remove /api/portal/:contractId endpoint only, lines 9-54)
UPDATE: server/routes/index.ts (remove imports lines 17-19, registrations lines 154-156)
```

### Utility Scripts
```
DELETE: scripts/audit-portal-alignment.ts
DELETE: scripts/fix-client-portal.ts
DELETE: scripts/regenerate-r2-form.ts
DELETE: scripts/test-r2-form-save.ts
```

### Database Schema (Mark as Deprecated, Don't Delete)
```
DEPRECATE: contracts.clientPortalToken
DEPRECATE: contracts.clientPortalUrl
DEPRECATE: contracts.clientPortalQrCode
DEPRECATE: bookings.field_locks
```

---

## Post-Cleanup Benefits

1. **Reduced Complexity:** Remove 2 alternative authentication systems
2. **Less Confusion:** Single source of truth for client collaboration
3. **Easier Maintenance:** No more "which portal?" questions
4. **Cleaner Codebase:** ~3,000+ lines of unused code removed
5. **Better Performance:** Fewer routes to register and maintain

---

## Rollback Procedure

If something goes wrong:
```bash
git log --oneline -5  # Find the rollback commit hash
git reset --hard <rollback-commit-hash>
```

All deleted files will be restored from the commit.

---

## Next Steps

1. **Review this plan** - User approval required
2. **Create rollback commit** - Safety first
3. **Execute cleanup** - Systematic file removal
4. **Test thoroughly** - Verify active system works
5. **Document changes** - Update any relevant docs

---

## Questions to Answer Before Proceeding

- [ ] Is there any functionality in the legacy systems that you want to preserve?
- [ ] Are you comfortable with the file deletion list?
- [ ] Do you want to keep the database columns as-is (deprecated) or schedule a migration?
- [ ] Should we keep the utility scripts as documentation or delete them?

---

**Approval Status:** ⏳ AWAITING USER REVIEW

