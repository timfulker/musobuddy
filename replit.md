# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform designed to help musicians manage their bookings, contracts, invoices, and compliance requirements. It aims to be a user-friendly, reliable, and scalable full-stack web application. The platform's vision is to streamline administrative tasks for musicians, allowing them more time for their craft, and has significant market potential by offering a centralized solution for common music business challenges.

## User Preferences
Preferred communication style: Simple, everyday language.
Response priority: Immediate responsiveness - user must be able to interrupt at any moment without queue delays.

## Recent Changes (January 2025)
- **Phase 2 Storage Refactoring Complete**: Successfully refactored server/core/storage.ts from 1,551 lines of mixed implementation to 464 lines of clean delegation pattern. All storage operations now properly delegate to modular storage classes (user, booking, contract, invoice, settings, misc).
- **Storage Architecture Perfected**: Eliminated all direct database calls from storage.ts, ensuring maintainable modular architecture with pure delegation pattern.
- **Business-Critical Protection Maintained**: Contract signing workflow security preserved throughout complete storage refactoring.
- **Contract R2 URL Structure Updated**: Fixed R2 file paths after storage restructuring. Updated from old storage URLs to new `pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev` structure. Contract viewing now works reliably with proper authentication.
- **Route Registration Fix (Jan 5, 2025)**: Fixed file restructure casualty where auth routes weren't being registered due to missing export in auth-rebuilt.ts. Added missing server/routes/index.ts file and exported setupAuthRoutes function. Server startup and signup functionality restored.
- **Deployment Syntax Fix (Jan 5, 2025)**: Fixed missing closing parenthesis in auth-rebuilt.ts signup route that was preventing deployment. Added proper middleware chaining and error handling. Build process now completes successfully.
- **Session Middleware Issue Identified (Jan 5, 2025)**: Confirmed signup creates users in database but fails on session creation. Session middleware works for existing auth (admin login functional). Issue is middleware application order in auth route registration. User preference noted: avoid extended debugging cycles due to 5-minute deployment times.
- **Complete Authentication System Rebuild (Jan 5, 2025)**: Successfully replaced session-based authentication with clean JWT-based system. New system includes full SMS verification (Twilio), Stripe subscription integration, phone number verification flow, and bypasses all session middleware conflicts. Authentication endpoints now use JWT tokens instead of sessions, resolving all file restructure casualties.
- **Complete Authentication System Cleanup (Jan 5, 2025)**: Eliminated all remaining session-based code. Deleted all old login/signup frontend pages, removed session middleware from server startup, updated all route files to use JWT requireAuth middleware. System now uses pure JWT authentication with Authorization headers. All authentication conflicts resolved - server running successfully.
- **Phone Number Constraint Removed (Jan 5, 2025)**: Removed unique constraint on phone_number field for testing purposes to allow multiple users to use the same phone number during development and testing phases.
- **Critical Business Function Restoration (Jan 5, 2025)**: Fixed mission-critical contract/invoice creation failures after "last chance" warning. Removed Zod validation middleware rejecting null enquiryId values in contract creation. Fixed all invoice server 500 errors by correcting function signatures (updateInvoice, deleteInvoice now include userId parameter). Added missing API endpoints to prevent 404 errors. Core business functionality restored for user livelihood.

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
- **Core Structure**: Modular route architecture with dedicated modules for authentication, contracts, invoices, bookings, settings, and administration.
- **Authentication**: Pure JWT-based authentication system with SMS verification (Twilio), email/password login, and phone number verification flow. Completely replaced session-based system - no session middleware or cookies used. JWT tokens stored in Authorization headers.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails and webhook processing.
- **PDF Generation**: Separate isolated Puppeteer engines for invoices and contracts.
- **AI Integration**: AI for contract parsing, email parsing, price enquiry detection, and message categorization.
- **System Design Choices**:
    - **User Management**: Replit Auth integration, session-based authentication, user tiers, admin dashboard.
    - **Booking Management**: Unified system, conflict detection, calendar integration (.ics import), status tracking, and manual gig entry. Includes a standalone, token-based booking widget. Booking workflow includes statuses: New, In progress, Client confirms, Confirmed, Completed, Rejected.
    - **Contract Generation**: Dynamic PDF generation, digital signature capabilities, cloud storage, and automated reminders. Guided questionnaire-style contract creation with smart defaults and validation.
    - **Invoice Management**: Professional invoice generation, payment tracking, overdue monitoring.
    - **Compliance Tracking**: Document management for insurance, licenses, PAT testing; expiry date monitoring and alerts; automated compliance sharing.
    - **Data Flow**: Streamlined authentication, booking lifecycle management, and AI integration for automated data extraction and processing.
    - **Security**: Robust session validation, comprehensive rate limiting, enhanced database connection pooling, secure password hashing, input validation, input sanitization, and async error handling.
    - **Deployment**: Node.js server serving built frontend, environment configuration, build process with Vite and esbuild.
    - **API Design**: RESTful API endpoints, consistent JSON responses, and comprehensive error handling.
    - **System Isolation**: Critical components like invoice and contract generation are designed as entirely separate, isolated systems.

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