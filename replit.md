# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform designed to streamline administrative tasks for musicians, including bookings, contracts, invoices, and compliance. Its primary purpose is to reduce administrative burdens, allowing musicians to focus on their creative work. The project aims to be a user-friendly, reliable, and scalable solution, aspiring to be an indispensable tool for managing all administrative aspects of a musician's career, increasing efficiency, and capitalizing on the growing independent artist market.

## User Preferences
Preferred communication style: Simple, everyday language.
Response priority: Immediate responsiveness - user must be able to interrupt at any moment without queue delays.
Contract signing: User wants only ONE simple sign contract button, no redundant "click to sign box" above it - simplified single-stage signing process.
Email notifications: Both client AND performer receive confirmation emails when contracts are signed.
SMS notifications: Premium feature only due to Twilio costs - Core plan users get email notifications, Premium users can enable SMS notifications for critical alerts (new bookings, overdue payments).
Problem-solving approach: When user reports "X was working last week but now it's broken" - FIND and RESTORE the original working system rather than rebuilding from scratch. This avoids creating conflicting duplicate systems.
Authentication system: DO NOT rebuild authentication system from scratch - causes more problems than it solves by creating conflicting duplicate systems. Make minimal surgical fixes only.
Lead email format: User prefers clean email format without "leads" prefix - uses `prefix@enquiries.musobuddy.com` instead of `prefix-leads@mg.musobuddy.com`.
Theme auto-save: User expects theme changes to automatically save to database when selected in UI, not require manual "Save" button click. Frontend theme updates immediately but database sync needs to happen automatically for PDF generation consistency.
Invoice data integrity: When invoices are edited, the PDF automatically regenerates with updated data and uploads to replace the old version, ensuring clients always see accurate information.
Invoice CC functionality: CC recipients are supported for invoice emails only (contracts remain single-recipient).
External integration deployment requirement: All external integrations (Stripe payments, Mailgun webhooks, OAuth callbacks, third-party APIs) are configured to communicate with the deployed version of the application, not the development environment.
Invoice reminders remain manual-only by user preference - automatic reminder system considered but rejected to maintain user control.
Timeline preference: User prefers realistic timeline expectations over artificial urgency - focus on thorough functionality testing over rushed deployment.
AI Usage Model: Removed all AI usage limitations and artificial premium tiers as "making a rod for our own back" since AI costs are minimal (£0.74/month even for super-heavy users with 50 bookings). System now provides unlimited AI-powered email parsing and response generation for all users. Uses dual AI models: GPT-5 for email parsing, Claude Sonnet 4 for response generation.
Google Calendar Sync Strategy: Implemented ID-based sync approach to minimize AI costs. Every MusoBuddy booking synced to Google Calendar gets permanent ID link embedded in event metadata. Future syncs use ID links for direct updates (zero AI cost). AI only used optionally for linking pre-existing Google Calendar events without MusoBuddy IDs. User handles high volume (5-6 daily inquiries) with minimal ongoing costs after initial setup.
Booking card actions: User prefers "Conversation" as a primary action button instead of separate View/Edit buttons. Primary actions should be: Respond, Conversation, and View. Secondary actions (Thank You, Invoice, Contract, Compliance, Reject) belong in dropdown menu to reduce clutter.
Document count indicators: Removed from booking cards due to persistent accuracy issues. User prefers working system without confusing indicators - Documents section remains accessible via booking details.
Venue name auto-fill manual control: Modified venue name auto-complete to only trigger on explicit user action. No automatic searches occur when opening booking forms or typing in venue name field. Auto-fill only activates when user clicks in venue name field and presses Tab, providing complete manual control over when API calls are made. Other address fields retain normal auto-search behavior.
Address book navigation: "View Details" button on client cards in address book now navigates directly to calendar view with specific booking highlighted, instead of just going to generic bookings page.
Messages centralization: Reorganized message system into centralized "Messages" page with tabbed interface. Combined client message replies and unparseable messages into single location for better UX. Moved "Messages" menu item up in sidebar below "Bookings" for improved navigation hierarchy. Dashboard retains message summary widget with total and unread counts.
Bookings page auto-scroll: Page automatically scrolls to the next upcoming booking (earliest future date) when arriving naturally on the bookings page, instead of showing the furthest future booking. This positions users at the most relevant booking for daily workflow management.
Email footer branding: User prefers simple "Sent via MusoBuddy" footer text instead of "Music Management" which sounds too much like an agency.
Email template display: Enhanced HTML email templates work correctly in Gmail and Apple Mail. Spark email client displays plain text version due to its security restrictions (normal behavior). Professional gradient headers, signature cards, and styling display properly in major email clients.
Mobile strategy: Implementing enhanced responsive design (Option 1) - single app that adapts intelligently to mobile vs desktop. Essential mobile features: invoice sending, booking list view, client lookup, basic booking entry. Complex features hidden on mobile: contract creation, detailed settings, complex forms. Future roadmap includes native mobile apps (Android/iOS) and desktop applications (Mac/PC) in coming months.
Unparseable message workflow: Streamlined approach where "Reply" button automatically converts unparseable messages to "dateless bookings" with proper booking IDs for conversation continuity. Removed manual "Convert to Booking" button. Added "Date TBC" filter on bookings page to manage inquiry-stage bookings without dates.
Booking re-processing: Manual "select and fix" approach where user selects specific bookings to re-process using checkboxes, then clicks "Re-process Selected" in bulk actions toolbar. User prefers manual control over which bookings get AI re-processing rather than automatic detection of problematic bookings.
Bookings page sort persistence: Sort criteria (field and direction) are saved to localStorage and restored when returning to bookings page, providing intuitive UX where users don't need to re-select their preferred sort order after editing bookings.
Booking summary gig sheets: New "Summary" button on booking cards opens comprehensive gig information in new tab with print-friendly layout. Organized by categories (Event Details, Venue Information, Client Information, Financial Details, Setup & Performance, Notes) and only displays populated fields. Includes optional Google Maps integration for venue location.
Conversation window original inquiry: Original client inquiry (stored in originalEmailContent field) displays as the first message in conversation threads with distinctive green styling and "Original Inquiry" badge. Provides complete conversation context from initial contact through all subsequent messages.
Travel expense integration: User-configurable setting to include travel expenses in performance fee display vs. showing as separate line items. Default behavior combines travel expenses with performance fee (e.g., £260 + £50 = £310 "inc. travel"), while alternative setting shows separate amounts (£260 + £50 travel). This ensures AI calculations, booking card displays, and contract generation remain synchronized regardless of user preference. Client-facing fee displays (emails and contract headers) always show the total combined amount (£310) to avoid appearing "clandestine" about fees. Breakdown details only appear within contract body when appropriate. Successfully fixed 19/01/2025 - travel expenses now persist correctly and total fees display properly.

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript, Vite) with Wouter for routing.
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI. Features WCAG 2.0 luminance for text contrast, various theme options, and a global luminance-aware styling system for optimal text colors.
- **State Management**: React Query.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: QR code generation, widget URL creation, R2 storage integration, dynamic PDF theming with consistent logo branding. Default booking view is list-based, with calendar as an option. Onboarding wizard is optional and dismissible. A permanent map display on booking forms shows venue locations.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Core Structure**: Modular route architecture.
- **Authentication**: JWT-based system with SMS/email/phone verification and secure email-based password reset.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails, parsing, and template management, supporting multiple CC recipients for invoices.
- **PDF Generation**: Isolated Puppeteer engines for dynamic PDF generation.
- **AI Integration**: Dual AI models: GPT-5 for email parsing and venue extraction; Claude Sonnet 4 for response generation. All AI usage is unlimited.
- **Google Maps Integration**: Uses client-side Maps API for venue location display and embedded maps in booking summary gig sheets.
- **Admin Database Access**: Read-only administration panel with table browsing, filtering, search, and CSV export.

