# MusoBuddy Supabase Authentication System Recreation Guide

## Overview
This document contains everything needed to recreate the WORKING authentication system that successfully handles login for `timfulkermusic@gmail.com`. The system uses standard Supabase patterns with project-aware routing.

## Environment Variables Required

### Backend (Node.js)
```bash
# Development Environment  
SUPABASE_URL_DEV=https://[DEV_PROJECT_ID].supabase.co
SUPABASE_ANON_KEY_DEV=[DEV_ANON_KEY]

# Production Environment
SUPABASE_URL_PROD=https://[PROD_PROJECT_ID].supabase.co  
SUPABASE_ANON_KEY_PROD=[PRODUCTION KEY]

# Database Environment Selection
NODE_ENV=development  # or 'production'
DATABASE_URL_DEV=[DEV DATABASE URL]
DATABASE_URL_PROD=[PROD DATABASE URL]
```

### Frontend (Vite)
```bash
# Development
VITE_SUPABASE_URL_DEV=https://[DEV_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY_DEV=[DEV_ANON_KEY]

# Production  
VITE_SUPABASE_URL_PRODUCTION=https://[PROD_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY_PRODUCTION=[PRODUCTION KEY]
```

## Core Architecture

### 1. Project-Aware Authentication Middleware (`server/middleware/simple-auth.ts`)

**Key Concept**: Parse JWT `iss` claim to identify which Supabase project (dev/prod) issued the token, then select the appropriate Supabase client.

```typescript
import { type Request, type Response, type NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../core/storage';

// Project mapping - maps Supabase URLs to anon keys
const PROJECT_CONFIGS = {
  [process.env.SUPABASE_URL_DEV!]: process.env.SUPABASE_ANON_KEY_DEV!,
  [process.env.SUPABASE_URL_PROD!]: process.env.SUPABASE_ANON_KEY_PROD!,
};

// Parse JWT to get issuer (project URL)
function parseTokenIss(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload.iss?.replace('/auth/v1', '') || null;
  } catch {
    return null;
  }
}

export const simpleAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // 1. Extract Bearer token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 2. Parse token to get project URL from iss claim
  const issUrl = parseTokenIss(token);
  console.log(`🔍 [SIMPLE-AUTH] Token iss: ${issUrl}`);
  
  // 3. Select correct Supabase client based on token's project
  const anonKey = issUrl ? PROJECT_CONFIGS[issUrl] : null;
  if (!anonKey) {
    console.log(`❌ [SIMPLE-AUTH] No config found for project: ${issUrl}`);
    return res.status(401).json({ error: 'Invalid project' });
  }

  const supabase = createClient(issUrl!, anonKey);
  console.log(`✅ [SIMPLE-AUTH] Using project: ${issUrl}`);

  // 4. Use Supabase's built-in user verification
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user?.email) {
    console.log(`❌ [SIMPLE-AUTH] Supabase getUser failed:`, error?.message);
    return res.status(401).json({ error: 'Invalid token' });
  }

  console.log(`🔍 [SIMPLE-AUTH] Supabase user verified: ${user.email}`);

  // 5. Get user from database by supabaseUid (with email fallback)
  let dbUser = await storage.getUserBySupabaseUid?.(user.id);
  if (!dbUser) {
    dbUser = await storage.getUserByEmail(user.email);
  }
  
  if (!dbUser) {
    console.log(`❌ [SIMPLE-AUTH] Database user not found: ${user.email}`);
    return res.status(404).json({ error: 'User not found' });
  }

  // 6. Attach user to request
  req.user = {
    id: dbUser.id,
    email: dbUser.email || '',
    emailVerified: !!user.email_confirmed_at,
    firstName: dbUser.firstName || '',
    lastName: dbUser.lastName || '',
    isAdmin: dbUser.isAdmin || false,
    tier: dbUser.tier || 'free',
    phoneVerified: dbUser.phoneVerified || false
  };

  console.log(`✅ [SIMPLE-AUTH] Authentication successful for: ${dbUser.email}`);
  next();
};
```

### 2. Frontend Supabase Client (`client/src/lib/supabase.ts`)

**Key Concept**: Environment-aware client that automatically switches between dev/prod based on Vite's MODE.

