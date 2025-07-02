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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```