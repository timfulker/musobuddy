# Replit.md - Contract Signing Application

## Overview

This is a full-stack contract signing application built with React frontend and Express backend. The application allows users to create, manage, and sign contracts with email notifications and authentication through Replit OAuth.

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

**Initial Express Server Setup (Stable Foundation)**
- Resolved critical npm installation blocking issue (`string-width-cjs` package conflict)
- Successfully established minimal Express.js server with ES modules
- Core server running on port 5000 with health checks
- Fixed workflow dev command to use Node.js instead of tsx (which was missing)
- Active endpoints: `/` (welcome), `/api/health` (status check)
- Ready for MusoBuddy business management features

**Technical Foundation:**
- Express.js v4.21.2 with ES module syntax (`import`/`export`)
- Simplified package.json focusing on essential dependencies
- Working workflow: `npm run dev` successfully starts server
- Proper port binding (`0.0.0.0`) for Replit deployment readiness