# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform designed to help musicians manage their bookings, contracts, invoices, and compliance requirements. It aims to be a user-friendly, reliable, and scalable full-stack web application. The platform's vision is to streamline administrative tasks for musicians, allowing them more time for their craft, and has significant market potential by offering a centralized solution for common music business challenges.

## Recent Changes (January 2025)
- **Invoice Viewing System Fixed**: Resolved critical R2 cloud storage URL issues - corrected hardcoded account ID and implemented proper redirects
- **AI-Optimized Invoice Generation**: Added Anthropic Claude integration for professional invoice PDFs with real business data (~3 cents per invoice)
- **Async PDF Generation**: Made invoice PDF generation asynchronous to prevent frontend timeouts during AI processing
- **Contract Modal Fixed**: Resolved critical contract creation dialog close issue by removing circular dependency in useEffect
- **Settings Page Restored**: Fixed corrupted JSX structure (300+ broken lines) that was causing application-wide runtime errors
- **Null Safety Enhanced**: Added comprehensive null checking across contracts filtering and notification components
- **Comprehensive Invoice Template**: Enhanced PDF generator to include complete business details, custom user terms, VAT status, bank details, and professional multi-page layout (August 2025)
- **PDF System Isolation**: Created separate PDF generators (`invoice-pdf-generator.ts` and `contract-pdf-generator.ts`) to prevent cross-system contamination - invoice system can no longer be broken by contract system fixes (August 4, 2025)
- **Codebase Cleanup**: Removed legacy `pdf-generator.ts` file and updated all references to use dedicated generators, ensuring complete system isolation (August 4, 2025)

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
- **UI/UX Decisions**: Clean white cards with left border status indicators, gradient-styled forms, professional action buttons, responsive layouts for all screen sizes (mobile-optimized), consistent sidebar navigation, clear visual cues for user interactions. Multiple theme options (Purple, Ocean Blue, Forest Green, Clean Pro Audio, Midnight Blue) with theme-aware components and an animated metronome logo.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Core Structure**: Consolidated into `index.ts`, `auth.ts`, `storage.ts`, `services.ts`, `routes.ts`, `database.ts`
- **Authentication**: Branded email/password authentication with PostgreSQL sessions, robust session management, and Replit Auth integration.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails and webhook processing.
- **PDF Generation**: Separate isolated Puppeteer engines - `invoice-pdf-generator.ts` for invoices, `contract-pdf-generator.ts` for contracts (prevents cross-system failures).
- **AI Integration**: Anthropic Claude Haiku for contract parsing, OpenAI for email parsing and AI response generation, including price enquiry detection and message categorization.
- **System Design Choices**:
    - **User Management**: Replit Auth integration, session-based authentication, user tiers (free, premium, enterprise), admin dashboard.
    - **Booking Management**: Unified system, conflict detection, calendar integration (.ics import), status tracking, and manual gig entry. Includes a standalone, token-based booking widget. Booking workflow: 1) New (auto-triggered by event creation), 2) In progress (auto-triggered by template sent), 3) Client confirms (manual user input), 4) Confirmed (auto-set when contract signed), 5) Completed (auto-set when date passed), 6) Rejected (user-set anytime).
    - **Contract Generation**: Dynamic PDF generation, digital signature capabilities, cloud storage, and automated reminders (Phase 2).
    - **Invoice Management**: Professional invoice generation, payment tracking, overdue monitoring, and integration with banking APIs (planned).
    - **Compliance Tracking**: Document management for insurance, licenses, PAT testing; expiry date monitoring and alerts; automated compliance sharing.
    - **Data Flow**: Streamlined authentication, booking lifecycle management, and AI integration for automated data extraction and processing.
    - **Security**: Robust session validation, comprehensive rate limiting (login, SMS, signup, API), enhanced database connection pooling, and secure password hashing.
    - **Deployment**: Node.js server serving built frontend, environment configuration for development and production, build process with Vite and esbuild, monitoring and maintenance services.
    - **API Design**: RESTful API endpoints for all core functionalities, consistent JSON responses, and comprehensive error handling.

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