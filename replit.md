# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform for musicians, designed to streamline tasks such as bookings, contracts, invoices, and compliance. It aims to be a user-friendly, reliable, and scalable centralized solution, initially targeting the UK market with plans for international expansion, empowering musicians to focus more on their craft by handling administrative burdens.

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
Invoice reminders remain manual-only by user preference - automatic reminder system considered but rejected to maintain user control.
Timeline preference: User prefers realistic timeline expectations over artificial urgency - focus on thorough functionality testing over rushed deployment.
Launch timeline: Few days for bug fixes → next week for landing page → beta testing with 4-5 users (2-3 weeks starting ~22nd/23rd) → full launch mid-to-end September. Primary concern: scalability during beta testing phase.

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript, Vite) with Wouter for routing.
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI.
- **State Management**: React Query.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: Clean white cards, gradient forms, responsive layouts, consistent sidebar navigation, and multiple theme options (Purple, Ocean Blue, Forest Green, Clean Pro Audio, Midnight Blue). Features QR code generation, widget URL creation, R2 storage integration, and dynamic PDF theming (invoices and contracts) with WCAG 2.0 luminance for text contrast and consistent logo branding. Initial default booking view is list-based, with calendar as an option.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Core Structure**: Modular route architecture.
- **Authentication**: Pure JWT-based system with SMS verification, email/password login, and phone number verification, using a unified middleware. Production URLs are hardcoded for Stripe redirects.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails, parsing, and template management, with professional email styling.
- **PDF Generation**: Isolated Puppeteer engines for dynamic PDF generation of invoices and contracts.
- **AI Integration**: Claude Haiku for contract parsing, email parsing, price enquiry detection, message categorization, and intelligent date logic.
- **System Design Choices**:
    - **User Management**: Two-tier system (Admin Accounts, User Accounts).
    - **Booking Management**: Unified system with conflict detection, calendar integration (.ics), status tracking, comprehensive forms (including venue auto-population via Google Maps API, mileage calculation, what3words integration), and a standalone, token-based booking widget that can parse dates from text. Supports "TBC" times and "Actual Performance Time" fields.
    - **Contract Generation**: Dynamic PDF generation, digital signatures, cloud storage, automated reminders, guided creation, and legally compliant amendment system that creates new contracts while preserving originals.
    - **Invoice Management**: Professional invoice generation, payment tracking (manual "Mark as Paid" for bank transfers), overdue monitoring. Invoice security via random 16-character tokens in URLs for R2 file access.
    - **Compliance Tracking**: Document management, expiry date monitoring, alerts, and automated sharing.
    - **Security**: Robust session validation, rate limiting, enhanced database connection pooling, secure password hashing, input validation/sanitization, and async error handling.
    - **System Health Monitoring**: Real-time dashboard (`/system-health`).
    - **Deployment**: Node.js server serving built frontend.
    - **API Design**: RESTful, consistent JSON responses, and comprehensive error handling.
    - **System Isolation**: Critical components (invoice/contract generation) are isolated systems.
    - **Onboarding Wizard**: Multi-step wizard for new users covering business info, contact details, email prefix setup, pricing rates, service areas, and theme branding, ensuring proper system setup.
    - **Email Processing**: Comprehensive queue system to eliminate race conditions, processing emails sequentially with delays for AI accuracy, using mutex locking and duplicate detection. Includes retry logic and queue status monitoring.

## External Dependencies

- **Cloud Services**:
    - Cloudflare R2
    - Mailgun (Production domain: `enquiries.musobuddy.com`)
    - Neon Database (PostgreSQL)
    - Replit (Authentication and hosting)
- **APIs and Services**:
    - Anthropic Claude Haiku
    - Google Maps API
    - Puppeteer
    - Stripe (for user subscriptions)
    - Twilio
    - what3words API
```