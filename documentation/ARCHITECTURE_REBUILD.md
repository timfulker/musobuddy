# MusoBuddy Architecture Rebuild - Phase 1

## Current Problem
- 27 server files with overlapping functionality
- 68 TypeScript errors from duplicate functions
- Systems that work independently but break when combined
- Endless "whack-a-mole" bug fixing cycle

## Solution: Clean Architecture Foundation

### Step 1: Core Server Consolidation (60 minutes)
**Target:** Reduce 27 files to 5 core files
- `server/index.ts` - Main server setup
- `server/routes.ts` - All API endpoints  
- `server/storage.ts` - Clean database operations
- `server/auth.ts` - Authentication only
- `server/email-webhook.ts` - Email parsing only

### Step 2: Remove All Duplicates (45 minutes)
- Single email webhook handler (not 3 competing ones)
- Single authentication system (not multiple overlapping ones)
- Single database connection (not scattered connections)
- Single contract service (not duplicate parsers)

### Step 3: Verify Core Workflows (60 minutes)
- Email → Booking creation ✅
- Login → Dashboard access ✅  
- Contract generation → PDF → Cloud storage ✅
- Invoice creation → PDF → Email delivery ✅

### Step 4: TypeScript Error Resolution (45 minutes)
- Fix all 68 errors by removing duplicates
- Clean type definitions
- Proper error handling

## Expected Outcome
- Stable foundation that doesn't regress
- Clear separation of concerns
- Each feature in one place only
- Easy to extend without breaking existing features

## Starting Now: Server Index Cleanup