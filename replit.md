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
Email prefix matching: Case-insensitive email prefix matching implemented (January 2025) - users can send to dad@, Dad@, DAD@, etc. and all variations will work correctly.
Theme auto-save: User expects theme changes to automatically save to database when selected in UI, not require manual "Save" button click. Frontend theme updates immediately but database sync needs to happen automatically for PDF generation consistency.
Global luminance-aware system: User identified critical need for app-wide automatic text contrast adjustment. Implemented global luminance-aware styling system (August 2025) that automatically calculates optimal text colors based on background luminance using WCAG 2.1 contrast standards. System includes CSS utility classes, React hooks, and automatic dialog text contrast fixing to eliminate the recurring issue of white text on white backgrounds across theme variations.
Stubborn text color override solution: For cases where standard CSS color properties are overridden by browser extensions or frameworks, use useEffect to inject styles with -webkit-text-fill-color property and !important declarations directly into document head. This webkit-specific property often overrides standard color property and is crucial for forcing text visibility when other methods fail (January 2025).
Force Text Color Injection Technique: When CSS complexity makes simple color changes impossible (January 2025), use this proven method:
  1. Create a useEffect hook that injects a <style> element into document head
  2. Define CSS class with both `color: [desired-color] !important` AND `-webkit-text-fill-color: [desired-color] !important`
  3. Apply the custom class to the problematic element
  Example implementation that fixed the "New" badge text visibility:
  ```javascript
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .new-badge-override {
        background-color: #191970 !important;
        color: white !important;
        -webkit-text-fill-color: white !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  ```
  Then apply class: `<div className="new-badge-override">New</div>`
  This technique bypasses all CSS layer conflicts, theme variables, and component styling issues.
Onboarding wizard: Should be a helpful optional tool rather than mandatory, appearing immediately for new authenticated users, and always allow users to dismiss/abort the wizard. It's designed to be helpful rather than something users must complete. Focuses on 5 essential setup items: business address, email prefix, business email, bank details, and booking widget generation.
Invoice data integrity: When invoices are edited, the PDF automatically regenerates with updated data and uploads to replace the old version, ensuring clients always see accurate information.
Invoice CC functionality: CC recipients are supported for invoice emails only (contracts remain single-recipient). The system properly handles multiple recipients via Mailgun's CC field, with full frontend form support and database storage (August 2025).
External integration deployment requirement: All external integrations (Stripe payments, Mailgun webhooks, OAuth callbacks, third-party APIs) are configured to communicate with the deployed version of the application, not the development environment. Changes to external integration handling require deployment to take effect because external services cannot reach local development servers and webhook URLs point to production domains.
Invoice reminders remain manual-only by user preference - automatic reminder system considered but rejected to maintain user control.
Timeline preference: User prefers realistic timeline expectations over artificial urgency - focus on thorough functionality testing over rushed deployment.
Launch timeline: Few days for bug fixes → next week for landing page → beta testing with 4-5 users (2-3 weeks starting ~22nd/23rd) → full launch mid-to-end September. Primary concern: scalability during beta testing phase.
Admin database access: Read-only database administration panel added as submenu in admin section (August 2025). Includes table browsing, filtering, search, and CSV export with strict admin-only access controls. Enhanced frontend security protection prevents non-admin users from accessing admin panel even in development cross-session scenarios. Fixed table name mapping for underscore database tables (compliance_documents, email_templates, etc.) and enhanced search functionality across all database tables.
Document count indicators: Removed from booking cards due to persistent accuracy issues (August 2025). User prefers working system without confusing indicators - Documents section remains accessible via booking details.
Mileage calculation optimization: Fixed wasteful API calls (August 2025). System now skips mileage calculation for existing bookings that already have saved mileage data, only calculates for new bookings or manual address changes.
AI venue parsing improvement: Enhanced AI to properly distinguish between venue names and location names (January 2025). System now correctly identifies "our garden" as venue name and "Swindon" as location, preventing Google Maps from suggesting unrelated venues like "Sky Garden" in London when parsing booking emails. AI also simplifies location descriptions ("near Swindon" → "Swindon") for better Google Maps compatibility.
Encore booking location extraction: Fixed critical issue where Encore bookings weren't extracting location from email titles (January 2025). System now properly extracts area from Encore email subjects (e.g., "Saxophonist needed for wedding in Rock" → area = "Rock") and prevents Google Places enrichment for all Encore bookings. Fix involved reordering operations to extract apply-now link before Encore detection.
Address book navigation: "View Details" button on client cards in address book now navigates directly to calendar view with specific booking highlighted (January 2025), instead of just going to generic bookings page.
Forgot password system: Complete email-based password reset functionality implemented (January 2025) with secure crypto-generated tokens, 1-hour expiration, professional email templates using existing Mailgun infrastructure, and user-friendly frontend flow including dedicated forgot password and reset password pages.
Messages centralization: Reorganized message system into centralized "Messages" page with tabbed interface (January 2025). Combined client message replies and unparseable messages into single location for better UX. Moved "Messages" menu item up in sidebar below "Bookings" for improved navigation hierarchy. Dashboard retains message summary widget with total and unread counts.
Duplicate email processing fix: Resolved critical duplication issue (January 2025) caused by multiple Mailgun routes with same priority processing identical emails. Fixed by removing duplicate specific match_recipient routes for timfulkermusic@enquiries.musobuddy.com, keeping only the catch_all route. This eliminated duplicate bookings and review messages from single email submissions.

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
- **Authentication**: Pure JWT-based system with SMS verification, email/password login, phone number verification, and secure forgot password functionality using email-based reset flow with 1-hour token expiration, using a unified middleware. Production URLs are hardcoded for Stripe redirects.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails, parsing, and template management, with professional email styling.
- **PDF Generation**: Isolated Puppeteer engines for dynamic PDF generation of invoices and contracts.
- **AI Integration**: Claude Haiku for contract parsing, email parsing, price enquiry detection, message categorization, and intelligent date logic. Enhanced venue extraction (January 2025) to distinguish between venue names (e.g., "our garden", "the church hall") and location/city names (e.g., "Swindon", "London").
- **System Design Choices**:
    - **User Management**: Two-tier system (Admin Accounts, User Accounts).
    - **Booking Management**: Unified system with conflict detection, calendar integration (.ics), status tracking, comprehensive forms (including venue auto-population via Google Maps API, mileage calculation, what3words integration), and a standalone, token-based booking widget that can parse dates from text. Supports "TBC" times and "Actual Performance Time" fields. Features individual field locking for collaborative forms (August 2025), allowing users to control which specific fields clients can edit on a per-field basis.
    - **Document Management**: Multi-document upload system per booking (August 2025) with categorization (contract/invoice/other), secure R2 cloud storage, and automatic counting that combines new multi-document system with legacy single-document support. Fixed document count display issue where API response parsing was incorrect.
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