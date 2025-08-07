# MusoBuddy Technical Issues Synopsis
**Date:** August 7, 2025  
**For:** Third-party developer handoff  
**Priority:** CRITICAL - Affects user's livelihood (contract signing workflow)

## Current Application State
- **Production URL:** www.musobuddy.com
- **Technology Stack:** React/TypeScript frontend, Node.js/Express backend, PostgreSQL database
- **Critical Business Function:** Digital contract signing and invoice management for musicians

## Recently Fixed Issues (Aug 7, 2025)
✅ **Invoice Email Authentication** - Fixed JWT token extraction logic  
✅ **Invoice PDF Template** - Added client phone/address display  
✅ **Invoice Deletion Error Handling** - Improved error messages and validation  
✅ **Storage Layer Parameter Alignment** - Fixed parameter order mismatches in invoice operations  

## Current Critical Issues

### 1. Authentication System Reliability
**Problem:** Inconsistent JWT token validation between development and production
- Development: Works with simple test tokens
- Production: Intermittent 401 "Invalid or expired token" errors
- **Impact:** Users cannot access core functionality randomly

**Technical Details:**
- Token extraction logic in `server/core/auth.ts`
- Middleware in `server/routes/*/` files may have inconsistent auth patterns
- Session management conflicts between JWT and potential session middleware

### 2. Contract Signing Workflow (HIGHEST PRIORITY)
**Problem:** Contract signing occasionally fails in production
- PDF generation works in development
- Email delivery inconsistent in production
- **CRITICAL:** This directly affects user's business revenue

**Technical Details:**
- Puppeteer PDF generation in `server/core/contract-pdf-generator.ts`
- Mailgun integration in `server/core/services.ts`
- Cloudflare R2 storage for contract PDFs
- Email template rendering issues

### 3. Database Operations Reliability
**Problem:** Systemic parameter order mismatches between storage wrappers and implementations

**Affected Areas:**
- `server/storage/invoice-storage.ts` vs `server/core/storage.ts`
- `server/storage/contract-storage.ts` patterns
- `server/storage/booking-storage.ts` operations

**Pattern:** Wrapper functions call implementations with incorrect parameter order, causing silent failures or 500 errors.

### 4. API Endpoint 404 Errors
**Problem:** Multiple endpoints returning 404 in production that work in development

**Affected Endpoints:**
- `/api/bookings/*` routes
- `/api/compliance/*` routes  
- `/api/contracts/*/conflicts` route
- Bulk delete operations

### 5. Production vs Development Inconsistencies
**Problem:** Code works in development but fails in production deployment

**Key Differences:**
- Environment variable handling
- Database connection pooling
- File storage paths (Cloudflare R2)
- Email service configuration (Mailgun domains)

## System Architecture Issues

### Authentication Flow
```
Client → JWT Token → Express Middleware → Route Handler → Database
```
**Problem:** Middleware chain has inconsistent token validation logic

### Storage Layer Architecture
```
Routes → Storage Wrapper → Storage Implementation → Database
```
**Problem:** Parameter misalignment between wrapper and implementation layers

### Email/PDF Generation
```
Route → PDF Generator → Cloudflare R2 → Email Service → Client
```
**Problem:** Error handling inadequate, fails silently in production

## Critical Files for Review
1. `server/core/auth.ts` - Authentication middleware
2. `server/routes/invoice-routes.ts` - Recently fixed but needs validation
3. `server/routes/contract-routes.ts` - Contract signing workflow
4. `server/core/storage.ts` - Storage wrapper layer
5. `server/storage/*.ts` - All storage implementations
6. `server/core/services.ts` - Email/external service integration

## Recommended Investigation Approach

### Phase 1: Authentication Stabilization
1. Audit all JWT token handling across routes
2. Ensure consistent middleware patterns
3. Implement comprehensive error logging

### Phase 2: Storage Layer Audit
1. Compare parameter signatures between wrappers and implementations
2. Fix parameter order mismatches systematically
3. Add input validation at storage layer

### Phase 3: Production Environment Validation
1. Environment variable verification
2. Database connection testing under load
3. Email service configuration validation

### Phase 4: Contract Signing Workflow Testing
1. End-to-end testing of PDF generation
2. Email delivery verification
3. Cloudflare R2 storage validation

## Business Impact Assessment
- **HIGH:** Contract signing failures = lost revenue
- **MEDIUM:** Invoice management issues = administrative delays  
- **MEDIUM:** Authentication issues = user frustration, potential churn
- **LOW:** Minor UI/UX inconsistencies

## Development Environment Setup
- **Database:** PostgreSQL via Neon
- **Storage:** Cloudflare R2 for PDFs
- **Email:** Mailgun service
- **Authentication:** JWT-based (no sessions)
- **Deployment:** Replit hosting

## Key Dependencies to Verify
- `@anthropic-ai/sdk` - AI contract parsing
- `puppeteer` - PDF generation  
- `mailgun.js` - Email delivery
- `drizzle-orm` - Database operations
- `@stripe/stripe-js` - Payment processing

## Next Steps Priority
1. **IMMEDIATE:** Validate contract signing workflow end-to-end
2. **HIGH:** Stabilize authentication system reliability
3. **MEDIUM:** Fix storage layer parameter mismatches
4. **LOW:** Address minor endpoint 404 errors

## Contact Notes
- User requires simple, non-technical communication
- Contract signing is critical for business operations
- Recent fixes have improved invoice functionality
- Production deployment required for testing fixes

---
**Prepared by:** MusoBuddy Development Team  
**Status:** Ready for third-party developer handoff