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
Invoice data integrity: Fixed critical issue where editing invoices only updated database but not the PDF stored in cloud storage. Now when invoices are edited, the PDF automatically regenerates with updated data and uploads to replace the old version, ensuring clients always see accurate information.
Contract amendment system: Implemented legally compliant contract amendment system where sent contracts cannot be edited for legal integrity. Added contract amendment feature that creates new contracts with "- Amended" suffix, copies all original data, and maintains proper audit trail. Critical legal fix: Original contracts remain legally binding ("signed" status) until amendment is actually signed by client - prevents legal gaps where no contract is enforceable. Database schema updated with superseded_by and original_contract_id tracking fields. UI shows "AMENDMENT PENDING" indicators for contracts with unsigned amendments.
External integration deployment requirement: All external integrations (Stripe payments, Mailgun webhooks, OAuth callbacks, third-party APIs) are configured to communicate with the deployed version of the application, not the development environment. Changes to external integration handling require deployment to take effect because external services cannot reach local development servers and webhook URLs point to production domains.
Professional timing flexibility: Added "TBC (To Be Confirmed)" options for contract start and finish times with common time slot selections, enabling immediate contract creation even when timing details are still being coordinated. Added optional "Actual Performance Time" field independent of event timeframe (e.g., "2 x 45 min sets" within a 4-hour event window) with preset options including common set configurations for accurate client expectations about actual music time vs. total event commitment.
Stripe integration: Unified signup flow where ALL users (including free trial) must go through Stripe first to register credit cards. 30-day free trial period. Can deploy with TEST keys for testing, switch to LIVE keys for production launch.
Intuitive bookings interface: Redesigned bookings page with visual hero section, quick stats cards (This Week/Confirmed/Pending/Total Revenue), and simplified search/filter bar for list view. Calendar view preserved as toggle option. Default changed from calendar to list view for better user experience with data-first presentation instead of filter-heavy layout.
Unified booking forms: Email parsing and manual booking creation now use identical comprehensive form structures. When emails contain venue names, Google Maps API automatically populates venue address and contact details, ensuring consistent data across all booking sources.
Mileage calculation: Booking form includes automatic mileage calculation based on distance between venue and business address, using address line 1 and postcode for accurate travel expense tracking. Distances displayed in miles by default with user preference option in Settings for miles/kilometers selection.
what3words integration: Fully integrated what3words API for precise location identification. Users can type what3words addresses (///what.three.words) in booking forms with auto-complete suggestions, nearest place information, and distance calculations. Available in both new booking creation and editing existing bookings in client billing address section.
Enhanced what3words visualization: Added interactive Google Maps preview that automatically appears when a valid what3words location is found. Features include: collapsible map view with toggle button, custom red marker showing exact location, coordinates display, location details, and professional card-based styling. Provides visual confirmation and context for precise venue locations.
UI consistency achievement: Successfully migrated booking details dialog from old complex 8-section layout to match new booking form's clean 2-section layout ("Client & Contact Information" and "Event Date & Venue"). Both new booking creation and existing booking editing workflows now use identical comprehensive form layouts, styling, and field organization for perfect user experience consistency.
Google Maps parity: Fixed missing Google Maps integration in booking details editing dialog. Both new booking creation and existing booking editing now feature identical AddressAutocomplete functionality - venue name auto-completion, automatic address population, venue contact info lookup, and mileage calculation with travel expense estimation. Complete feature parity achieved across all booking workflows.
Venue field improvements: Fixed critical venue field display issue where loaded booking data wasn't showing in AddressAutocomplete component. Added controlled input support with proper value syncing, enhanced auto-suggestion hiding logic, and expanded field width (400px minimum) for better venue name visibility. Travel expense calculation bug fixed - was incorrectly using distance in meters instead of miles, causing massive expense figures (£40,533 instead of £25.20). System now auto-corrects obviously wrong values over £1000 and uses proper HMRC mileage rate calculations.
Widget AI enhancement: Fixed critical booking widget issue where AI parsing wasn't extracting event dates from text when form date field was empty. Widget now properly calls `/api/widget/hybrid-submit` endpoint with correct data structure, and backend prioritizes AI-extracted dates and venues over empty form fields. Users can now submit booking widgets with dates mentioned only in the description text and system will automatically extract and use them.

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