### System Design Choices
- **User Management**: Two-tier system (Admin Accounts, User Accounts).
- **Booking Management**: Unified system with conflict detection, .ics calendar integration, status tracking, comprehensive forms (Google Maps API auto-population, mileage, what3words). Supports "TBC" times and "Actual Performance Time". Features individual field locking and status validation.
- **Document Management**: Multi-document upload system per booking with categorization, secure R2 cloud storage, and automatic counting.
- **Contract Generation**: Dynamic PDF generation, digital signatures, cloud storage, automated reminders, guided creation, and legally compliant amendment system.
- **Invoice Management**: Professional invoice generation, payment tracking (manual "Mark as Paid"), overdue monitoring. Invoice security via random 16-character tokens in URLs.
- **Compliance Tracking**: Document management, expiry date monitoring, alerts, and automated sharing.
- **Security**: Robust session validation, rate limiting, enhanced database connection pooling, secure password hashing, input validation/sanitization, and async error handling.
- **System Isolation**: Critical components (invoice/contract generation) are isolated systems.
- **Email Processing**: Comprehensive queue system to eliminate race conditions, process emails sequentially with delays for AI accuracy, using mutex locking and duplicate detection, including retry logic and queue status monitoring.

## External Dependencies

- **Cloud Services**:
    - Cloudflare R2
    - Neon Database (PostgreSQL)
    - Replit (Authentication and hosting)
- **APIs and Services**:
    - Google Maps API
    - Mailgun
    - OpenAI GPT-5
    - Puppeteer
    - Stripe
    - Twilio
    - what3words API