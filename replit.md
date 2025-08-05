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
- **Authentication**: Branded email/password authentication with PostgreSQL sessions and Replit Auth integration.
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