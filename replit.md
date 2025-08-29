# MusoBuddy

## Overview
MusoBuddy is a platform designed to streamline administrative tasks for musicians, including bookings, contracts, and invoices. It aims to alleviate administrative burdens, enabling musicians to prioritize their creative work. The project seeks to be a user-friendly, scalable, and globally leading solution for music career management, simplifying business administration and empowering artists with an integrated suite of tools, including AI-powered email parsing and response generation. The business vision is to be the go-to platform for musicians worldwide, enhancing their professional lives and market potential.

## User Preferences
Preferred communication style: Simple, everyday language.
Response priority: Immediate responsiveness - user must be able to interrupt at any moment without queue delays.
Contract signing: User wants only ONE simple sign contract button, no redundant "click to sign box" above it - simplified single-stage signing process.
Email notifications: Both client AND performer receive confirmation emails when contracts are signed.
SMS notifications: Premium feature only due to Twilio costs - Core plan users get email notifications, Premium users can enable SMS notifications for critical alerts (new bookings, overdue payments).
Problem-solving approach: When user reports "X was working last week but now it's broken" - FIND and RESTORE the original working system rather than rebuilding from scratch. This avoids creating conflicting duplicate systems.
Authentication system: DO NOT rebuild authentication system from scratch - causes more problems than ironically creating conflicting duplicate systems. Make minimal surgical fixes only.
Lead email format: User prefers clean email format without "leads" prefix - uses `prefix@enquiries.musobuddy.com` instead of `prefix-leads@mg.musobuddy.com`.
Theme auto-save: User expects theme changes to automatically save to database when selected in UI, not require manual "Save" button click. Frontend theme updates immediately but database sync needs to happen automatically for PDF generation consistency.
Invoice data integrity: When invoices are edited, the PDF automatically regenerates with updated data and uploads to replace the old version, ensuring clients always see accurate information.
Invoice CC functionality: CC recipients are supported for invoice emails only (contracts remain single-recipient).
External integration deployment requirement: All external integrations (Stripe payments, Mailgun webhooks, OAuth callbacks, third-party APIs) are configured to communicate with the deployed version of the application, not the development environment.
Invoice reminders remain manual-only by user preference - automatic reminder system considered but rejected to maintain user control.
Timeline preference: User prefers realistic timeline expectations over artificial urgency - focus on thorough functionality testing over rushed deployment.
Google Calendar Sync Strategy: Implemented ID-based sync approach to minimize AI costs. Every MusoBuddy booking synced to Google Calendar gets permanent ID link embedded in event metadata. Future syncs uses ID links for direct updates (zero AI cost). AI only used optionally for linking pre-existing Google Calendar events without MusoBuddy IDs.
Google Calendar field mapping: Event titles display as "Client Name - Event Type" format (e.g., "Susan Davis - Wedding") per user preference, providing clear identification of both client and event type in calendar view.
Booking card actions: User prefers "Conversation" as a primary action button instead of separate View/Edit buttons. Primary actions should be: Respond, Conversation, and View. Secondary actions (Thank You, Invoice, Contract, Compliance, Reject) belong in dropdown menu to reduce clutter.
Document count indicators: Removed from booking cards due to persistent accuracy issues. User prefers working system without confusing indicators - Documents section remains accessible via booking details.
Venue name auto-fill manual control: Modified venue name auto-complete to only trigger on an explicit user action. No automatic searches occur when opening booking forms or typing in venue name. Auto-fill only activates when user clicks in venue name field and presses Tab, providing complete manual control over when API calls are made. Other address fields retain normal auto-search behavior.
Address book navigation: "View Details" button on client cards in address book now navigates directly to calendar view with specific booking highlighted, instead of just going to generic bookings page.
Messages centralization: Reorganized message system into centralized "Messages" page with tabbed interface. Combined client message replies and unparseable messages into single location for better UX. Moved "Messages" menu item up in sidebar below "Bookings" for improved navigation hierarchy. Dashboard retains message summary widget with total and unread counts.
Bookings page auto-scroll: Page automatically scrolls to the next upcoming booking (earliest future date) when arriving naturally on the bookings page, instead of showing the furthest future booking. This positions users at the most relevant booking for daily workflow management.
Edit booking page sidebar: Added sidebar navigation to the edit booking page (new-booking.tsx) for consistent navigation experience. Sidebar appears on desktop devices, matching the dashboard layout and providing quick access to all system sections while editing bookings.
Email footer branding: User prefers simple "Sent via MusoBuddy" footer text instead of "Music Management" which sounds too much like an agency.
Email template display: Enhanced HTML email templates work correctly in Gmail and and Apple Mail. Spark email client displays plain text version due to its security restrictions (normal behavior). Professional gradient headers, signature cards, and styling display properly in major email clients.
Mobile strategy: Implementing enhanced responsive design (Option 1) - single app that adapts intelligently to mobile vs desktop. Essential mobile features: invoice sending, booking list view, client lookup, basic booking entry. Complex features hidden on mobile: contract creation, detailed settings, complex forms. Future roadmap includes native mobile apps (Android/iOS) and desktop applications (Mac/PC) in coming months.
Unparseable message workflow: Streamlined approach where "Reply" button automatically converts unparseable messages to "dateless bookings" with proper booking IDs for conversation continuity. Removed manual "Convert to Booking" button. Added "Date TBC" filter on bookings page to manage inquiry-stage bookings without dates.
Booking re-processing: Manual "select and fix" approach where user selects specific bookings to re-process using checkboxes, then clicks "Re-process Selected" in bulk actions toolbar. User prefers manual control over which bookings gets AI re-processing rather than automatic detection of problematic bookings.
Extract details from messages: Manual "Extract Details" button on client replies in conversations. Shows review dialog with append/replace options for each field. Notes default to append mode while other fields default to replace. Shows preview of final value for append operations. User values safety with full review before applying changes.
Bookings page sort persistence: Sort criteria (field and direction) are saved to localStorage and restored when returning to bookings page, providing intuitive UX where users don't need to re-select their preferred sort order after editing bookings.
Booking summary gig sheets: New "Summary" button on booking cards opens comprehensive gig information in new tab with print-friendly layout. Organized by categories (Event Details, Venue Information, Client Information, Financial Details, Setup & Performance, Notes) and only displays populated fields. Includes optional Google Maps integration for venue location.
Conversation window original inquiry: Original client inquiry (stored in originalEmailContent field) displays as the first message in conversation threads with distinctive green styling and "Original Inquiry" badge. Provides complete conversation context from initial contact through all subsequent messages.
Conversation to booking navigation: "Edit Booking" button added to conversation header for easy navigation from conversation history to booking form. Provides quick access to edit booking details while viewing client conversations.
Travel expense integration: SIMPLIFIED SYSTEM - Travel expenses are always included in the performance fee display as a single amount to eliminate calculation confusion. The previous toggle system was removed to ensure consistent calculations across AI responses, booking displays, and contract generation. All fees are now displayed as a clean total (e.g., £310) without automatic travel breakdown labels. Users have full control over whether and how they communicate travel expense details to clients manually, allowing for personalized client communication approaches.
PDF contract page break handling: Enhanced CSS rules to prevent venue field titles and values from being separated across page breaks. Venue and venue address fields are grouped together with `break-inside: avoid` and `page-break-inside: avoid` CSS properties. If space is insufficient, the entire venue details group moves to the next page as a unit, maintaining professional layout integrity.
Encore booking management: Added toggle switch for Encore bookings on both dashboard and bookings page that clearly shows current application status and allows toggling between "not applied" (new status) and "applied" (in_progress status). This replaces the confusing "Applied" button that looked identical before and after clicking. Toggle switch prevents dashboard clutter from applied-for jobs while maintaining booking records and providing clear visual feedback.
Contract fee data priority: Booking form data always overrides travel expense settings when creating contracts. The specific fee amounts entered in individual bookings take precedence over over global travel expense integration preferences, ensuring contract accuracy matches booking form displays exactly. Implemented cache-bustings API calls and complete form reset to prevent stale fee data from appearing in contract creation forms.
User-customizable contract terms: Contract Terms & Conditions are now fully editable at the user level through Settings page. Users can replace the default professional terms with their own custom terms and conditions, which will appear in all generated contract PDFs. The terms support line breaks for proper formatting and can be toggled on/off via the themeShowTerms setting. If no custom terms are provided, the system uses comprehensive default terms covering payment, cancellation, performance standards, and legal framework.
Time format standardization: Both booking form and contract form now use identical 24-hour time format (input type="time") ensuring precise time auto-population. When contracts are generated from bookings with specific times like "16:03", the contract form correctly displays and pre-selects these exact times insteads of showing blank fields. This eliminates the previous format mismatch between 24-hour booking times and predefined AM/PM contract options.
Contract PDF luminance-aware branding: MusoBuddy logo text and tagline in contract PDFs now dynamically adjust color based on theme background luminance for optimal visibility. On dark themes like midnight blue, text appears in white/light colors; on light themes, it appears in dark colors. This ensures WCAG 2.0 compliant contrast ratios and professional branding visibility across all theme colors.
Client portal system architecture: Implemented dual-portal system with clear separation of concerns. React Client Portal handles mandatory contract signing fields (client phone, address, venue address) before signing, while Dynamic Collaborative Form manages post-signing event planning collaboration (venue contacts, music preferences, logistics). Switched from static R2 HTML storage to dynamic server-side rendering, ensuring collaborative forms always display fresh database data without manual regeneration. Fixed critical field mapping inconsistencies between snake_case database columns and camelCase frontend expectations. All collaborative fields now sync bidirectionally in real-time between booking forms and client collaborative forms.

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript, Vite) with Wouter for routing.
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI, adhering to WCAG 2.0 luminance for text contrast. Dynamic PDF theming.
- **State Management**: React Query.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: Enhanced responsive design, simplified action buttons, centralized messaging, auto-scroll to upcoming bookings, consistent sidebar navigation, simplified branding, enhanced email template display, and a dual client portal system for signing and collaboration.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Authentication**: Pure Firebase authentication with Google Sign-in and email/password options. Firebase Admin SDK for token verification. Subscription-based access control with Firebase middleware.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails, parsing, and template management.
- **PDF Generation**: Isolated Puppeteer engines for dynamic PDF generation.
- **AI Integration**: Dual AI models for unlimited usage.

