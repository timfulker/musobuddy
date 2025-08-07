# Critical Files Related to Current Issues

## Core Problem Areas
1. **Invoice Sending (401 Authentication Error)**
2. **Parameter Order Mismatches in Storage Functions**
3. **Missing Endpoints (404 errors: bookings, conflicts, compliance)**
4. **JWT Authentication Inconsistencies**

## File List by Problem Area

### 1. Authentication/JWT Issues
**Frontend:**
- `client/src/hooks/useAuth.tsx` - Auth hook that manages JWT tokens
- `client/src/lib/queryClient.ts` - API request wrapper that should include auth headers
- `client/src/pages/invoices.tsx` - Invoice send function missing proper auth (lines 505-545)
- `client/src/pages/auth/login.tsx` - Where JWT tokens are stored to localStorage
- `client/src/pages/auth/signup.tsx` - Also stores JWT tokens to localStorage

**Backend:**
- `server/core/auth.ts` - JWT verification middleware
- `server/routes/auth-routes.ts` - Authentication endpoints
- `server/routes/invoice-routes.ts` - Invoice endpoints expecting JWT auth

### 2. Storage Parameter Mismatches
**Storage Wrapper:**
- `server/core/storage.ts` - Main storage wrapper with function signatures

**Storage Implementations:**
- `server/storage/invoice-storage.ts` - Invoice storage implementation (updateInvoice had wrong param order)
- `server/storage/contract-storage.ts` - Contract storage implementation
- `server/storage/booking-storage.ts` - Booking storage implementation
- `server/storage/misc-storage.ts` - Misc storage functions

### 3. Missing Endpoints (404 Errors)
**Route Registration:**
- `server/index.ts` - Main server file that mounts routes
- `server/routes/index.ts` - Route aggregator that exports all routes

**Missing Route Files:**
- `server/routes/booking-routes.ts` - Bookings endpoint (may not be registered)
- `server/routes/conflict-routes.ts` - Conflicts endpoint (may not exist)
- `server/routes/compliance-routes.ts` - Compliance endpoint (may not be registered)

### 4. Core System Files
**Server Entry:**
- `server/index.ts` - Express server setup
- `server/routes/index.ts` - Route registration

**Database:**
- `shared/schema.ts` - Database schema definitions
- `drizzle.config.ts` - Database configuration

## Most Likely Root Cause Files

Based on the pattern of issues, the problem is likely in:

1. **`server/routes/index.ts`** - Routes not being properly exported/registered
2. **`server/index.ts`** - Routes not being properly mounted
3. **`client/src/lib/queryClient.ts`** - API requests not including auth headers consistently
4. **`server/core/storage.ts`** vs individual storage files - Parameter mismatches

## Critical Fix Locations

### Invoice Send Email (Current Issue)
- **File:** `client/src/pages/invoices.tsx`
- **Lines:** 514-530
- **Problem:** Wrong token key being used for JWT auth

### Parameter Order Issues
- **Files:** All storage implementation files in `server/storage/`
- **Problem:** Functions in storage.ts wrapper have different parameter order than implementations

### Missing Endpoints
- **File:** `server/routes/index.ts`
- **Problem:** Some routes may not be exported or registered

## Testing Commands
```bash
# Check if routes are registered
grep -r "router\|Router" server/routes/

# Check storage function signatures
grep -n "updateInvoice" server/core/storage.ts server/storage/invoice-storage.ts

# Check JWT middleware usage
grep -r "authenticateUser" server/routes/
```

## Summary
The core issue appears to be a systematic disconnect between:
1. How the frontend sends authentication (JWT tokens)
2. How the backend expects authentication
3. Parameter order between storage wrapper and implementations
4. Route registration in the main server file

All these issues seem to stem from incomplete refactoring or migration from session-based to JWT-based authentication.