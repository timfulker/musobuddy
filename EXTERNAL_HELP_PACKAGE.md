# External Help Package - Authentication & Contract Email Issues

## Problem Summary
Authentication system returning HTML pages instead of JSON responses, causing "Unexpected token <!DOCTYPE" errors that break:
1. Admin panel functionality 
2. Contract confirmation emails (emails not sent after successful contract signing)
3. All authenticated API endpoints

## Current Status
- ✅ Basic login/logout works (user can authenticate)
- ✅ Database connections stable 
- ✅ Contract signing mechanics work (status updates to 'signed')
- ❌ Admin panel crashes with HTML response parsing errors
- ❌ Contract confirmation emails never send after signing
- ❌ Authenticated API calls return HTML instead of JSON

## Root Issue
Authentication middleware appears correct but authenticated requests are getting HTML login redirects instead of JSON error responses. This cascades to break contract confirmation emails because they depend on getUserSettings() calls that require authentication.

## Files Needed for Analysis

### 1. Authentication System Core
- **server/core/auth.ts** - Authentication setup, middleware, session management
- **server/core/routes.ts** - API routes with authentication requirements
- **server/core/storage.ts** - Database operations including getUserSettings()

### 2. Frontend Authentication
- **client/src/hooks/useAuth.tsx** - Authentication state management
- **client/src/pages/admin.tsx** - Admin panel making failing authenticated requests
- **client/src/lib/queryClient.ts** - API request handling

### 3. Contract Email System
- **server/core/mailgun-email-restored.ts** - Email sending logic dependent on authentication
- **shared/schema.ts** - Database schema definitions

### 4. Problem Documentation
- **AUTHENTICATION_ISSUE_ANALYSIS.md** - Detailed technical analysis
- **CONTRACT_CONFIRMATION_EMAIL_ISSUE.md** - Contract email problem details

## Key Investigation Areas

### Authentication Flow Issues:
1. **Session Management**: PostgreSQL session store may not be properly configured
2. **Cookie Handling**: Frontend may not be sending cookies with authenticated requests
3. **Middleware Chain**: Authentication middleware may not be applied correctly to routes
4. **Response Headers**: Authenticated failures returning HTML redirects instead of JSON

### Contract Email Dependencies:
1. **getUserSettings() calls**: Failing due to authentication issues during contract signing
2. **Email Trigger Logic**: Confirmation emails depend on authenticated user data access
3. **Mailgun Integration**: Email system works but can't access user settings to send

## Expected Behavior
- Failed authentication should return JSON: `{"message": "Authentication required"}`
- Admin panel should receive proper JSON responses
- Contract signing should trigger confirmation emails to both client and performer
- All API endpoints should return JSON, never HTML

## Current Error Pattern
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```
This indicates HTML login pages being returned instead of JSON API responses.

## Success Criteria
1. Admin panel loads without JavaScript errors
2. Contract signing triggers confirmation emails to both parties
3. All authenticated API calls return proper JSON responses
4. Authentication errors return JSON error messages, not HTML pages

## Technical Environment
- Node.js/Express backend with TypeScript
- React frontend with Tanstack Query
- PostgreSQL database via Neon
- Passport.js authentication with local strategy
- Mailgun email service integration