### System Design Choices
- **User Management**: Two-tier system (Admin Accounts, User Accounts).
- **Booking Management**: Unified system with conflict detection, .ics calendar integration, status tracking, comprehensive forms.
- **Document Management**: Multi-document upload system per booking with categorization and secure cloud storage.
- **Contract Generation**: Dynamic PDF generation, digital signatures, automated reminders, user-customizable terms, consistent 24-hour time formatting, and luminance-aware branding.
- **Invoice Management**: Professional invoice generation, payment tracking, overdue monitoring, secure URLs, and support for multiple CC recipients.
- **Compliance Tracking**: Document management with expiry date monitoring and alerts.
- **Security**: Robust session validation, rate limiting, enhanced database connection pooling, secure password hashing, input validation/sanitization, and async error handling.
- **System Isolation**: Critical components (invoice/contract generation) designed as isolated systems for reliability.
- **Email Processing**: Comprehensive queue system to eliminate race conditions, process emails sequentially with delays for AI accuracy, using mutex locking, duplicate detection, and retry logic. Centralized "Messages" page for all client communications.
- **AI-powered Workflows**: Streamlined unparseable message workflow, manual booking re-processing, and manual detail extraction from messages with review dialog.
- **Calendar Sync**: ID-based Google Calendar sync for efficiency and cost optimization.
- **Travel Expense Management**: Simplified system where travel expenses are always included in the performance fee display as a single amount.
- **Encore Booking Management**: Toggle switch for clear application status.
- **Client Portal**: Dual-portal system for contract signing and post-signing event planning collaboration with real-time bidirectional sync.

## External Dependencies

- **Cloud Services**:
    - Cloudflare R2
    - Neon Database (PostgreSQL)
- **APIs and Services**:
    - Firebase
    - Google Maps API
    - Mailgun
    - OpenAI GPT-5
    - Puppeteer
    - Stripe
    - Twilio
    - what3words API