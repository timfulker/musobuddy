# Replit.md - MusoBuddy: AI-Powered Musician Admin Platform

## Overview

MusoBuddy is a comprehensive SaaS platform designed to help freelance musicians streamline repetitive admin tasks. The platform centralizes gig workflows from enquiry to payment, featuring lead tracking, contract generation, invoice management, and compliance tracking. Built to reduce musician admin time by 70% while increasing booking conversion rates through professional, automated workflows.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **State Management**: TanStack Query for server state
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with class-variance-authority for component variants

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit OAuth integration
- **Email Service**: SendGrid for contract notifications
- **Session Management**: PostgreSQL-backed sessions

## Key Components

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Located in `./migrations` directory
- **Schema**: Centralized in `./shared/schema.ts`
- **Connection**: Neon serverless PostgreSQL via `@neondatabase/serverless`

### Authentication System
- **Provider**: Replit OAuth
- **Session Storage**: PostgreSQL with `connect-pg-simple`
- **Middleware**: Custom authentication middleware for protected routes

### Email Integration
- **Service**: SendGrid (`@sendgrid/mail`)
- **Use Case**: Contract signing notifications
- **Implementation**: Asynchronous email sending with timeout-based execution

### API Structure
- **Pattern**: RESTful API with Express routes
- **Endpoints**: Contract management (`/api/contracts/*`)
- **Middleware**: Authentication, CORS, and session handling

## Data Flow

1. **User Authentication**: Users authenticate via Replit OAuth
2. **Contract Creation**: Authenticated users create contracts
3. **Contract Signing**: Public contract signing via unique URLs
4. **Email Notifications**: SendGrid sends notifications after contract signing
5. **Database Updates**: All contract state changes persisted to PostgreSQL

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless
- **Email**: SendGrid API
- **Authentication**: Replit OAuth service
- **UI**: Radix UI component library

### Development Tools
- **Build**: Vite (frontend), ESBuild (backend)
- **Type Checking**: TypeScript
- **Database Tools**: Drizzle Kit for migrations

## Deployment Strategy

### Build Process
1. Frontend builds to `dist/client` via Vite
2. Backend bundles to `dist/index.js` via ESBuild
3. Production starts with `node dist/index.js`

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SENDGRID_API_KEY`: Email service authentication
- `NODE_ENV`: Environment designation

### Known Issues
- **Email Timing**: Deployment environment requires `setTimeout` instead of `res.on('finish')` for background tasks
- **Authentication**: Contract signing routes may need to be public rather than authenticated for proper deployment function

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

### July 07, 2025

**MusoBuddy MVP Platform Complete**
- Built comprehensive musician business management platform according to PRD specifications
- Full-stack TypeScript architecture with Express backend and React frontend
- Complete CRUD API for all core entities: enquiries, contracts, invoices, bookings, compliance
- Modern React frontend with TanStack Query, Wouter routing, and Tailwind CSS
- All five main pages implemented: Dashboard, Enquiries, Contracts, Invoices, Bookings, Compliance
- Professional UI with status tracking, search/filtering, and responsive design
- Mock data storage system ready for database integration

**Core Features Implemented:**
- Enquiry management with lead tracking and status pipeline
- Contract generation and management with e-signature workflows
- Invoice creation with payment tracking and VAT calculations
- Booking calendar with gig management and revenue tracking
- Compliance tracking for insurance, certifications, and legal requirements
- Dashboard with analytics and quick access to recent items

**Technical Architecture:**
- Backend: Express.js with ES modules, RESTful API design
- Frontend: React 19, TypeScript, Tailwind CSS, TanStack Query
- Database Schema: PostgreSQL-ready with Drizzle ORM types
- Storage: Mock storage with full CRUD operations (ready for DB migration)
- Deployment Ready: Proper port binding and production configurations