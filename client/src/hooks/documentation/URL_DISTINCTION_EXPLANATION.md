# URL Distinction Explanation - MusoBuddy SaaS Platform

## Overview

This document explains how URLs and user identification work in the MusoBuddy platform, addressing common confusion between environment URLs and user session management.

## The Core Distinction

### URLs = Server Environment (Same for All Users)
URLs identify **which server** to contact, not **which user** is making the request.

**Development Environment:**
- URL: `https://f19aba74-886b-4308-a2de-cc9ba5e94af8-00-2ux7uy3ch9t9f.janeway.replit.dev`
- Used during: Development, testing, feature building

**Production Environment:**
- URL: `https://musobuddy.replit.app`
- Used for: Live customer interactions, real business data

### User Identification = Session Cookies (Different for Each User)
User identification happens through session cookies, not URLs.

```
User 1: Session Cookie abc123 → User ID 43963086 (Tim Fulker)
User 2: Session Cookie def456 → User ID 78945612 (Jenny)
```

## How It Works in Practice

### 1. Authentication Flow
```
User logs in → Server creates session → Browser gets session cookie
                                    ↓
               All future requests include this cookie
                                    ↓
            Server reads cookie → Identifies user → Returns user's data
```

### 2. API Request Example
```javascript
// Browser automatically sends with every request:
Cookie: connect.sid=abc123

// Server processes:
const userId = req.session?.userId;  // Gets "43963086" from session abc123
const user = await storage.getUserById(userId);  // Finds Tim Fulker's data
```

### 3. Email Webhook Example
```javascript
// Email arrives at: leads+timf@mg.musobuddy.com
const customPrefix = 'timf';  // Extract from email address
const user = users.find(u => u.emailPrefix === customPrefix);
// Creates booking for the correct user automatically
```

## The Major Issue This Solved

### Previous Problem: URL Confusion
Before centralized environment detection, different parts of the system used different URLs:

- Contract signing pages → Wrong server URL → API calls failed
- Session cookies → Created on wrong domain → Authentication failed  
- Stripe callbacks → Returned to wrong URL → Payment flow broken
- Email webhooks → Couldn't find correct API → Data loss

### Solution: Centralized Environment Detection
Created single authoritative system (`server/core/environment.ts`) that:

- ✅ Detects environment automatically
- ✅ Provides correct URLs for all components
- ✅ Ensures session cookies match domains
- ✅ Prevents cross-environment conflicts

## Session Cookie Management

### Current Cookie Settings
```javascript
cookie: {
  secure: true,              // HTTPS only (production)
  httpOnly: true,            // Can't be accessed by JavaScript (security)
  maxAge: 24 * 60 * 60 * 1000, // 24 hours expiry
  sameSite: 'lax',          // Moderate security level
  domain: undefined         // Same origin only
}
```

### What Happens When Users Clear Cookies

**Immediate Effect:**
- Session cookie deleted
- User logged out instantly
- Must re-authenticate (email + password + SMS)

**What's Protected:**
- All business data remains in PostgreSQL database
- Bookings, contracts, invoices, client records preserved
- User settings and preferences maintained

**Common Scenarios:**
- **Private browsing:** Session lost when browser closes
- **Browser updates:** Session typically preserved
- **Manual clearing:** Complete logout required
- **Daily expiry:** Automatic logout after 24 hours

## Key Architecture Benefits

### Single URL per Environment
- All users share same server URLs
- No user-specific URL complexity
- Simplified deployment and maintenance

### Session-Based User Separation
- Clean separation between environment and user concerns
- Secure authentication through httpOnly cookies
- Automatic user data routing without URL complexity

### Centralized Configuration
- Single source of truth for environment detection
- Consistent behavior across all system components
- Eliminates URL/domain mismatch bugs

## Technical Implementation

### Environment Detection Priority
1. **APP_SERVER_URL** (explicit override)
2. **REPLIT_DEPLOYMENT** (production deployment)
3. **REPLIT_ENVIRONMENT=production** (production indicator)
4. **REPLIT_DEV_DOMAIN** (development on Replit)
5. **localhost:5000** (local development fallback)

### Session Storage
- **PostgreSQL sessions table** stores session data
- **Session IDs** map to user accounts
- **Automatic cleanup** of expired sessions
- **Cross-request persistence** for user state

## Security Considerations

### Cookie Security Features
- **HttpOnly:** Prevents JavaScript access (XSS protection)
- **Secure:** HTTPS-only transmission in production
- **SameSite:** Cross-site request protection
- **Domain restriction:** Same-origin only access

### Session Management
- **24-hour expiry:** Automatic security timeout
- **Database storage:** Persistent across server restarts
- **Invalid session cleanup:** Automatic user logout on corruption

## Business Impact

### For Users
- Seamless experience across all features
- Secure authentication with automatic logout
- No data loss when cookies cleared (re-login required)

### For Platform
- Reliable URL routing in all environments
- Consistent authentication behavior
- Simplified debugging and maintenance
- Scalable multi-user architecture

---

## Summary

**URLs** determine which server to contact (development vs production).  
**Session cookies** determine which user's data to return.  

This separation allows multiple users to share the same platform URLs while maintaining complete data isolation through secure session management.

The centralized environment detection system ensures all components use correct URLs, eliminating a major category of bugs related to cross-environment URL confusion.