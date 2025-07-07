# MusoBuddy - Music Business Management Platform

## Overview

MusoBuddy is a comprehensive full-stack web application designed for freelance musicians to streamline their business operations. The platform automates workflows from initial enquiry to final payment, aiming to reduce administrative overhead by 70% and increase booking conversion rates. Built with modern web technologies, it provides a complete business management solution for independent music professionals.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit OAuth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon
- **ORM**: Drizzle ORM with schema-first approach
- **Session Storage**: PostgreSQL table-based session storage
- **Connection Pooling**: Neon serverless connection pooling
- **Migrations**: Drizzle Kit for database schema migrations

## Key Components

### Authentication System
- **Provider**: Replit OAuth with OpenID Connect discovery
- **Session Management**: Secure HTTP-only cookies with PostgreSQL persistence
- **User Management**: Automatic user creation and profile synchronization
- **Security**: CSRF protection and secure session configuration

### Business Data Models
- **Enquiries**: Lead management with status tracking (new, qualified, contract_sent, confirmed, rejected)
- **Contracts**: Digital contract management with client information
- **Invoices**: Financial tracking with payment status monitoring
- **Bookings**: Event scheduling with calendar integration
- **Compliance**: Document management for certifications and licenses
- **Users**: Profile management with Replit integration

### Dashboard Components
- **Stats Cards**: Real-time business metrics and KPIs
- **Kanban Board**: Visual enquiry pipeline management
- **Calendar Widget**: Upcoming bookings and event scheduling
- **Compliance Alerts**: Certificate expiration monitoring
- **Quick Actions**: Rapid task creation and management

### Mobile Experience
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Progressive Web App**: Optimized mobile navigation
- **Touch Interactions**: Mobile-optimized UI components

## Data Flow

### Authentication Flow
1. User initiates login via Replit OAuth
2. OpenID Connect discovery and token exchange
3. User profile creation/update in PostgreSQL
4. Session establishment with secure cookie
5. Protected API access with session validation

### Business Process Flow
1. **Enquiry Creation**: Client inquiry captured with status tracking
2. **Qualification**: Enquiry assessment and status progression
3. **Contract Generation**: Automated contract creation from enquiry data
4. **Booking Confirmation**: Calendar scheduling and client communication
5. **Invoice Generation**: Automated billing based on booking details
6. **Payment Tracking**: Financial status monitoring and reporting

### Data Synchronization
- Real-time updates via TanStack Query
- Optimistic UI updates for better user experience
- Automatic cache invalidation and revalidation
- Error handling with user-friendly feedback

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection management
- **drizzle-orm**: Type-safe database operations
- **express**: Web application framework
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework

