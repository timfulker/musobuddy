# MusoBuddy - Music Business Management Platform

## Overview

MusoBuddy is a comprehensive music business management platform designed to help musicians manage their bookings, contracts, invoices, and compliance requirements. The application is built as a full-stack web application with a modern tech stack focused on simplicity, reliability, and user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **UI Components**: Radix UI primitives with custom styling
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with session management
- **File Storage**: Cloudflare R2 (S3-compatible) for PDF storage
- **Email Service**: Mailgun for transactional emails
- **PDF Generation**: Puppeteer for contract and invoice PDFs

### Database Design
- **ORM**: Drizzle ORM with type-safe queries
- **Schema**: Located in `shared/schema.ts` for type sharing
- **Tables**: Users, bookings, contracts, invoices, compliance documents, user settings
- **Migrations**: Managed through Drizzle Kit

## Key Components

### User Management
- Replit Auth integration for authentication
- Session-based authentication with PostgreSQL session store
- User tiers (free, premium, enterprise) with role-based access
- Admin dashboard for user management

### Booking Management
- Unified booking system (previously separate enquiries)
- Conflict detection and resolution
- Calendar integration and import (.ics files)
- Status tracking throughout booking lifecycle

### Contract Generation
- Dynamic PDF generation using Puppeteer
- Digital signature capabilities
- Cloud storage integration
- Automated reminder system

### Invoice Management
- Professional invoice generation
- Payment tracking and status updates
- Overdue invoice monitoring
- Integration with banking APIs (planned)

### Compliance Tracking
- Document management for insurance, licenses, PAT testing
- Expiry date monitoring and alerts
- Automated compliance sharing with clients

## Data Flow

### Authentication Flow
1. User authenticates through Replit Auth
2. Session stored in PostgreSQL sessions table
3. User data synchronized with local users table
4. Frontend receives user object through /api/auth/user endpoint

### Booking Lifecycle
1. New enquiry created (email webhook or manual entry)
2. Conflict detection runs automatically
3. User converts enquiry to booking
4. Contract generated and sent for signature
5. Invoice created upon contract completion
6. Payment tracking and follow-up

### AI Integration
- Email parsing for automatic enquiry extraction
- Conflict resolution suggestions
- Instrument mapping for gig categorization
- Support chat assistance

## External Dependencies

### Cloud Services
- **Cloudflare R2**: PDF storage and delivery
- **Mailgun**: Email delivery service
- **Neon Database**: PostgreSQL hosting
- **Replit**: Authentication and hosting

### APIs and Services
- **OpenAI**: Multiple instances for different AI features
- **SendGrid**: Backup email service
- **AWS SDK**: S3-compatible operations for R2

### Development Tools
- **Puppeteer**: PDF generation with Chromium
- **Multer**: File upload handling
- **Express Session**: Session management
- **CORS**: Cross-origin resource sharing

## Deployment Strategy

### Environment Configuration
- Development: Local development with Vite dev server
- Production: Node.js server serving built frontend
- Database: Neon PostgreSQL with connection pooling
- File Storage: Cloudflare R2 with CDN delivery

### Build Process
1. Frontend built with Vite to `dist/public`
2. Backend compiled with esbuild to `dist/index.js`
3. Static assets served from Express server
4. Environment variables for API keys and database connection

### Monitoring and Maintenance
- Data cleanup service for old records
- URL maintenance for contract signing links
- Automated reminder system for contracts and invoices
- Conflict resolution system for booking overlaps

The application is designed to be user-friendly while maintaining professional-grade features required for music business management. The architecture supports scalability and maintainability with clear separation of concerns between frontend, backend, and data layers.

## Recent Changes: Latest modifications with dates

### 2025-07-17 - Stable Branded Authentication System
- **Authentication Enhancement**: Implemented stable email/password authentication with branded MusoBuddy login
- **Session Management**: PostgreSQL-based session storage with 7-day persistence for reliable login state
- **User Experience**: Professional branded login page with "Login to MusoBuddy" instead of external redirects
- **Security**: Secure password hashing with scrypt and proper session management
- **Database Integration**: User management with email-based authentication and admin role support
- **Professional Branding**: Users log directly into MusoBuddy without external service dependencies
- **Admin Access**: Admin login available for timfulker@gmail.com with temppass123 for development
- **Production Ready**: Eliminated authentication instability with persistent PostgreSQL sessions
- **Status**: Fully operational branded authentication system with stable session management

