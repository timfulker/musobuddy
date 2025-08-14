# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform for musicians, designed to streamline tasks such as bookings, contracts, invoices, and compliance. It aims to be a user-friendly, reliable, and scalable centralized solution, initially targeting the UK market with plans for international expansion, enabling musicians to focus more on their craft. The business vision is to empower musicians by providing a robust, all-in-one platform that handles administrative burdens, allowing them to focus on their artistic endeavors and grow their businesses.

## User Preferences
Preferred communication style: Simple, everyday language.
Response priority: Immediate responsiveness - user must be able to interrupt at any moment without queue delays.
Contract signing: User wants only ONE simple sign contract button, no redundant "click to sign box" above it - simplified single-stage signing process.
Email notifications: Both client AND performer receive confirmation emails when contracts are signed.
SMS notifications: Premium feature only due to Twilio costs - Core plan users get email notifications, Premium users can enable SMS notifications for critical alerts (new bookings, overdue payments).
Problem-solving approach: When user reports "X was working last week but now it's broken" - FIND and RESTORE the original working system rather than rebuilding from scratch. This avoids creating conflicting duplicate systems.
Authentication system: DO NOT rebuild authentication system from scratch - causes more problems than it solves by creating conflicting duplicate systems. Make minimal surgical fixes only.
Lead email format: User prefers clean email format without "leads" prefix - uses `prefix@enquiries.musobuddy.com` instead of `prefix-leads@mg.musobuddy.com`.
Email webhook: Mailgun webhook for email routing configured to `https://musobuddy.replit.app/api/webhook/mailgun` for production reliability.
Theme auto-save: User expects theme changes to automatically save to database when selected in UI, not require manual "Save" button click. Frontend theme updates immediately but database sync needs to happen automatically for PDF generation consistency.
Onboarding wizard: Should be a helpful optional tool rather than mandatory, appearing immediately for new authenticated users, and always allow users to dismiss/abort the wizard. It's designed to be helpful rather than something users must complete. Focuses on 5 essential setup items: business address, email prefix, business email, bank details, and booking widget generation.
Invoice data integrity: When invoices are edited, the PDF automatically regenerates with updated data and uploads to replace the old version, ensuring clients always see accurate information.
External integration deployment requirement: All external integrations (Stripe payments, Mailgun webhooks, OAuth callbacks, third-party APIs) are configured to communicate with the deployed version of the application, not the development environment. Changes to external integration handling require deployment to take effect because external services cannot reach local development servers and webhook URLs point to production domains.
Recent fixes (Jan 2025): Fixed booking edit form issue where existing booking data wasn't loading into form fields. Added missing useEffect to populate form on edit mode. Also fixed "Back to Bookings" button luminance awareness by adding text-primary-foreground class for proper theme contrast. CRITICAL: Fixed booking widget routing bug - messages without clear dates now properly route to review messages instead of creating fake bookings. Simple rule: no date = review messages, regardless of other content. Fixed delete button text luminance in booking deletion modal by adding text-white class for proper red background contrast.

Calendar view enhancement (Aug 2025): Successfully implemented responsive action buttons in calendar hover tooltips. Users can now access full "Respond" dropdown menu (with all options: Respond to Client, Issue Contract, Issue Invoice, Send Thank You, etc.) and "Apply on Encore" buttons directly from calendar bookings without switching views. Hover cards appear quickly (500ms delay) with stable dropdown interaction using mouse event isolation to prevent premature closing.

Real-time notification system (Jan 2025): Implemented comprehensive notification badges with 30-second polling for new bookings, unparseable messages, overdue invoices, and expiring documents. Cost implications: ~2,880 API calls/day per active user for notification updates, but queries are optimized and lightweight. SMS notifications postponed - UK costs £3/month per 100 messages make it expensive even for premium plans. TypeScript errors fixed - notification badges now handle undefined values gracefully.

Invoice overdue detection fix (Jan 2025): Fixed critical bug where overdue invoice filter showed no results despite notification badges correctly showing overdue count. Issue was database stored "sent" status while frontend looked for "overdue" status. Implemented dynamic overdue calculation in frontend (sent + past due date + not paid) with red gradient backgrounds for visual identification. Invoice reminders remain manual-only by user preference - automatic reminder system considered but rejected to maintain user control.

