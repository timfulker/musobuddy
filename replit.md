# MusoBuddy - Music Business Management Platform

## Overview
MusoBuddy is a comprehensive music business management platform designed to help musicians manage their bookings, contracts, invoices, and compliance requirements. It aims to be a user-friendly, reliable, and scalable full-stack web application. The platform's vision is to streamline administrative tasks for musicians, allowing them more time for their craft, and has significant market potential by offering a centralized solution for common music business challenges.

## User Preferences
Preferred communication style: Simple, everyday language.
Response priority: Immediate responsiveness - user must be able to interrupt at any moment without queue delays.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI primitives
- **State Management**: React Query
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **UI/UX Decisions**: Clean white cards with left border status indicators, gradient-styled forms, professional action buttons, responsive layouts for all screen sizes (mobile-optimized), consistent sidebar navigation, and clear visual cues for user interactions.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Core Structure**: Consolidated into `index.ts`, `auth.ts`, `storage.ts`, `services.ts`, `routes.ts`, `database.ts`
- **Authentication**: Branded email/password authentication with PostgreSQL sessions, robust session management, and admin bypass for development.
- **File Storage**: Cloudflare R2 for PDF storage.
- **Email Service**: Mailgun for transactional emails and webhook processing.
- **PDF Generation**: Puppeteer for contract and invoice PDFs.
- **AI Integration**: Anthropic Claude Haiku for contract parsing, OpenAI for email parsing and AI response generation.
- **System Design Choices**:
    - **User Management**: Replit Auth integration, session-based authentication, user tiers (free, premium, enterprise), admin dashboard.
    - **Booking Management**: Unified system, conflict detection (hard/soft conflicts with visual indicators), calendar integration (.ics import), status tracking, and manual gig entry.
    - **Contract Generation**: Dynamic PDF generation, digital signature capabilities, cloud storage, and automated reminders (Phase 2).
    - **Invoice Management**: Professional invoice generation, payment tracking, overdue monitoring, and integration with banking APIs (planned).
    - **Compliance Tracking**: Document management for insurance, licenses, PAT testing; expiry date monitoring and alerts; automated compliance sharing.
    - **Data Flow**: Streamlined authentication, booking lifecycle management, and AI integration for automated data extraction and processing.
    - **Security**: Robust session validation, comprehensive rate limiting (login, SMS, signup, API), enhanced database connection pooling, and secure password hashing.
    - **Deployment**: Node.js server serving built frontend, environment configuration for development and production, build process with Vite and esbuild, monitoring and maintenance services.
    - **API Design**: RESTful API endpoints for all core functionalities, consistent JSON responses, and comprehensive error handling.

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
- **Development Tools**:
    - Multer: File upload handling.
    - Express Session: Session management.
    - CORS: Cross-origin resource sharing.
    - Drizzle ORM: Type-safe database queries.