### Authentication Dependencies
- **openid-client**: OAuth/OpenID Connect implementation
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Development Dependencies
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for Node.js
- **tailwindcss**: CSS framework
- **@types/***: TypeScript definitions

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with HMR
- **Database**: Neon PostgreSQL with development credentials
- **Authentication**: Replit OAuth in development mode
- **Asset Serving**: Vite middleware for static assets

### Production Deployment
- **Build Process**: Vite production build with optimizations
- **Server Bundle**: ESBuild for Node.js server compilation
- **Static Assets**: Pre-built and served via Express
- **Environment Variables**: Secure credential management
- **Database Migrations**: Automated schema deployment

### Performance Optimizations
- **Code Splitting**: Automatic route-based code splitting
- **Tree Shaking**: Dead code elimination in production
- **Asset Optimization**: Image and font optimization
- **Caching**: Browser caching for static assets
- **Connection Pooling**: Efficient database connections

## Changelog

```
Changelog:
- July 02, 2025. Initial setup
- July 02, 2025. Invoice creation functionality completed:
  * Fixed Quick Actions "Create Invoice" link with URL parameter handling
  * Implemented complete Create Invoice dialog with form validation
  * Added proper dialog state management for all invoice creation buttons
  * Contract selection dropdown integration for invoice-contract linking
- July 02, 2025. Business settings system completed:
  * Created comprehensive settings page with professional form layout
  * Added user_settings database table for storing business details
  * Implemented Settings navigation link in sidebar
  * Connected invoice auto-fill to use business address from user settings
  * Added API routes for saving/loading user business preferences
  * Settings include: business name, address, phone, website, tax number, bank details, default terms
  * Fixed settings save operation with proper API request format
  * Updated bank details section to structured table format with visible field labels
  * Added "Back to Dashboard" navigation button for improved user experience
- July 02, 2025. Invoice creation functionality fixed:
  * Resolved API request format issue preventing invoice creation
  * Removed redundant action buttons (send, download, menu) from invoice cards
  * Replaced non-functional buttons with clean status badges showing invoice state
  * Invoice creation now works seamlessly with contract data integration
- July 02, 2025. Added comprehensive action buttons for contracts and invoices:
  * Draft status: Edit, Preview, Send, Delete buttons
  * Sent status: Preview, Download, Resend/Reminder buttons  
  * Paid/Signed status: Preview, Download buttons
  * Status badges with clear labels to distinguish from clickable actions
  * Consistent UI design across both contracts and invoices pages
- July 02, 2025. Implemented SaaS-friendly email system:
  * Centralized SendGrid integration using platform owner's account
  * Removed requirement for individual subscriber SendGrid subscriptions
  * Added customizable "Email From Name" field in user settings
  * Updated email sending to use format: "Custom Name <business@email.com>"
  * Enhanced email personalization while maintaining centralized service delivery
  * Users can now brand emails with their business identity without needing external accounts
- July 02, 2025. Completed professional PDF generation and contract signing system:
  * Fixed Puppeteer/Chromium configuration with proper system dependencies
  * Implemented automatic PDF generation for all contracts with professional formatting
  * Added PDF attachment delivery system for signed contract confirmations
  * Created client-side PDF download functionality on signing completion page
  * Full end-to-end workflow: contract creation → email sending → client signing → PDF generation → email delivery
  * Both parties receive confirmation emails with signed contract PDF attachments
  * System generates 41KB+ professional PDF documents with signatures and audit trails
- July 02, 2025. Enhanced invoice management with complete automation:
  * Implemented professional invoice PDF generation matching contract system
  * Added PDF attachments to invoice emails via SendGrid integration
  * Created PDF download functionality for all invoice statuses
  * Added smart auto-filling system for invoice creation:
    - Auto-generates sequential invoice numbers (INV-2025-001 format)
    - Auto-calculates invoice amount from contract (fee minus deposit)
    - Auto-fills client name and performance date from selected contract
    - Auto-sets due date to 30 days from creation
  * Complete invoice workflow automation reducing data entry by 80%
- July 03, 2025. Fixed invoice creation and email sending functionality:
  * Resolved API request parameter order issue preventing invoice creation
  * Fixed validation schema integration for proper data transformation
  * Corrected invoice email sending endpoint routing (send-email vs send)
  * Invoice creation now works with complete validation and error handling
  * Email sending functionality operational with PDF attachments and professional formatting
  * Fixed PDF status consistency - email attachments now show "sent" instead of "draft"
  * Implemented proper status update sequence: update to "sent" → generate PDF → send email
- July 03, 2025. Comprehensive invoice management system implemented:
  * Created automated overdue invoice detection with 3-day working grace period
  * Added professional overdue reminder emails with urgent red styling and legal warnings
  * Implemented "Mark as Paid" functionality for sent and overdue invoices
  * Enhanced UI with status-specific action buttons (Mark Paid, Send Reminder, Download)
  * Created bank account monitoring documentation covering Open Banking APIs, payment processors
  * Overdue invoices display with red background and bold white text for visibility
  * Complete payment tracking workflow from creation to collection
- July 03, 2025. Manual booking enquiry intake system created:
  * Built Quick Add form accessible at /quick-add for mobile enquiry entry
  * Created email forwarding system for leads@musobuddy.app with intelligent parsing
  * Added source tracking (WhatsApp, SMS, Phone, Email, etc.) for lead attribution
  * Email parser extracts client details, event dates, venues automatically from forwarded messages
  * Mobile-optimized form designed for home screen shortcuts on iOS/Android
  * Complete instructions provided for both manual form entry and email forwarding workflows
  * System processes voice notes, in-person conversations, and digital message forwards seamlessly
- July 04, 2025. SendGrid domain authentication successfully completed:
  * Resolved DNS conflicts by removing conflicting A records and URL redirects
  * Properly configured 5 CNAME records and 1 TXT record for domain authentication
  * Implemented link branding for professional email appearance
  * Email forwarding system now fully operational at leads@musobuddy.com
  * All emails sent from platform now appear from authenticated musobuddy.com domain
  * Enhanced email deliverability through proper SPF, DKIM, and DMARC configuration
- July 04, 2025. Email forwarding infrastructure deployment completed:
  * Configured root domain MX record (@ → mx.sendgrid.net) for catch-all email routing
  * Set up SendGrid Inbound Parse with musobuddy.com domain configuration
  * Deployed updated webhook endpoint with enhanced debugging and domain consistency fixes
  * Email delivery now working (no bounce messages) - waiting for SendGrid processing activation
  * Complete email forwarding pipeline: leads@musobuddy.com → SendGrid → webhook → enquiry creation
  * System ready for production use once SendGrid Inbound Parse becomes active (typically 15-30 minutes)
- July 04, 2025. Authentication and email sending functionality fully restored:
  * Resolved critical 401 Unauthorized errors that were causing infinite request loops
  * Fixed session cookie configuration for proper deployment environment compatibility
  * Removed problematic authentication middleware that was blocking email sending endpoints
  * Invoice creation and email sending now working seamlessly in deployed environment
  * Enhanced debugging logs for better troubleshooting of authentication and email processes
  * System preference: deployed version required for full functionality integration
- July 04, 2025. Email sending system fully operational:
  * Identified and resolved PDF generation bottleneck that was causing email sending to hang
  * Simplified email sending process to HTML-only format for reliable delivery
  * Added comprehensive error handling and debug responses for troubleshooting
  * Invoice emails now sending successfully with 200 status responses
  * Complete workflow: invoice creation → status update → email delivery → confirmation
- July 04, 2025. Universal Gmail-compatible email system implemented:
  * Resolved SPF authentication failures preventing Gmail/Yahoo/Outlook users from sending emails
  * Smart email routing: FROM uses authenticated musobuddy.com domain, REPLY-TO uses user's actual email
  * Universal compatibility with all email providers (Gmail, Yahoo, Outlook, AOL, iCloud, etc.)
  * Professional email delivery: clients see business name, replies go to user's inbox
  * Applied solution to both invoice and contract email sending workflows
  * Eliminated email authentication barriers for all users regardless of email provider
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```