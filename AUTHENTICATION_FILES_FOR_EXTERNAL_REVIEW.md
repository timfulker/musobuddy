# Authentication System Files for External Review

## Critical Authentication Files

### Frontend Authentication
1. **client/src/hooks/useAuth.tsx** - Main authentication hook
2. **client/src/App.tsx** - Routing and authentication checks (lines 36-101)
3. **client/src/pages/login.tsx** - Login form and authentication flow
4. **client/src/pages/admin-login.tsx** - Admin bypass login page
5. **client/src/pages/signup.tsx** - User registration with phone verification
6. **client/src/pages/verify-phone.tsx** - Phone verification code entry page
7. **client/src/lib/queryClient.ts** - API request handling and error management

### Backend Authentication
6. **server/core/auth-production.ts** - Authentication middleware and routes
7. **server/core/token-auth.ts** - JWT token authentication system (latest attempt)
8. **server/core/sms-service.ts** - SMS verification service with Twilio integration
9. **server/core/environment.ts** - Environment detection system
10. **server/index.ts** - Main server setup with session configuration (lines 263-295)
11. **server/core/storage.ts** - User authentication methods

### Database & Schema
12. **shared/schema.ts** - User schema and database structure (includes phoneVerifications table)
13. **server/core/database.ts** - Database connection and configuration

## Current Issue
User login succeeds on backend (confirmed via curl tests) but frontend authentication state detection fails, causing redirect loop back to landing page instead of dashboard access.

## Backend Test Results (Working)
```bash
# Login test - SUCCESS
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"timfulker@gmail.com","password":"MusoBuddy2025!"}' \
  -c cookies.txt
# Returns: {"success":true,"message":"Login successful","user":{...}}

# User verification test - SUCCESS  
curl -X GET http://localhost:5000/api/auth/user -b cookies.txt
# Returns: {"id":1,"email":"timfulker@gmail.com",...}
```

## Frontend Issues (Failing)
- Session cookies not being set/persisted in browser
- Authentication state always returns null/undefined
- Redirect loops between / and /dashboard
- 401 errors on /api/auth/user endpoint from browser

## Environment Variables
```
REPLIT_DEPLOYMENT: ''
REPLIT_ENVIRONMENT: 'production'  
NODE_ENV: ''
REPLIT_DEV_DOMAIN: 'f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev'
SESSION_SECRET: [Present]
```

## Admin Credentials
- Email: timfulker@gmail.com
- Password: MusoBuddy2025!
- Should bypass all verification requirements

## Latest Console Errors
```
api/auth/user:1  Failed to load resource: the server responded with a status of 401 ()
🔍 Auth check response: 401
❌ User not authenticated
api/auth/verify-phone:1  Failed to load resource: the server responded with a status of 400 ()
🔍 No token provided in request (repeated 100+ times)
```

## SMS Verification Issues
- Phone verification endpoint returning 400 errors
- Regular users cannot complete login due to SMS verification failures
- Admin users should bypass SMS verification entirely
- Twilio integration may have credential or configuration issues

### SMS-Related Files Requiring Review
- **server/core/sms-service.ts** - Twilio SMS service implementation
- **client/src/pages/verify-phone.tsx** - Phone verification UI
- **client/src/pages/signup.tsx** - Registration with SMS verification
- **verify-phone-twilio.js** - Twilio phone verification helper script
- **shared/schema.ts** - phoneVerifications table schema

### SMS Environment Variables
```
TWILIO_ACCOUNT_SID: [Required for SMS]
TWILIO_AUTH_TOKEN: [Required for SMS]  
TWILIO_PHONE_NUMBER: [Required for SMS sending]
```

### SMS Error Scenarios
1. **Twilio Trial Restrictions** - Unverified phone numbers blocked
2. **Configuration Missing** - Missing Twilio credentials
3. **Phone Number Format** - UK number normalization issues
4. **Rate Limiting** - SMS sending frequency restrictions
5. **Environment Detection** - Production vs development SMS behavior

## Authentication Flow Attempts
1. Session-based (original) - Failed due to domain forwarding
2. Enhanced CORS/session config - Failed due to cookie security
3. Environment detection fixes - Failed due to production/dev conflicts  
4. JWT token authentication - Failed, tokens not reaching backend

## Critical Next Steps
1. Fix domain forwarding cookie persistence
2. Ensure session/token authentication works in browser
3. Test complete login flow from frontend to dashboard
4. Verify both admin and user login capabilities

## Technical Requirements for Fix
- Must work with musobuddy.replit.app → janeway.replit.dev forwarding
- Must handle both session and token authentication
- Must work in Replit's hosting environment
- Must provide immediate dashboard access after login