### 2025-07-17 - Enhanced Admin Panel with Advanced Analytics
- **Authentication Fix**: Resolved all admin API endpoint authentication issues by adding proper credentials to fetch requests
- **Business Intelligence**: Added comprehensive analytics dashboard with revenue trends, booking patterns, and conversion metrics
- **System Monitoring**: Implemented real-time system health monitoring with performance metrics and status indicators
- **Geographic Analytics**: Created geographic distribution tracking for user and booking data
- **Top Performers**: Added analytics for identifying highest-performing users and booking patterns
- **Tabbed Interface**: Organized admin features into clean tabs (Analytics, Users, System, Support) for better navigation
- **Platform Metrics**: Added growth metrics, user engagement tracking, and platform health indicators
- **Technical Enhancement**: All admin queries now properly include authentication headers for secure data access
- **CC Email Functionality**: Implemented CC email support for invoices including form fields, database schema, and email sending
- **Invoice Pre-filling**: Added "Create Invoice" button to booking respond dialogs with automatic form pre-filling
- **Database Constraint Fix**: Fixed globalGigTypes table constraint error by replacing onConflictDoUpdate with proper upsert logic
- **Settings Page Fixes**: Resolved JavaScript reference errors, array validation issues, and form saving problems
- **Authentication System Repair**: Fixed critical session persistence issues after admin panel implementation
- **Session Management**: Implemented proper memory-based session store with rolling expiration
- **Form Submission Fix**: Added credentials: 'include' to all API requests for proper session handling
- **Data Integrity**: Verified real user data is properly loaded and saved in settings form
- **Status**: Complete admin panel with deep business insights, working CC email functionality, fully functional settings page with real data persistence, and resolved all authentication/session issues

### 2025-07-18 - Application Stability and Comprehensive User Documentation
- **Database Connection Fix**: Resolved WebSocket connection issues with Neon database causing startup failures
- **Error Handling Enhancement**: Added comprehensive error handling throughout server startup process
- **Connection Management**: Implemented proper database connection pooling with timeout and retry logic
- **Graceful Shutdown**: Added proper process handling for SIGINT/SIGTERM with graceful server shutdown
- **Startup Resilience**: Enhanced startup process to continue even with partial service failures
- **Authentication Stability**: Improved auth setup with proper error handling and recovery mechanisms
- **Comprehensive User Guide**: Created detailed USER_GUIDE.md with complete functionality documentation
- **Interactive Guide Enhancement**: Updated in-app user guide with 12 detailed sections covering all features
- **Workflow Documentation**: Detailed explanations of booking lifecycle, contract signing, and invoice management
- **Feature Coverage**: Complete documentation of email forwarding, calendar integration, and compliance management
- **User Experience**: Enhanced user guide with practical tips, troubleshooting, and best practices
- **Theme Customization System**: Implemented comprehensive invoice/contract theming with 6 template categories
- **Theme Preview Functionality**: Added HTML-based theme preview system with fallback for system constraints
- **Customization Options**: Font selection, color picker, template styles, tone options, and feature toggles
- **Real-time Preview**: Working theme preview generation with proper authentication and error handling
- **Booking Lifecycle Restructure**: Initiated migration from complex 6-status system to simplified 5-status system with progress tags
- **Status Mapping System**: Created backward-compatible status mapping utility to preserve existing functionality
- **Progress Tags**: Added optional visual tags (Contract Sent, Contract Signed, Invoice Sent, Paid in Full) for better tracking
- **Database Schema Enhancement**: Added new boolean fields for progress tracking while maintaining existing status system
- **CTA Buttons**: Enhanced dashboard call-to-action buttons with improved filtering logic using new status mapping
- **Manual Payment Tracking**: Added manual payment tracking controls with "Mark Deposit Paid" and "Mark Paid in Full" buttons
- **Manual Contract Tracking**: Added contract tracking controls with "Mark Contract Sent" and "Mark Contract Signed" buttons
- **Simplified Status Buttons**: Reduced status buttons to 4-stage workflow (Enquiry→Negotiation→Completed→Cancelled)
- **Real Workflow Implementation**: Aligned system with actual booking workflow where contract signing IS the confirmation
- **Smart Filtering System**: Implemented comprehensive filtering system optimized for 1000+ bookings performance
- **Primary Status Filters**: Interactive workflow stage buttons with counts and icons (New Enquiry, Awaiting Response, Client Confirms, Contract Sent, Confirmed, Cancelled, Completed)
- **Secondary Filters**: Payment status (All/Paid/Unpaid), event date (All/Upcoming/Past), and enhanced search by client name/email
- **Performance Optimization**: Multi-criteria filtering with proper status mapping and efficient query handling
- **User Experience**: Clean filter interface with clear all functionality and responsive design for mobile users
- **Button Alignment Enhancement**: Improved booking card button layout with consistent sizing, proper grid alignment, and structured action rows
- **Professional Layout**: Standardized button widths (120px minimum for primary actions), better spacing, and organized action hierarchy
- **Contextual Action Button Fix**: Fixed critical issue where call-to-action buttons were appearing on all booking cards regardless of context
- **Smart Button Logic**: Implemented proper contextual filtering so buttons only appear when relevant (e.g., Create Invoice only for confirmed bookings)
- **Status-Based Actions**: Refined action availability based on booking status workflow (new/awaiting_response/client_confirms/contract_sent/confirmed/completed)
- **Data Structure Enhancement**: Added proper null checking for contracts and invoices arrays to prevent undefined access errors
- **New Date Filters**: Added "Next 7 Days", "Next 30 Days", and "Next 90 Days" filter options to event date dropdown for better booking management
- **Filter Logic Implementation**: Proper date range filtering with end-of-day time handling for accurate results
- **Status**: Fully stable application with comprehensive user documentation, complete theme customization system, improved booking lifecycle management, complete manual tracking capabilities, optimized smart filtering for large datasets, enhanced button alignment for professional appearance, contextual action buttons working properly, and new date filtering options for better booking management