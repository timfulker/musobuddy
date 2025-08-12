# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform designed to streamline administrative tasks for musicians, allowing them more time for their craft. It provides tools for managing bookings, contracts, invoices, and compliance requirements. The platform aims to be user-friendly, reliable, and scalable, offering a centralized solution for common music business challenges with significant market potential. Initial launch is focused on the UK market, with plans for international expansion.

## User Preferences
Preferred communication style: Simple, everyday language.
Response priority: Immediate responsiveness - user must be able to interrupt at any moment without queue delays.
Contract signing: User wants only ONE simple sign contract button, no redundant "click to sign box" above it - simplified single-stage signing process.
Email notifications: Both client AND performer receive confirmation emails when contracts are signed.
Problem-solving approach: When user reports "X was working last week but now it's broken" - FIND and RESTORE the original working system rather than rebuilding from scratch. This avoids creating conflicting duplicate systems.
Authentication system: DO NOT rebuild authentication system from scratch - causes more problems than it solves by creating conflicting duplicate systems. Make minimal surgical fixes only.
Lead email format: User prefers clean email format without "leads" prefix - uses `prefix@enquiries.musobuddy.com` instead of `prefix-leads@mg.musobuddy.com`.
Email webhook: Mailgun webhook for email routing hardcoded to `https://www.musobuddy.com/api/webhook/mailgun` for production reliability.
System reliability: Comprehensive 4-phase fix applied addressing "architectural debt collapse" with enterprise-grade reliability for contract signing, unified authentication middleware, storage audit, and real-time system health monitoring.
Theme auto-save: User expects theme changes to automatically save to database when selected in UI, not require manual "Save" button click. Frontend theme updates immediately but database sync needs to happen automatically for PDF generation consistency.
PDF theming: Invoice PDFs now use proper text contrast calculation (WCAG 2.0 luminance) with dynamic black/white text on colored backgrounds. FROM/BILL TO labels always use black for consistency. MusoBuddy logo maintains consistent dark color for optimal visibility and brand recognition across all themes.
Logo consistency: MusoBuddy logo now uses consistent midnight blue (#191970) throughout the entire application (main UI and PDFs) regardless of selected theme for optimal brand recognition and professional appearance.
Contract theming: Contract PDFs now use the same WCAG 2.0 luminance calculation and theming criteria as invoices - dynamic black/white text on colored backgrounds, consistent black section labels, and midnight blue logo branding. Both invoice and contract systems now provide professional, accessible PDFs that match user's selected theme while maintaining optimal readability.
UI polish: Removed "Regenerate PDF" button from invoice interface - was useful for testing theming but not needed in production since invoices should maintain consistent appearance once created. Interface now focuses on essential actions only.
Stripe integration: Unified signup flow where ALL users (including free trial) must go through Stripe first to register credit cards. 30-day free trial period. Can deploy with TEST keys for testing, switch to LIVE keys for production launch.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, Vite.
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI primitives.
- **State Management**: React Query.
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: Clean white cards with left border status indicators, gradient-styled forms, professional action buttons, responsive layouts, consistent sidebar navigation, clear visual cues. Multiple theme options (Purple, Ocean Blue, Forest Green, Clean Pro Audio, Midnight Blue) with theme-aware components and an animated metronome logo. QR code generation, widget URL creation, R2 storage integration, and widget persistence are all functioning. Navigation structure is simplified with a collapsible Settings section on desktop and a unified Settings link on mobile. PDFs automatically match user's chosen theme.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Core Structure**: Modular route architecture for authentication, contracts, invoices, bookings, settings, and administration.
- **Authentication**: Pure JWT-based system with SMS verification (Twilio), email/password login, and phone number verification. No session middleware or cookies; JWT tokens in Authorization headers. Centralized `authToken.ts` utility. Unified authentication middleware supporting 4 token sources.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails, including enhanced email parsing for availability and pricing queries. Email templates system supports full CRUD operations with automatic seeding of 5 default templates.
- **PDF Generation**: Isolated Puppeteer engines for invoices and contracts.
- **AI Integration**: AI for contract parsing, email parsing, price enquiry detection, message categorization, and intelligent date logic.
- **System Design Choices**:
    - **User Management**: Simplified two-tier system: Admin Accounts and User Accounts.
    - **Booking Management**: Unified system with conflict detection, calendar integration (.ics import), status tracking, and manual gig entry. Includes a standalone, token-based booking widget with external R2 hosting. Booking workflow statuses: New, In progress, Client confirms, Confirmed, Completed, Rejected.
    - **Contract Generation**: Dynamic PDF generation, digital signature capabilities, cloud storage, automated reminders, and guided questionnaire-style creation. Enterprise-grade retry logic.
    - **Invoice Management**: Professional invoice generation, payment tracking, overdue monitoring. Invoice security implemented via random 16-character tokens in URLs for R2 file access.
    - **Compliance Tracking**: Document management for insurance, licenses, PAT testing; expiry date monitoring and alerts; automated compliance sharing.
    - **Security**: Robust session validation, comprehensive rate limiting, enhanced database connection pooling, secure password hashing, input validation, input sanitization, and async error handling. Production safety guards.
    - **System Health Monitoring**: Real-time dashboard (`/system-health`) tracking database, authentication, email, storage services with performance metrics and automated health checks.
    - **Deployment**: Node.js server serving built frontend.
    - **API Design**: RESTful API endpoints, consistent JSON responses, and comprehensive error handling.
    - **System Isolation**: Critical components like invoice and contract generation are designed as entirely separate, isolated systems.

## External Dependencies

- **Cloud Services**:
    - Cloudflare R2: PDF storage and delivery.
    - Mailgun: Email delivery service. Production domain: `enquiries.musobuddy.com`.
    - Neon Database: PostgreSQL hosting.
    - Replit: Authentication and hosting.
- **APIs and Services**:
    - Anthropic Claude Haiku: AI for contract parsing.
    - OpenAI: AI for email parsing and intelligent template generation.
    - Puppeteer: PDF generation.
    - Stripe: Subscription management and payment processing.
    - Twilio: SMS verification.