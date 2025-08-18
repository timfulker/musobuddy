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
Booking card actions: User prefers "Conversation" as a primary action button instead of separate View/Edit buttons. Primary actions should be: Respond, Conversation, and View. Secondary actions (Thank You, Invoice, Contract, Compliance, Reject) belong in dropdown menu to reduce clutter.
Document count indicators: Removed from booking cards due to persistent accuracy issues. User prefers working system without confusing indicators - Documents section remains accessible via booking details.
Venue name auto-fill manual control: Modified venue name auto-complete to only trigger on explicit user action. No automatic searches occur when opening booking forms or typing in venue name field. Auto-fill only activates when user clicks in venue name field and presses Tab, providing complete manual control over when API calls are made. Other address fields retain normal auto-search behavior.
Address book navigation: "View Details" button on client cards in address book now navigates directly to calendar view with specific booking highlighted, instead of just going to generic bookings page.
Messages centralization: Reorganized message system into centralized "Messages" page with tabbed interface. Combined client message replies and unparseable messages into single location for better UX. Moved "Messages" menu item up in sidebar below "Bookings" for improved navigation hierarchy. Dashboard retains message summary widget with total and unread counts.
Bookings page auto-scroll: Page automatically scrolls to the next upcoming booking (earliest future date) when arriving naturally on the bookings page, instead of showing the furthest future booking. This positions users at the most relevant booking for daily workflow management.

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript, Vite) with Wouter for routing.
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI, including WCAG 2.0 luminance for text contrast and various theme options. A global luminance-aware styling system automatically calculates optimal text colors based on background luminance. For stubborn text color overrides, a `useEffect` hook injects styles with `-webkit-text-fill-color` and `!important` into the document head.
- **State Management**: React Query.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: QR code generation, widget URL creation, R2 storage integration, dynamic PDF theming (invoices, contracts) with consistent logo branding. Default booking view is list-based, with calendar as an option. Onboarding wizard is an optional, dismissible tool for new users, focusing on essential setup. A permanent map display on booking forms shows venue locations.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Core Structure**: Modular route architecture.
- **Authentication**: JWT-based system with SMS/email/phone verification, and secure email-based password reset, using unified middleware.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails, parsing, and template management. Handles multiple CC recipients for invoices. Critical issue of duplicate email processing from multiple Mailgun routes has been fixed. Email extraction prioritizes form content over sender addresses.
- **PDF Generation**: Isolated Puppeteer engines for dynamic PDF generation of invoices and contracts.
- **AI Integration**: OpenAI GPT-5 for email parsing and enhanced venue extraction, distinguishing between venue names and location names. AI is optimized to prevent unnecessary Google Maps API calls for placeholder venues or general locations.
- **Admin Database Access**: Read-only database administration panel with table browsing, filtering, search, and CSV export (admin-only access).

### System Design Choices
- **User Management**: Two-tier system (Admin Accounts, User Accounts).
- **Booking Management**: Unified system with conflict detection, .ics calendar integration, status tracking, comprehensive forms (Google Maps API for venue auto-population, mileage, what3words). Mileage calculation is optimized to skip existing data. Supports "TBC" times and "Actual Performance Time" fields. Features individual field locking. Booking status validation prevents marking future bookings as "completed".
- **Document Management**: Multi-document upload system per booking with categorization (contract/invoice/other), secure R2 cloud storage, and automatic counting.
- **Contract Generation**: Dynamic PDF generation, digital signatures, cloud storage, automated reminders, guided creation, and legally compliant amendment system.
- **Invoice Management**: Professional invoice generation, payment tracking (manual "Mark as Paid"), overdue monitoring. Invoice security via random 16-character tokens in URLs for R2 file access.
- **Compliance Tracking**: Document management, expiry date monitoring, alerts, and automated sharing.
- **Security**: Robust session validation, rate limiting, enhanced database connection pooling, secure password hashing, input validation/sanitization, and async error handling.
- **System Isolation**: Critical components (invoice/contract generation) are isolated systems.
- **Email Processing**: Comprehensive queue system to eliminate race conditions, process emails sequentially with delays for AI accuracy, using mutex locking and duplicate detection. Includes retry logic and queue status monitoring.

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