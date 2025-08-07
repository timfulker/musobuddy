# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform designed to streamline administrative tasks for musicians, allowing them more time for their craft. It provides tools for managing bookings, contracts, invoices, and compliance requirements. The platform aims to be user-friendly, reliable, and scalable, offering a centralized solution for common music business challenges with significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.
Response priority: Immediate responsiveness - user must be able to interrupt at any moment without queue delays.
Contract signing: User wants only ONE simple sign contract button, no redundant "click to sign box" above it - simplified single-stage signing process.
Email notifications: Both client AND performer receive confirmation emails when contracts are signed (fixed 07/08/2025).
Problem-solving approach: When user reports "X was working last week but now it's broken" - FIND and RESTORE the original working system rather than rebuilding from scratch. This avoids creating conflicting duplicate systems.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, Vite as build tool.
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI primitives.
- **State Management**: React Query.
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.
- **UI/UX Decisions**: Clean white cards with left border status indicators, gradient-styled forms, professional action buttons, responsive layouts (mobile-optimized), consistent sidebar navigation, clear visual cues. Multiple theme options (Purple, Ocean Blue, Forest Green, Clean Pro Audio, Midnight Blue) with theme-aware components and an animated metronome logo.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Core Structure**: Modular route architecture for authentication, contracts, invoices, bookings, settings, and administration.
- **Authentication**: Pure JWT-based system with SMS verification (Twilio), email/password login, and phone number verification. No session middleware or cookies used; JWT tokens are stored in Authorization headers.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails.
- **PDF Generation**: Isolated Puppeteer engines for invoices and contracts.
- **AI Integration**: AI for contract parsing, email parsing, price enquiry detection, and message categorization.
- **System Design Choices**:
    - **User Management**: Simplified two-tier system:
        1. **Admin Accounts**: Full administrative privileges (isAdmin: true)
        2. **User Accounts**: All authenticated users have full access to features (created via admin panel or subscription payment)
    - **Booking Management**: Unified system with conflict detection, calendar integration (.ics import), status tracking, and manual gig entry. Includes a standalone, token-based booking widget. Booking workflow statuses: New, In progress, Client confirms, Confirmed, Completed, Rejected.
    - **Contract Generation**: Dynamic PDF generation, digital signature capabilities, cloud storage, automated reminders, and guided questionnaire-style creation.
    - **Invoice Management**: Professional invoice generation, payment tracking, overdue monitoring.
    - **Compliance Tracking**: Document management for insurance, licenses, PAT testing; expiry date monitoring and alerts; automated compliance sharing.
    - **Data Flow**: Streamlined authentication, booking lifecycle management, and AI integration for automated data extraction and processing.
    - **Security**: Robust session validation, comprehensive rate limiting, enhanced database connection pooling, secure password hashing, input validation, input sanitization, and async error handling.
    - **Deployment**: Node.js server serving built frontend, environment configuration, build process with Vite and esbuild.
    - **API Design**: RESTful API endpoints, consistent JSON responses, and comprehensive error handling.
    - **System Isolation**: Critical components like invoice and contract generation are designed as entirely separate, isolated systems.

## External Dependencies

- **Cloud Services**:
    - Cloudflare R2: PDF storage and delivery.
    - Mailgun: Email delivery service.
    - Neon Database: PostgreSQL hosting.
    - Replit: Authentication and hosting.
- **APIs and Services**:
    - Anthropic Claude Haiku: AI for contract parsing.
    - OpenAI: AI for email parsing and intelligent template generation.
    - Puppeteer: PDF generation.
    - Stripe: Subscription management and payment processing.
    - Twilio: SMS verification.