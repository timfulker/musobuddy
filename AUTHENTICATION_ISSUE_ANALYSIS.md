# Authentication System Issue Analysis

## Core Problem
The authentication system is returning HTML login pages instead of JSON error responses, causing "Unexpected token <!DOCTYPE" errors throughout the application.

## Root Cause
While the authentication middleware functions (`isAuthenticated` and `isAdmin`) correctly return JSON responses, the actual authentication failure is likely happening before these middleware functions are reached.

## Evidence
1. **Working API Call**: `/api/admin/users` returns actual JSON data when properly authenticated
2. **Authentication Status**: Login works and user data is accessible
3. **Admin Panel Errors**: Frontend getting HTML instead of JSON for authenticated requests
4. **Contract Emails**: Failing because they depend on authenticated getUserSettings() calls

## Key Files for Authentication Fix

### Primary Files:
1. **server/core/auth.ts** - Authentication setup and middleware
2. **server/core/routes.ts** - API route authentication requirements  
3. **client/src/pages/admin.tsx** - Frontend admin panel making failing requests
4. **client/src/hooks/useAuth.tsx** - Authentication hook handling sessions

## Critical Investigation Areas

### 1. Session Management
- Are sessions being properly maintained across requests?
- Is the session store working correctly with PostgreSQL?
- Are cookies being sent with authenticated requests?

### 2. Middleware Application
- Are the `isAuthenticated`/`isAdmin` middleware being applied to the right routes?
- Are there routes bypassing authentication that should require it?
- Is the middleware chain working correctly?

### 3. Frontend Request Headers
- Are authenticated requests including proper credentials?
- Is the frontend properly handling authentication state?
- Are cookies being sent with API requests?

## Expected vs Actual Behavior

### Expected:
- Failed authentication returns JSON: `{"message": "Authentication required"}`
- Admin panel receives proper error messages
- Contract confirmation emails work after signing

### Actual:
- Failed authentication returns HTML login page
- Admin panel crashes with DOCTYPE parsing errors
- Contract confirmation emails don't send due to authentication failures

## Fix Priority
1. **Authentication middleware** - Ensure it returns JSON, not HTML redirects
2. **Admin panel requests** - Fix credential handling in frontend
3. **Contract confirmation emails** - Should work once authentication is fixed
4. **Session persistence** - Verify session storage is working properly

## Test Cases Needed
1. Test admin panel API calls with valid authentication
2. Test authentication middleware with invalid/missing credentials
3. Test contract signing flow with proper user settings access
4. Verify session persistence across browser refreshes