# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform designed to streamline administrative tasks for musicians, allowing them more time for their craft. It provides tools for managing bookings, contracts, invoices, and compliance requirements. The platform aims to be user-friendly, reliable, and scalable, offering a centralized solution for common music business challenges with significant market potential.

**Target Market**: Initial launch focused on the UK market, with plans for international expansion.

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
Stripe integration: Unified signup flow where ALL users (including free trial) must go through Stripe first to register credit cards. 30-day free trial period. Can deploy with TEST keys for testing, switch to LIVE keys for production launch.

## Recent Updates (10/01/2025)
- **DYNAMIC PDF THEMING IMPLEMENTED (MAJOR FEATURE)**: Contract and invoice PDFs now use user's selected theme colors
  - **FUNCTIONALITY**: PDFs automatically match user's chosen theme (Purple, Ocean Blue, Forest Green, Clean Pro Audio, Midnight Blue)
  - **TECHNICAL IMPLEMENTATION**: Dynamic color injection using `userSettings.themeAccentColor` with fallback system
  - **THEME MAPPING**: Automated primary/secondary color pairing for professional gradient effects
  - **SCOPE**: Both contract and invoice PDFs now respect theme selection instead of hardcoded Midnight Blue
  - **USER BENEFIT**: Complete brand consistency across all generated documents matching app interface theme
- **GLOCKAPPS DELIVERABILITY TEST ENDPOINT FIXED**: Created missing `/api/test/glockapp-delivery` endpoint for email deliverability testing
  - **CRITICAL FOR UK LAUNCH**: Proper test ID headers (`X-Glockapps-Test-ID`) now included in emails for spam filter testing
  - **COMPREHENSIVE TESTING**: Endpoint supports all major email providers and spam filters for UK market validation
  - **FUNCTIONALITY**: Personalizes templates, adds test ID to headers and body, handles rate limiting with delays
  - **UK MARKET FOCUS**: Initial launch targeting UK market confirmed, with international expansion planned
- **EMAIL TEMPLATES SYSTEM COMPLETE**: Full CRUD operations with automatic seeding of 5 default templates
- **QR CODE GENERATION FULLY FIXED**: Complete resolution of widget generation system (CONFIRMED WORKING)
  - **ROOT CAUSE**: apiRequest function returning Response objects instead of parsed JSON data
  - **ERROR**: "TypeError: (intermediate value).json is not a function" when frontend tried to parse already-parsed data
  - **SOLUTION**: Fixed apiRequest to return Response objects, updated Settings component to properly parse JSON
  - **PERSISTENCE FIX**: Added React Query integration for automatic widget data persistence across page navigations
  - **CONFIRMED WORKING**: QR code generation, widget URL creation, R2 storage integration, and widget persistence all functioning
  - **USER TESTED**: Widget generation button successfully creates permanent booking widgets with QR codes that persist
- **CRITICAL EMAIL PARSING BUG FIX (EMERGENCY)**: Fixed "next April" availability queries creating bookings for today
  - **BUSINESS IMPACT**: Prevents revenue loss from misrouted availability enquiries that should get personal responses
  - **ROOT CAUSE**: Multiple silent failures - rules conflict, string "null" vs JSON null, pre-validation resolution
  - **COMPREHENSIVE SOLUTION**: Bulletproof validation system with exactness checking and provenance tracking
  - **PROTECTION LAYERS**: 
    - **AI Prompt Fix**: Removed contradictory rules, added exactness classification (exact|relative-day|partial|none)
    - **Robust Validator**: TypeScript validator checks date format, exactness, and source snippet authenticity
    - **Safety Net Regex**: Pre-AI detection of vague patterns like "next April", "next year"
    - **Multiple Traps**: Catches string "null", empty strings, today's date defaults, and partial dates
  - **NEW AI FIELDS**: `eventDate_text` (source snippet), `eventDate_exactness` (validation level)
  - **CRITICAL SAFETY NET**: Pre-AI regex detection immediately catches vague patterns before AI processing
  - **TEST CASES**: 
    - "Are you available for a wedding next March, in London" → Pre-AI safety net → Review Messages ✅
    - "Are you available next April" → Pre-AI safety net → Review Messages ✅  
    - "next Friday" → `eventDate_exactness: "relative-day"` → Valid booking ✅
    - "August 13th" → `eventDate_exactness: "exact"` → Valid booking ✅

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, Vite as build tool.
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI primitives.
- **State Management**: React Query.
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: Clean white cards with left border status indicators, gradient-styled forms, professional action buttons, responsive layouts (mobile-optimized), consistent sidebar navigation, clear visual cues. Multiple theme options (Purple, Ocean Blue, Forest Green, Clean Pro Audio, Midnight Blue) with theme-aware components and an animated metronome logo. QR code generation, widget URL creation, R2 storage integration, and widget persistence are all functioning.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Core Structure**: Modular route architecture for authentication, contracts, invoices, bookings, settings, and administration.
- **Authentication**: Pure JWT-based system with SMS verification (Twilio), email/password login, and phone number verification. No session middleware or cookies used; JWT tokens are stored in Authorization headers. Centralized `authToken.ts` utility for consistent token management. Unified authentication middleware supporting 4 token sources (Bearer header, x-auth-token, query parameter, cookies).
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails. Includes enhanced email parsing for availability and pricing queries, preventing incorrect bookings and ensuring personalized responses.
- **PDF Generation**: Isolated Puppeteer engines for invoices and contracts.
- **AI Integration**: AI for contract parsing, email parsing, price enquiry detection, and message categorization. Enhanced AI for intelligent date logic.
- **System Design Choices**:
    - **User Management**: Simplified two-tier system: Admin Accounts (isAdmin: true) and User Accounts (created via admin panel or subscription payment).
    - **Booking Management**: Unified system with conflict detection, calendar integration (.ics import), status tracking, and manual gig entry. Includes a standalone, token-based booking widget with external R2 hosting. Booking workflow statuses: New, In progress, Client confirms, Confirmed, Completed, Rejected.
    - **Contract Generation**: Dynamic PDF generation, digital signature capabilities, cloud storage, automated reminders, and guided questionnaire-style creation. Enterprise-grade retry logic with exponential backoff and non-critical failure handling.
    - **Invoice Management**: Professional invoice generation, payment tracking, overdue monitoring.
    - **Compliance Tracking**: Document management for insurance, licenses, PAT testing; expiry date monitoring and alerts; automated compliance sharing.
    - **Data Flow**: Streamlined authentication, booking lifecycle management, and AI integration for automated data extraction and processing.
    - **Security**: Robust session validation, comprehensive rate limiting, enhanced database connection pooling, secure password hashing, input validation, input sanitization, and async error handling.
    - **System Health Monitoring**: Real-time dashboard (/system-health) tracking database, authentication, email, storage services with performance metrics and automated health checks.
    - **Deployment**: Node.js server serving built frontend, environment configuration, build process with Vite and esbuild. Production safety guards prevent accidental destructive operations on live data.
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