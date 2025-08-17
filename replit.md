# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform for musicians, designed to streamline administrative tasks such as bookings, contracts, invoices, and compliance. Its purpose is to provide a user-friendly, reliable, and scalable centralized solution that reduces administrative burdens, enabling musicians to focus on their craft. The project aims to become an indispensable tool covering all administrative aspects of a musician's career, increasing efficiency and capitalizing on the growing independent artist market.

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
Email prefix matching: Case-insensitive email prefix matching implemented - users can send to dad@, Dad@, DAD@, etc. and all variations will work correctly.
Theme auto-save: User expects theme changes to automatically save to database when selected in UI, not require manual "Save" button click. Frontend theme updates immediately but database sync needs to happen automatically for PDF generation consistency.
Global luminance-aware system: User identified critical need for app-wide automatic text contrast adjustment. Implemented global luminance-aware styling system that automatically calculates optimal text colors based on background luminance using WCAG 2.1 contrast standards. System includes CSS utility classes, React hooks, and automatic dialog text contrast fixing to eliminate the recurring issue of white text on white backgrounds across theme variations.
Stubborn text color override solution: For cases where standard CSS color properties are overridden by browser extensions or frameworks, use useEffect to inject styles with -webkit-text-fill-color property and !important declarations directly into document head. This webkit-specific property often overrides standard color property and is crucial for forcing text visibility when other methods fail.
Force Text Color Injection Technique: When CSS complexity makes simple color changes impossible, use this proven method:
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
Invoice CC functionality: CC recipients are supported for invoice emails only (contracts remain single-recipient). The system properly handles multiple recipients via Mailgun's CC field, with full frontend form support and database storage.
External integration deployment requirement: All external integrations (Stripe payments, Mailgun webhooks, OAuth callbacks, third-party APIs) are configured to communicate with the deployed version of the application, not the development environment. Changes to external integration handling require deployment to take effect because external services cannot reach local development servers and webhook URLs point to production domains.
Invoice reminders remain manual-only by user preference - automatic reminder system considered but rejected to maintain user control.
Timeline preference: User prefers realistic timeline expectations over artificial urgency - focus on thorough functionality testing over rushed deployment.
Admin database access: Read-only database administration panel added as submenu in admin section. Includes table browsing, filtering, search, and CSV export with strict admin-only access controls.
Document count indicators: Removed from booking cards due to persistent accuracy issues. User prefers working system without confusing indicators - Documents section remains accessible via booking details.
Mileage calculation optimization: Fixed wasteful API calls. System now skips mileage calculation for existing bookings that already have mileage data, only calculates for new bookings or manual address changes.
AI venue parsing improvement: Enhanced AI to properly distinguish between venue names and location names. System now correctly identifies "our garden" as venue name and "Swindon" as location, preventing Google Maps from suggesting unrelated venues like "Sky Garden" in London when parsing booking emails. AI also simplifies location descriptions ("near Swindon" → "Swindon") for better Google Maps compatibility.
Encore booking location extraction: Fixed critical issue where Encore bookings weren't extracting location from email titles. System now properly extracts area from Encore email subjects (e.g., "Saxophonist needed for wedding in Rock" → area = "Rock") and prevents Google Places enrichment for all Encore bookings.
Booking form map integration: Added permanent map display on booking forms showing venue locations. Cost-effective approach using single Google Maps API call per booking form view (~$0.012) instead of expensive hover maps. Map appears when venue/address is entered, includes geocoding cache, and provides visual context to mileage calculations. Integrated into venue section with blue theme matching.
Address book navigation: "View Details" button on client cards in address book now navigates directly to calendar view with specific booking highlighted, instead of just going to generic bookings page.
Forgot password system: Complete email-based password reset functionality implemented with secure crypto-generated tokens, 1-hour expiration, professional email templates using existing Mailgun infrastructure, and user-friendly frontend flow including dedicated forgot password and reset password pages.
Messages centralization: Reorganized message system into centralized "Messages" page with tabbed interface. Combined client message replies and unparseable messages into single location for better UX. Moved "Messages" menu item up in sidebar below "Bookings" for improved navigation hierarchy. Dashboard retains message summary widget with total and unread counts.
Duplicate email processing fix: Resolved critical duplication issue caused by multiple Mailgun routes with same priority processing identical emails. Fixed by removing duplicate specific match_recipient routes for timfulkermusic@enquiries.musobuddy.com, keeping only the catch_all route. This eliminated duplicate bookings and review messages from single email submissions.
Email extraction priority fix: Fixed critical issue where system used sender email addresses (like no-reply@weebly.com) instead of actual client emails from form content. Implemented intelligent email extraction that prioritizes form content emails over sender addresses, with fallback logic that skips service emails. Applied to all processing paths including AI parsing, Weebly fallback, and review message saving.
AI model upgrade: Switched from Claude 3 Haiku to OpenAI GPT-5 for email parsing. Initial testing with GPT-5 nano showed date detection issues on complex dates like "October 13th", so upgraded to full GPT-5 model for superior accuracy.
GPT-5 parsing system fully fixed: Resolved critical API compatibility issues preventing GPT-5 from functioning. Root cause was twofold: (1) Missing Mailgun route for user's email prefix - created route `68a22efe0a9e06824ff9973c` for `timfulkermusic@enquiries.musobuddy.com` to ensure emails reach the main webhook, (2) Insufficient token allocation for GPT-5 reasoning model - increased from 250 to 4000 tokens to accommodate GPT-5's internal reasoning plus response output. Previously, GPT-5 consumed all tokens for reasoning with none remaining for response content, causing empty responses. Added comprehensive token usage logging to track prompt/completion/reasoning token distribution. Additional fixes: artificial rate limiting increased from 7 to 50,000 daily calls matching user's 200k TPM limits, enhanced email extraction to prefer HTML content for better signature detection. System now properly routes emails and successfully extracts dates like "September 10th 2025" → "2025-09-10" and client names from signatures instead of FROM fields.

