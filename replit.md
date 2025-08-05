# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform designed to help musicians manage their bookings, contracts, invoices, and compliance requirements. It aims to be a user-friendly, reliable, and scalable full-stack web application. The platform's vision is to streamline administrative tasks for musicians, allowing them more time for their craft, and has significant market potential by offering a centralized solution for common music business challenges.

## User Preferences
Preferred communication style: Simple, everyday language.
Response priority: Immediate responsiveness - user must be able to interrupt at any moment without queue delays.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI primitives
- **State Management**: React Query
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **UI/UX Decisions**: Clean white cards with left border status indicators, gradient-styled forms, professional action buttons, responsive layouts (mobile-optimized), consistent sidebar navigation, clear visual cues. Multiple theme options (Purple, Ocean Blue, Forest Green, Clean Pro Audio, Midnight Blue) with theme-aware components and an animated metronome logo.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Core Structure**: Consolidated into `index.ts`, `auth.ts`, `storage.ts`, `services.ts`, `routes.ts`, `database.ts`
- **Authentication**: Branded email/password authentication with PostgreSQL sessions, robust session management, and Replit Auth integration.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails and webhook processing.
- **PDF Generation**: Separate isolated Puppeteer engines for invoices and contracts to prevent cross-system failures.
- **AI Integration**: AI for contract parsing, email parsing, price enquiry detection, and message categorization.
- **System Design Choices**:
    - **User Management**: Replit Auth integration, session-based authentication, user tiers, admin dashboard.
    - **Booking Management**: Unified system, conflict detection, calendar integration (.ics import), status tracking, and manual gig entry. Includes a standalone, token-based booking widget. Booking workflow includes statuses: New, In progress, Client confirms, Confirmed, Completed, Rejected.
    - **Contract Generation**: Dynamic PDF generation, digital signature capabilities, cloud storage, and automated reminders (Phase 2). Guided questionnaire-style contract creation with smart defaults and validation.
    - **Invoice Management**: Professional invoice generation, payment tracking, overdue monitoring, and integration with banking APIs (planned).
    - **Compliance Tracking**: Document management for insurance, licenses, PAT testing; expiry date monitoring and alerts; automated compliance sharing.
    - **Data Flow**: Streamlined authentication, booking lifecycle management, and AI integration for automated data extraction and processing.
    - **Security**: Robust session validation, comprehensive rate limiting, enhanced database connection pooling, and secure password hashing.
    - **Deployment**: Node.js server serving built frontend, environment configuration, build process with Vite and esbuild.
    - **API Design**: RESTful API endpoints, consistent JSON responses, and comprehensive error handling.
    - **System Isolation**: Critical components like invoice and contract generation are designed as entirely separate, isolated systems with their own types, PDF generation, cloud storage, and API endpoints to prevent cross-contamination and cascading failures.

## Recent Changes

- **JavaScript Errors in Contract Signing Pages Fixed**: Applied comprehensive JavaScript fixes to resolve all identified errors including variable naming conflicts (multiple `const name` declarations changed to `clientNameValue`, `phoneValue`, etc.), template literal parsing issues (converted `${variable}` template literals to string concatenation), function reference errors, and duplicate variable declarations. Changed `let/const` to `var` to prevent redeclaration errors. Removed conflicting HTML `onsubmit` handlers and implemented proper JavaScript event handling. Contract signing pages now have clean JavaScript without syntax errors or runtime conflicts while maintaining all CORS functionality (August 5, 2025)
- **CORS Issues Completely Resolved**: External agent's comprehensive CORS fixes successfully implemented and tested. Enhanced CORS middleware now allows cross-origin requests from R2 domains (.r2.dev), contract signing endpoints properly handle preflight OPTIONS requests, and signing pages hosted on Cloudflare R2 can seamlessly communicate with the MusoBuddy API server. JavaScript on signing pages automatically detects domain and uses correct API endpoints with proper CORS configuration. Contract signing workflow now fully functional from both main domain and R2-hosted signing pages (August 5, 2025)
- **Complete System Reversion to Original Working Code**: After multiple incremental fixes failed to resolve JSON response display and PDF layout issues, implemented complete reversion to proven working system using backup files. Original PDF generator restored (server/original-contract-pdf.ts) with clean professional layout, proper margins, and no signature splitting. Fixed all function name mismatches (generateWorkingContractPDF → generateContractPDF) throughout codebase. Added enhanced debug logging to cloud storage system. Contract system now uses original working template and backend logic (August 5, 2025)
- **Contract Client Fillable Fields Restored**: Implemented missing functionality from backup files - signing page now includes client fillable fields (phone, address, venue address) with blue highlighting for required fields, proper form validation, and field updates during signing process. Complete contract signing workflow restored (August 5, 2025)
- **Contract Confirmation Emails Fixed**: Added missing email confirmation system for both client and musician after contract signing, with professional HTML templates and proper service method signatures. Field name mappings corrected for `clientSignature` and `clientIpAddress` (August 5, 2025)
- **Contract Signing Workflow Fixed**: Resolved critical issues in contract signing pages - PDF links now use direct R2 URLs (no authentication), signature box is clickable with visual feedback, form submits to correct endpoint with proper field names, and send button properly manages state to prevent double-submission. Contract signing workflow is now fully functional (August 5, 2025)
- **Invoice Email Payment Terms Fixed**: Email template now uses dynamic logic based on `userSettings.defaultInvoiceDueDays` - if 1 day shows "on receipt", otherwise shows "within X days of invoice date". Perfect consistency with invoice system logic (August 5, 2025)
- **Contract Email Signing Page Fixed**: Contract emails were linking to PDF view pages instead of signing pages. Email template now uses `contract.signingPageUrl` when available, with button text changing to "Sign Contract" vs "View Contract". Clients properly directed to signing functionality (August 5, 2025)

## External Dependencies

- **Cloud Services**:
    - Cloudflare R2: PDF storage and delivery.
    - Mailgun: Email delivery service.
    - Neon Database: PostgreSQL hosting.
    - Replit: Authentication and hosting.
- **APIs and Services**:
    - Anthropic Claude Haiku: AI for contract parsing.
    - OpenAI: AI for email parsing and intelligent template generation.
    - Puppeteer: PDF generation.
    - Stripe: Subscription management and payment processing.
    - Twilio: SMS verification.
- **Development Tools**:
    - Multer: File upload handling.
    - Express Session: Session management.
    - CORS: Cross-origin resource sharing.
    - Drizzle ORM: Type-safe database queries.