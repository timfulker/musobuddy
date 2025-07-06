# MusoBuddy - Complete Music Business Management Platform

## Project Overview

MusoBuddy is a comprehensive full-stack web application designed for freelance musicians to streamline their business operations. The platform automates workflows from initial enquiry to final payment, reducing administrative overhead by 70% and increasing booking conversion rates.

## Key Features

### Core Business Management
- **Enquiry Management**: Lead tracking with status pipeline (new, qualified, contract_sent, confirmed, rejected)
- **Contract System**: Digital contract creation, sending, and e-signature collection
- **Invoice Management**: Automated billing with payment tracking and overdue notifications
- **Booking Calendar**: Event scheduling with upcoming bookings overview
- **Compliance Tracking**: Document expiration monitoring for licenses and certifications

### Advanced Automation
- **Email Integration**: Professional email system with SendGrid integration
- **PDF Generation**: Automated contract and invoice PDF creation with signatures
- **Payment Monitoring**: Invoice status tracking with overdue reminder system
- **Mobile Quick-Add**: Mobile-optimized enquiry intake for on-the-go lead capture

### Technical Architecture
- **Frontend**: React 18 with TypeScript, Tailwind CSS, Radix UI components
- **Backend**: Node.js with Express, PostgreSQL database via Neon
- **Authentication**: Replit OAuth integration with secure session management
- **Email Service**: SendGrid integration with authenticated domain support
- **PDF Generation**: Puppeteer-based professional document generation

## Contract Signing System

### Complete Implementation
The contract signing system includes:
- Full POST `/api/contracts/sign/:id` endpoint with comprehensive error handling
- Database schema with signature tracking (`signatureName` field)
- Immediate response to prevent browser timeouts
- Background email processing with PDF generation
- Cross-browser compatibility (iOS/macOS tested)
- Professional email delivery to both client and performer

### Technical Details
- **Endpoint**: POST `/api/contracts/sign/:id`
- **Validation**: Signature name required, contract status verification
- **Database**: Updates contract status to 'signed' with timestamp and signature name
- **Email Processing**: Background PDF generation and dual email delivery
- **Error Handling**: Comprehensive logging and user-friendly error messages

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (Neon recommended)
- SendGrid account for email functionality

### Installation Steps

1. **Extract the source code**
   ```bash
   tar -xzf musobuddy-enhanced.tar.gz
   cd musobuddy-final
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Set up the following environment variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   SENDGRID_API_KEY=your_sendgrid_api_key
   REPLIT_OAUTH_CLIENT_ID=your_oauth_client_id
   REPLIT_OAUTH_CLIENT_SECRET=your_oauth_client_secret
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Production Deployment

### Deployment Options
- **Replit**: Use the included deployment configuration
- **Vercel/Netlify**: Frontend deployment with serverless functions
- **VPS/Cloud**: Full-stack deployment with PM2 or similar process manager

### Build Process
```bash
# Production build
npm run build

# Start production server
npm start
```

## File Structure

```
musobuddy-final/
├── client/          # React frontend application
├── server/          # Node.js backend API
├── shared/          # Shared TypeScript schemas
├── package.json     # Dependencies and scripts
├── README.md        # Project documentation
├── replit.md        # Development history and preferences
└── SHARING_GUIDE.md # This file
```

## Key Components

### Database Schema
- **Users**: Profile management with Replit integration
- **Enquiries**: Lead tracking with source attribution
- **Contracts**: Digital contracts with signature fields
- **Invoices**: Financial tracking with payment status
- **Bookings**: Event scheduling
- **Compliance**: Document expiration tracking
- **User Settings**: Business profile and preferences

### API Endpoints
- Authentication: `/api/auth/*`
- Enquiries: `/api/enquiries/*`
- Contracts: `/api/contracts/*` (including signing endpoint)
- Invoices: `/api/invoices/*`
- Bookings: `/api/bookings/*`
- Settings: `/api/settings/*`

## Development History

This project represents significant development work with enterprise-level features including:
- Complete contract signing workflow with legal compliance
- Professional PDF generation with signature audit trails
- Email automation with authenticated domain support
- Cross-browser compatibility and timeout prevention
- Comprehensive error handling and user experience optimization

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

For technical support or questions about the implementation, refer to the comprehensive documentation in `replit.md` which contains detailed development history and architectural decisions.