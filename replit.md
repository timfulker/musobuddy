# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform designed to streamline administrative tasks for musicians, allowing them more time for their craft. It provides tools for managing bookings, contracts, invoices, and compliance requirements. The platform aims to be user-friendly, reliable, and scalable, offering a centralized solution for common music business challenges with significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.
Response priority: Immediate responsiveness - user must be able to interrupt at any moment without queue delays.
Contract signing: User wants only ONE simple sign contract button, no redundant "click to sign box" above it - simplified single-stage signing process.
Email notifications: Both client AND performer receive confirmation emails when contracts are signed (fixed 07/08/2025).
Problem-solving approach: When user reports "X was working last week but now it's broken" - FIND and RESTORE the original working system rather than rebuilding from scratch. This avoids creating conflicting duplicate systems.
Authentication system: DO NOT rebuild authentication system from scratch - causes more problems than it solves by creating conflicting duplicate systems. Make minimal surgical fixes only.
Lead email format: User prefers clean email format without "leads" prefix - uses `prefix@enquiries.musobuddy.com` instead of `prefix-leads@mg.musobuddy.com` (updated 08/08/2025).
Email webhook: Mailgun webhook for email routing hardcoded to `https://www.musobuddy.com/api/webhook/mailgun` for production reliability (fixed 08/08/2025).
System reliability: Comprehensive 4-phase fix applied (11/08/2025) addressing "architectural debt collapse" with enterprise-grade reliability for contract signing, unified authentication middleware, storage audit, and real-time system health monitoring.
Stripe integration: Unified signup flow where ALL users (including free trial) must go through Stripe first to register credit cards. 30-day free trial period. Can deploy with TEST keys for testing, switch to LIVE keys for production launch (updated 11/08/2025).

## Recent Updates (09/08/2025)
- DATABASE SAFETY IMPLEMENTATION: Production-grade database management with backwards compatibility
  - Environment-aware database connections: DATABASE_URL_DEV for development (optional), DATABASE_URL for production
  - Production safety guards preventing accidental destructive operations on live data
  - Clear environment logging showing which database environment is active
  - Safe CLI operations script (`scripts/db-safe.js`) with explicit production operation protection
  - Backwards compatible: works with existing single DATABASE_URL setup
- CRITICAL AUTHENTICATION CLEANUP: Removed shared token vulnerability
  - Created centralized `authToken.ts` utility for consistent token management
  - Fixed cross-user authentication conflicts caused by shared `authToken_dev_admin` key
  - Updated all frontend files to use user-specific token storage
  - Cleaned up dead authentication code across codebase
  - Prevents users from accidentally switching accounts

## Previous Updates (08/08/2025)
- CRITICAL FIX: Email processing user assignment issue resolved:
  - Fixed webhook user lookup system that was assigning bookings to wrong user accounts
  - Corrected admin account email prefix setup (now "admin@enquiries.musobuddy.com")
  - Updated Settings page to display actual email prefix instead of placeholder text
  - Enhanced settings API to include user email prefix data
- CRITICAL FIX: Settings reset issue identified and resolved:
  - Root cause: Authentication mixing up admin (43963086) vs personal (1754488522516) account access
  - Fixed frontend to use PATCH instead of POST for settings updates
  - Prevent settings loading wrong user account data
- AUTHENTICATION CLEANUP: Removed dead authentication code:
  - Deleted unused `auth-validation.ts` file (never imported, 55 lines of dead code)
  - Fixed hardcoded admin ID in `requireAdmin` middleware - now uses database lookup
  - Updated frontend token storage to use user-specific keys instead of shared `authToken_dev_admin`
  - All routes continue using main `auth.ts` system (283 lines, actively maintained)
- Fixed critical AI date defaulting issue in email parsing:
  - Removed "Today is [date]" from AI prompt to prevent date assumptions
  - Enhanced keyword detection for price enquiries
  - Messages without explicit dates now route to Review Messages instead of creating bookings
  - Added validation to catch and correct AI date defaults
- Email system architectural fix: Removed "leads+" prefix format, now uses clean "prefix@enquiries.musobuddy.com" format

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, Vite as build tool.
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI primitives.
- **State Management**: React Query.
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: Clean white cards with left border status indicators, gradient-styled forms, professional action buttons, responsive layouts (mobile-optimized), consistent sidebar navigation, clear visual cues. Multiple theme options (Purple, Ocean Blue, Forest Green, Clean Pro Audio, Midnight Blue) with theme-aware components and an animated metronome logo.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Core Structure**: Modular route architecture for authentication, contracts, invoices, bookings, settings, and administration.
- **Authentication**: Pure JWT-based system with SMS verification (Twilio), email/password login, and phone number verification. No session middleware or cookies used; JWT tokens are stored in Authorization headers.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails.
- **PDF Generation**: Isolated Puppeteer engines for invoices and contracts.
- **AI Integration**: AI for contract parsing, email parsing, price enquiry detection, and message categorization.
- **System Design Choices**:
    - **User Management**: Simplified two-tier system:
        1. **Admin Accounts**: Full administrative privileges (isAdmin: true)
        2. **User Accounts**: All authenticated users have full access to features (created via admin panel or subscription payment)
    - **Booking Management**: Unified system with conflict detection, calendar integration (.ics import), status tracking, and manual gig entry. Includes a standalone, token-based booking widget. Booking workflow statuses: New, In progress, Client confirms, Confirmed, Completed, Rejected.
    - **Contract Generation**: Dynamic PDF generation, digital signature capabilities, cloud storage, automated reminders, and guided questionnaire-style creation.
    - **Invoice Management**: Professional invoice generation, payment tracking, overdue monitoring.
    - **Compliance Tracking**: Document management for insurance, licenses, PAT testing; expiry date monitoring and alerts; automated compliance sharing.
    - **Data Flow**: Streamlined authentication, booking lifecycle management, and AI integration for automated data extraction and processing.
    - **Security**: Robust session validation, comprehensive rate limiting, enhanced database connection pooling, secure password hashing, input validation, input sanitization, and async error handling.
    - **System Health Monitoring**: Real-time dashboard (/system-health) tracking database, authentication, email, storage services with performance metrics and automated health checks.
    - **Enhanced Contract Reliability**: Enterprise-grade retry logic with exponential backoff, non-critical failure handling, and revenue protection mechanisms.
    - **Unified Authentication**: Middleware supporting 4 token sources (Bearer header, x-auth-token, query parameter, cookies) eliminating random 401 errors.
    - **Deployment**: Node.js server serving built frontend, environment configuration, build process with Vite and esbuild.
    - **API Design**: RESTful API endpoints, consistent JSON responses, and comprehensive error handling.
    - **System Isolation**: Critical components like invoice and contract generation are designed as entirely separate, isolated systems.

## External Dependencies

- **Cloud Services**:
    - Cloudflare R2: PDF storage and delivery.
    - Mailgun: Email delivery service.
        - Backup sandbox domain: `sandbox2e23cfec66e14ec6b88b9124e39e4926.mailgun.org` (stored 08/01/2025)
        - Production domain: `enquiries.musobuddy.com` (hardcoded override in server/core/services.ts)
    - Neon Database: PostgreSQL hosting.
    - Replit: Authentication and hosting.
- **APIs and Services**:
    - Anthropic Claude Haiku: AI for contract parsing.
    - OpenAI: AI for email parsing and intelligent template generation.
    - Puppeteer: PDF generation.
    - Stripe: Subscription management and payment processing.
    - Twilio: SMS verification.