Encore integration (Aug 2025): Successfully implemented Encore Musicians platform integration with apply-now link extraction from forwarded emails. System detects AWS tracking URLs (awstrack.me) that redirect to Encore jobs, extracts job IDs from email subjects for reference, and displays purple "🎵 ENCORE" badges with "Apply on Encore" buttons on booking cards. Integration works in both list view and kanban dashboard. Correct URL format: `https://encoremusicians.com/jobs/{jobId}?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow` (note: /jobs/ plural). Note: Forwarded emails lose HTML/clickable URLs, so tracking URLs should be copied from "Apply now" button hover text before forwarding for best results. Job alert links may expire after a few days.

Email processing queue (Aug 2025): Successfully implemented comprehensive email processing queue system to eliminate race conditions when multiple emails arrive within seconds. The queue processes emails sequentially with 5-second delays between jobs for AI accuracy, using mutex locking and duplicate detection to prevent concurrent processing conflicts that caused missing emails. System includes retry logic (3 attempts), queue status monitoring via `/api/email-queue/status`, mutex locking for database operations, and fallback to immediate processing if queue fails. All emails now properly route through enhanced `server/core/email-queue-enhanced.ts` with comprehensive error handling and title cleanup integration. FIXED (Aug 14): Race condition permanently resolved - extensive testing confirms both rapid-succession emails now successfully create bookings in database without any data loss. Enhanced queue system with mutex locking ensures zero email drops during high-volume periods. AI processing enhanced with 5-second delays between emails to prevent parsing contamination between similar Encore emails, ensuring each email is processed independently for maximum accuracy.

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript, Vite).
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI.
- **State Management**: React Query.
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: Clean white cards, gradient forms, responsive layouts, consistent sidebar navigation, and multiple theme options (Purple, Ocean Blue, Forest Green, Clean Pro Audio, Midnight Blue). Features QR code generation, widget URL creation, R2 storage integration, and dynamic PDF theming (invoices and contracts) with WCAG 2.0 luminance for text contrast, consistent logo branding. Initial default booking view is list-based, with calendar as an option.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Core Structure**: Modular route architecture for authentication, contracts, invoices, bookings, settings, and administration.
- **Authentication**: Pure JWT-based system with SMS verification, email/password login, and phone number verification, using a unified middleware. Production URLs are hardcoded for Stripe redirects to prevent environment conflicts.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails, email parsing, and email template management. Professional email styling for invoices includes responsive design, Google Fonts, gradient headers, and branding.
- **PDF Generation**: Isolated Puppeteer engines for dynamic PDF generation of invoices and contracts.
- **AI Integration**: Claude Haiku for contract parsing, email parsing, price enquiry detection, message categorization, and intelligent date logic (switched from OpenAI for ~50% cost savings).
- **System Design Choices**:
    - **User Management**: Two-tier system (Admin Accounts, User Accounts).
    - **Booking Management**: Unified system with conflict detection, calendar integration (.ics), status tracking, comprehensive forms (including venue auto-population via Google Maps API, mileage calculation, what3words integration), and a standalone, token-based booking widget that can parse dates from text. Supports "TBC" times and "Actual Performance Time" fields.
    - **Contract Generation**: Dynamic PDF generation, digital signatures, cloud storage, automated reminders, guided creation with enterprise-grade retry logic, and legally compliant amendment system that creates new contracts while preserving originals.
    - **Invoice Management**: Professional invoice generation, payment tracking (manual "Mark as Paid" for bank transfers), overdue monitoring. Invoice security via random 16-character tokens in URLs for R2 file access.
    - **Compliance Tracking**: Document management, expiry date monitoring, alerts, and automated sharing.
    - **Security**: Robust session validation, rate limiting, enhanced database connection pooling, secure password hashing, input validation/sanitization, and async error handling.
    - **System Health Monitoring**: Real-time dashboard (`/system-health`) for database, authentication, email, and storage services.
    - **Deployment**: Node.js server serving built frontend.
    - **API Design**: RESTful, consistent JSON responses, and comprehensive error handling.
    - **System Isolation**: Critical components (invoice/contract generation) are isolated systems.
    - **Onboarding Wizard**: Multi-step wizard for new users covering business info, contact details, email prefix setup, pricing rates, service areas, and theme branding, ensuring proper system setup.

## External Dependencies

- **Cloud Services**:
    - Cloudflare R2
    - Mailgun (Production domain: `enquiries.musobuddy.com`)
    - Neon Database (PostgreSQL)
    - Replit (Authentication and hosting)
- **APIs and Services**:
    - Anthropic Claude Haiku
    - Google Maps API
    - OpenAI
    - Puppeteer
    - Stripe (for user subscriptions only, invoices use direct bank transfers; dual configuration for subscriptions and legacy invoice payments exists but invoice payments are currently disabled)
    - Twilio
    - what3words API