```typescript
import { createClient } from '@supabase/supabase-js'

// Determine environment - Vite uses import.meta.env.MODE
const isDevelopment = import.meta.env.MODE === 'development'

// Select appropriate credentials based on environment
const supabaseUrl = isDevelopment
  ? import.meta.env.VITE_SUPABASE_URL_DEV
  : (import.meta.env.VITE_SUPABASE_URL_PRODUCTION || import.meta.env.VITE_SUPABASE_URL)

const supabaseAnonKey = isDevelopment
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY_DEV || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndraHJ6Y3B2Z2hkbGhueHpocmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjEzNjMsImV4cCI6MjA3MzMzNzM2M30.Li_pGOBIHGPHV-hrEG6Lf7SrHRj1D4tzJ_xM9KAMaBc')
  : (import.meta.env.VITE_SUPABASE_ANON_KEY_PRODUCTION || import.meta.env.VITE_SUPABASE_ANON_KEY)

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage // Persist authentication across browser sessions
  }
})
```

### 3. Database User Schema Requirements

**Critical**: The database MUST have a users table with these fields for authentication to work:

```typescript
// Minimum required fields in users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),  // User primary key
  email: varchar("email").unique(),          // Email for lookup
  supabaseUid: text("supabase_uid").unique(), // Supabase user ID (CRITICAL)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  isAdmin: boolean("is_admin").default(false),
  tier: varchar("tier").default("free"), // or text/varchar as needed
  phoneVerified: boolean("phone_verified").default(false),
  // ... other fields as needed
});
```

**CRITICAL**: The `supabaseUid` field must exist and be populated with the Supabase user ID for authentication to work.

## Database User Lookup Requirements

The storage layer MUST implement:

```typescript
// In storage interface
getUserBySupabaseUid(supabaseUid: string): Promise<User | null>
getUserByEmail(email: string): Promise<User | null>
```

Current working example in development:
- Email: `[TEST_USER_EMAIL]`
- Supabase UID: `[TEST_USER_SUPABASE_UID]` (development)
- Database ID: `[TEST_USER_DATABASE_ID]`

## Authentication Flow

1. **Frontend Login**: User enters credentials → Supabase handles authentication → Frontend gets JWT token
2. **API Requests**: Frontend sends JWT token in `Authorization: Bearer <token>` header
3. **Backend Middleware**: 
   - Extracts JWT token
   - Parses `iss` claim to identify project (dev vs prod)
   - Selects correct Supabase client from PROJECT_CONFIGS
   - Calls `supabase.auth.getUser(token)` for verification
   - Looks up user in database by `supabaseUid` (with email fallback)
   - Attaches user object to `req.user`
4. **Route Handlers**: Access authenticated user via `req.user`

## Testing Verification

**Working State**: 
- ✅ Login works for `timfulkermusic@gmail.com` in development
- ✅ Token verification works via backend middleware
- ✅ Database user lookup successful
- ✅ Project-aware routing between dev/prod environments

**Logs to Verify Success**:
```
🔍 [SIMPLE-AUTH] Token iss: https://[DEV_PROJECT_ID].supabase.co
✅ [SIMPLE-AUTH] Using project: https://[DEV_PROJECT_ID].supabase.co
🔍 [SIMPLE-AUTH] Supabase user verified: [TEST_USER_EMAIL]
✅ [SIMPLE-AUTH] Authentication successful for: [TEST_USER_EMAIL]
```

## Recreation Steps

1. **Set Environment Variables** (see sections above)
2. **Create Authentication Middleware** (`server/middleware/simple-auth.ts`)
3. **Create Frontend Supabase Client** (`client/src/lib/supabase.ts`)
4. **Ensure Database Schema** has `users` table with `supabaseUid` field
5. **Implement Storage Methods** for user lookup by Supabase UID and email
6. **Apply Middleware** to protected routes
7. **Test Login** with known working credentials

## Current Environment Status

**Development Environment**:
- Project: `[DEV_PROJECT_ID].supabase.co`
- Database: Uses `DATABASE_URL_DEV`
- Working user: `[TEST_USER_EMAIL]` with UID `[TEST_USER_SUPABASE_UID]`

**Production Environment**:
- Project: `[PROD_PROJECT_ID].supabase.co`  
- Database: Uses `DATABASE_URL_PROD`
- Schema mismatch issues exist

---

**This system is WORKING and can be recreated in ~2 minutes using this guide.**