## System Architecture

### Frontend
- **Framework**: React 18 (TypeScript, Vite) with Wouter for routing.
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI, offering clean cards, gradient forms, responsive layouts, consistent sidebar, and multiple theme options (Purple, Ocean Blue, Forest Green, Clean Pro Audio, Midnight Blue). Includes WCAG 2.0 luminance for text contrast.
- **State Management**: React Query.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: Incorporates QR code generation, widget URL creation, R2 storage integration, and dynamic PDF theming (invoices, contracts) with consistent logo branding. Default booking view is list-based, with calendar as an option.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Core Structure**: Modular route architecture.
- **Authentication**: JWT-based system with SMS/email/phone verification, and secure email-based password reset. Uses unified middleware.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails, parsing, and template management.
- **PDF Generation**: Isolated Puppeteer engines for dynamic PDF generation of invoices and contracts.
- **AI Integration**: Claude Haiku for contract parsing, price enquiry detection, message categorization, and intelligent date logic. OpenAI GPT-5 for email parsing and enhanced venue extraction.
- **System Design Choices**:
    - **User Management**: Two-tier system (Admin Accounts, User Accounts).
    - **Booking Management**: Unified system with conflict detection, .ics calendar integration, status tracking, comprehensive forms (Google Maps API for venue auto-population, mileage, what3words), and a standalone, token-based booking widget that parses dates. Supports "TBC" times and "Actual Performance Time" fields. Features individual field locking.
    - **Document Management**: Multi-document upload system per booking with categorization (contract/invoice/other), secure R2 cloud storage, and automatic counting.
    - **Contract Generation**: Dynamic PDF generation, digital signatures, cloud storage, automated reminders, guided creation, and legally compliant amendment system.
    - **Invoice Management**: Professional invoice generation, payment tracking (manual "Mark as Paid"), overdue monitoring. Invoice security via random 16-character tokens in URLs for R2 file access.
    - **Compliance Tracking**: Document management, expiry date monitoring, alerts, and automated sharing.
    - **Security**: Robust session validation, rate limiting, enhanced database connection pooling, secure password hashing, input validation/sanitization, and async error handling.
    - **System Health Monitoring**: Real-time dashboard (`/system-health`).
    - **Deployment**: Node.js server serving built frontend.
    - **API Design**: RESTful, consistent JSON responses, and comprehensive error handling.
    - **System Isolation**: Critical components (invoice/contract generation) are isolated systems.
    - **Onboarding Wizard**: Multi-step wizard covering business info, contact details, email prefix setup, pricing rates, service areas, and theme branding.
    - **Email Processing**: Comprehensive queue system to eliminate race conditions, process emails sequentially with delays for AI accuracy, using mutex locking and duplicate detection. Includes retry logic and queue status monitoring.

## External Dependencies

- **Cloud Services**:
    - Cloudflare R2
    - Mailgun
    - Neon Database (PostgreSQL)
    - Replit (Authentication and hosting)
- **APIs and Services**:
    - Anthropic Claude Haiku
    - Google Maps API
    - OpenAI GPT-5
    - Puppeteer
    - Stripe
    - Twilio
    - what3words API