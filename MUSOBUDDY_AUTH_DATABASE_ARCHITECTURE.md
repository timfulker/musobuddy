# MusoBuddy Authentication & Database Architecture

**Date:** September 17, 2025  
**Status:** Authentication consolidation fix implemented and deployed  
**Current State:** Testing single auth instance to resolve cascade failures

---

## 🔐 Authentication System

### Supabase JWT Authentication
**Dual-environment setup with production-forced frontend**

#### Frontend Client Configuration
- **Environment Mode:** Forced to PRODUCTION to match database UIDs
- **Current Active Project:** `dknmckqaraedpimxdsqq.supabase.co` (PROD)
- **Development Project:** `soihodadevudjohibmbw.supabase.co` (DEV)
- **Client Features:**
  - Auto token refresh enabled
  - Persistent session storage (localStorage)
  - Session detection in URLs
  - Cross-browser session persistence

#### Backend Middleware (`simple-auth.ts`)
- **Project-aware authentication** - automatically detects correct Supabase project from JWT `iss` claim
- **Dual project support** - validates tokens from both dev/prod environments
- **Environment variables required:**
  - `SUPABASE_URL_DEV` + `SUPABASE_ANON_KEY_DEV`
  - `SUPABASE_URL_PROD` + `SUPABASE_ANON_KEY_PROD`
  - `SUPABASE_SERVICE_KEY_DEV` + `SUPABASE_SERVICE_KEY_PROD`

#### User Object Structure
```typescript
interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  tier: string;
  phoneVerified: boolean;
  supabaseUid: string; // Supabase user ID for admin operations
}
```

### Authentication Context (Recently Fixed)
**Problem Solved:** Multiple auth hook instances causing competing token refreshes

#### Previous Issue
- **25+ components** were calling `useAuth()` directly
- Created **7+ competing auth instances**
- Resulted in multiple simultaneous `TOKEN_REFRESHED` events
- Caused cascade `SIGNED_OUT` events destroying sessions

#### Solution Implemented
- **Single auth instance** at root `AuthProvider` level
- **Migrated all components** from `useAuth()` to `useAuthContext()`
- **Centralized auth state** across entire application
- **Files updated:** dashboard, bookings, contracts, invoices, admin, account-settings, messages, conversation, auth pages, components, hooks

#### Current Architecture
```typescript
// Root level (App.tsx)
<AuthProvider>
  <Router />
</AuthProvider>

// All components now use
const { user, isAuthenticated, isLoading } = useAuthContext();
```

---

## 🗄️ Database Architecture

### Dual Database System

#### Primary Database: Neon PostgreSQL
- **Connection:** `DATABASE_URL` environment variable
- **Status:** ✅ Active and ready
- **Purpose:** Main application data storage
- **Connection Details:**
  - Host: `aws-1-eu-west-2.pooler.supabase.com:5432`
  - Database: `postgres`
  - Username: `postgres.soihodadevudjohibmbw`

#### Authentication Database: Supabase
- **DEV Environment:** `SUPABASE_DB_URL_DEV`
- **PROD Environment:** `SUPABASE_DB_URL_PROD`
- **Current Configuration:** Using PROD Supabase for auth
- **Booking Storage:** DISABLED - using Neon connection fallback
- **Purpose:** User authentication, session management

### Database Connection Strategy
```javascript
// Development fallback middleware active for /api/* routes
// Supabase booking storage DISABLED - using Neon connection
```

---

## 🌍 Environment Detection

### Smart Environment Configuration
Located in: `server/core/environment.ts`

#### Production Detection Logic
```typescript
const isProduction = Boolean(process.env.REPLIT_DEPLOYMENT) || 
                    process.env.REPLIT_DEPLOYMENT === 'true' || 
                    process.env.REPLIT_DEPLOYMENT === '1';
```

#### Current Environment Status
- **Detection Mode:** Development (based on `REPLIT_DEPLOYMENT`)
- **Database Mode:** Using production Supabase auth with development settings
- **Server URL:** `https://f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev`

#### Domain Configuration
**Production Domains:**
- Primary: `www.musobuddy.com`
- Replit: `musobuddy.replit.app`

**Development Domain:**
- `f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev`

---

## 🔑 Environment Variables & Secrets

### Available Secrets ✅
All authentication and database credentials are properly configured:

#### Database
- `DATABASE_URL` - Neon PostgreSQL connection string

#### Supabase Authentication
- `SUPABASE_URL_DEV` - Development Supabase project URL
- `SUPABASE_URL_PROD` - Production Supabase project URL
- `SUPABASE_ANON_KEY_DEV` - Development anonymous key
- `SUPABASE_ANON_KEY_PROD` - Production anonymous key
- `SUPABASE_SERVICE_KEY_DEV` - Development service key
- `SUPABASE_SERVICE_KEY_PROD` - Production service key

#### Supabase Frontend Variables
- `VITE_SUPABASE_URL_PRODUCTION` - Frontend production URL
- `VITE_SUPABASE_ANON_KEY_PRODUCTION` - Frontend production key

---

## 🎯 Current Testing Status

### Authentication Fix Implementation
**Date:** September 17, 2025  
**Commit:** `5b1b3f5bd`  
**Rollback Tag:** `rollback-auth-fix-20250917-222547`

#### What Was Fixed
- ✅ Consolidated 25+ `useAuth()` calls to single `useAuthContext()`
- ✅ Eliminated competing auth instances
- ✅ Single `AuthProvider` at root level
- ✅ Centralized auth state management

#### Expected Results
**Before Fix:**
```
SIGNED_IN with session ✅
TOKEN_REFRESHED with session (multiple times) ❌
TOKEN_REFRESHED with session (competing) ❌
SIGNED_OUT no session ❌
[Cascade of SIGNED_OUT events]
```

**After Fix:**
```
SIGNED_IN with session ✅
TOKEN_REFRESHED with session (single) ✅
Clean auth state transitions ✅
No cascade failures ✅
```

### Ready for Testing
The authentication system is now ready for comprehensive testing with the consolidated auth instances. The goal is to verify that users can:

1. **Sign in successfully** without session destruction
2. **Maintain authenticated state** across page navigation
3. **Token refresh cleanly** without conflicts
4. **Access protected routes** without auth loops

---

## 📋 Technical Implementation Notes

### Server Configuration
- **Development server:** Running on `http://0.0.0.0:5000`
- **Database connection:** Confirmed active
- **Route registration:** All authentication routes active
- **Middleware:** Subscription guard and rate limiting configured
- **Session security:** Configured for development environment

### Key Files
- `client/src/contexts/AuthContext.tsx` - Centralized auth context
- `client/src/hooks/useAuth.tsx` - Core authentication hook
- `client/src/lib/supabase.ts` - Frontend Supabase client
- `server/middleware/simple-auth.ts` - Backend auth validation
- `server/core/environment.ts` - Environment detection logic
- `client/src/App.tsx` - Root application with AuthProvider

### Security Features
- JWT token validation
- Automatic token refresh
- Session persistence
- Cross-origin request protection
- Rate limiting on authentication endpoints
- Secure session storage

---

*This document reflects the current state of MusoBuddy's authentication and database architecture following the comprehensive auth instance consolidation fix.*