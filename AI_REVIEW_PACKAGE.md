# MusoBuddy AI Review Package

## Project Overview
Complete music business management platform with React/Node.js stack.

## Key Features
- Contract signing with e-signatures and PDF generation
- Email automation via SendGrid
- Invoice management with payment tracking
- Enquiry pipeline with Kanban board
- Mobile-responsive design

## Architecture
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript  
- **Database**: PostgreSQL + Drizzle ORM
- **Email**: SendGrid integration
- **PDF**: Puppeteer generation
- **Auth**: Replit OAuth

## Critical Files for Review
1. `server/routes.ts` - Main API endpoints
2. `server/pdf-generator.ts` - PDF creation system
3. `server/sendgrid.ts` - Email automation
4. `client/src/pages/sign-contract.tsx` - Contract signing
5. `shared/schema.ts` - Database models
6. `package.json` - Dependencies

## Performance Metrics
- Contract signing: <200ms response time
- PDF generation: 41KB professional documents
- Email delivery: Background processing with 202 status
- Cross-browser compatibility: iOS/macOS tested

## Deployment
- Replit hosting with Vite development setup
- Production build bypasses complexity using tsx runtime
- Environment variables for secure API key management

Share this overview with AI assistants along with specific files for targeted feedback.