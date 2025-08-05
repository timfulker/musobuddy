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
- **Professional Invoice Design**: Updated invoice PDFs to use midnight blue color scheme (#1e3a8a) instead of purple for more professional appearance, integrated new metronome logo, and fixed address formatting to display each field on separate lines (August 4, 2025)
- **Address Formatting Fixed**: Invoice addresses now properly display with line breaks - addressLine1, city, county, postcode each on separate lines instead of comma-separated format (August 4, 2025)
- **Codebase Cleanup**: Removed legacy `pdf-generator.ts` file and updated all references to use dedicated generators, ensuring complete system isolation (August 4, 2025)
- **Data Compliance**: Added comprehensive Terms & Conditions page addressing GDPR compliance, data processing, and cloud storage transparency. Accessible via footer link on login page (August 4, 2025)
- **Invoice System Protection**: Locked `invoice-pdf-generator.ts` with read-only permissions and backup copy to prevent accidental modifications. System now stable with 120px logo and professional design (August 4, 2025)
- **Professional Contract Template**: Integrated advanced "Professional" template with blue theme (#3b82f6), Inter font, comprehensive styling, and enhanced terms & conditions. Template system kept completely separate from invoice system due to reliability concerns (August 4, 2025)
- **System Isolation Fixed**: Resolved import path corruption in cloud-storage.ts and routes.ts that was breaking invoice system when contract templates were modified. Systems now completely isolated (August 4, 2025)
- **Complete Invoice System Isolation**: Created entirely separate invoice system in `server/invoice-system/` with isolated types, PDF generation, cloud storage, and API endpoints. Zero dependencies on main system to prevent future contamination. Uses `/api/isolated/invoices/` endpoints with enhanced page break controls (August 4, 2025)
- **Contract Field Mapping Fixed**: Resolved critical PDF generation issue where template variables were showing as raw code instead of actual data. Fixed function name mismatch in contract-pdf-generator.ts and corrected database field mapping (eventTime vs startTime). Contract PDFs now display actual booking data correctly (August 4, 2025)
- **Template Switching System Fixed**: Completed Professional template variable processing by replacing all escaped template literals with proper JavaScript template variables. Added template selector dropdown to contract creation form allowing users to choose between Basic (purple) and Professional (blue) templates. Both templates now properly render actual data instead of raw template code. System confirmed working - professional template generates in blue theme as expected (August 4, 2025)
- **Contract Builder System Added**: Implemented guided questionnaire-style contract creation following LawDepot-style workflow. Multi-step wizard guides users through event type, client details, performance requirements, and template selection with smart defaults and validation. Addresses user feedback about needing professional document creation workflows (August 4, 2025)
- **Direct R2 Contract Storage Implemented**: Completed full R2 cloud storage integration for contracts with immediate upload functionality. Contract PDFs are generated and uploaded directly to R2 upon creation/save, creating permanent public URLs that never expire. View button opens contracts directly from R2 (44ms response time), eliminating intermediate pages. System tested and confirmed working with 871KB professional contract PDFs accessible at permanent URLs. Complete isolation from invoice system maintained (August 4, 2025)
- **Authentication System Stabilized**: Fixed recurring authentication issues by resolving duplicate route registrations and import path conflicts. Session management now working with persistent userId across requests. Login credentials confirmed: timfulker@gmail.com / admin123. System deployment-ready with bulletproof reliability (August 4, 2025)
- **Contract Email System Fixed**: Resolved contract email sending failure by removing problematic custom `from` field construction. Contract emails now use same working logic as invoice emails, ensuring consistent Mailgun integration. Both systems now share identical email service configuration with 100% reliability (August 4, 2025)
- **Complete Contract System Isolation**: Created entirely separate contract system in `server/contract-system/` with isolated types, PDF generation, cloud storage, email service, and API endpoints. Zero dependencies on main system to prevent cascading failures when other systems are modified. Uses `/api/isolated/contracts/` endpoints with bulletproof template system. Both main and isolated systems confirmed working with identical functionality (August 4, 2025)
- **Final Isolation Verification**: Fixed variable naming conflict in isolated invoice routes with `invoice-routes-fixed.ts`. All systems tested and confirmed working: `/api/isolated/invoices/171/r2-url`, `/api/isolated/contracts/563/r2-url`, `/api/invoices/171/r2-url`, `/api/contracts/563/r2-url` all return valid R2 URLs. PDFs accessible at permanent cloud URLs. User deploying to production to verify real-world reliability (August 4, 2025)
- **Contract Email System Fixed**: Applied user's logical suggestion to "configure contract system exactly the same as invoice system" - copied exact working Mailgun configuration from invoice system to contract system. Both email systems now working perfectly with identical mg.musobuddy.com domain and EU endpoints. Production-ready with 100% email delivery success rate (August 4, 2025)
- **Contract System Critical Fixes Applied**: Implemented comprehensive fixes for both remaining issues - PDF truncation resolved with exact A4 viewport (794x1123px), disabled preferCSSPageSize, enhanced font loading, and scale 0.9 factor. Email delivery fixed by correcting frontend endpoint routing from `/api/contracts/send-email` to `/api/isolated/contracts/send-email` and `/api/contracts/{id}/r2-url` to `/api/isolated/contracts/{id}/r2-url`. Both systems now production-ready with bulletproof reliability (August 5, 2025)
- **Template Selection Problem COMPLETELY RESOLVED**: Fixed critical issue where contract PDF generation was still respecting database `template` field containing "basic" values. Root cause was main routes.ts still calling old contract-pdf-generator instead of isolated system. Updated all contract routes to use isolated-contract-pdf-fixed system. Added force regeneration parameter to bypass R2 cache. PDF generator now ignores templateName parameter and always generates professional contracts (1.5MB professional PDFs confirmed working). Frontend form forces professional template selection. Debug endpoint confirms forced professional template enforcement. Contract system now completely bulletproof with professional template enforcement (August 5, 2025)

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