# MusoBuddy Architecture Rebuild Plan

## Current Problems
- 27 server files with overlapping functionality
- Multiple webhook systems doing the same thing
- Duplicate route handlers causing conflicts
- TypeScript errors from mismatched interfaces
- Authentication issues throughout

## Simple, Clean Architecture

### Core Server Structure
1. **server/index.ts** - Main server, webhook handler, basic middleware
2. **server/routes.ts** - All API routes in one place
3. **server/storage.ts** - Database operations
4. **shared/schema.ts** - Database schema and types
5. **server/services/** - Clean service layer

### Service Layer (One file per service)
- **email-service.ts** - Handle email webhooks and parsing
- **booking-service.ts** - Booking CRUD operations
- **contract-service.ts** - Contract generation and management
- **invoice-service.ts** - Invoice creation and tracking
- **auth-service.ts** - Authentication handling

### Frontend Pages (Working)
- Dashboard, Bookings, Contracts, Invoices, Settings
- All pages exist and should work once backend is stable

## Implementation Plan
1. Fix TypeScript errors in server/index.ts
2. Consolidate webhook handling into single clean function
3. Remove duplicate files and conflicting systems
4. Test core functionality (bookings, email webhook)
5. Ensure authentication works properly

## Success Criteria
- Email to leads@mg.musobuddy.com creates booking
- User can view/edit bookings in the app
- No TypeScript errors
- Clean, maintainable code structure