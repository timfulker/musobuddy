# MUSOBUDDY CONTEXT VARIABLES SETUP

Before using any section prompts, fill in these variables about your SaaS:

## SOFTWARE NAME: 
MusoBuddy

## CORE FUNCTION: 
MusoBuddy is a comprehensive music business management platform that helps freelance musicians and music professionals manage their bookings, contracts, invoices, and compliance documents through automated workflows and professional PDF generation.

## TARGET AUDIENCE: 
- **Primary**: Freelance musicians (solo artists, DJs, bands, session musicians)
- **Secondary**: Music teachers offering private lessons
- **Tertiary**: Small music agencies managing multiple performers
- **Geographic**: UK-focused (phone verification, compliance docs, pricing in GBP)
- **Business size**: Individual freelancers to small music businesses (1-10 performers)

## MAIN PAIN POINT: 
- **Primary**: Musicians spend hours on administrative tasks (contracts, invoices, booking management) instead of focusing on their music and performances
- **Secondary**: Unprofessional communication with clients due to lack of proper business tools
- **Tertiary**: Lost revenue from missed follow-ups, forgotten invoices, and poor contract management
- **Operational**: Manual processes leading to booking conflicts, compliance lapses, and client dissatisfaction

## KEY FEATURES: 
1. **Professional Contract Generation** - Automated PDF contracts with digital signature capabilities hosted on Cloudflare R2 cloud storage
2. **Booking Management System** - Calendar view, conflict detection, status tracking, static gig type selection from 30 common types
3. **Professional Invoice System** - PDF invoice generation with cloud storage and public viewing links
4. **Email Templates** - Custom email templates with variable replacement for client communication
5. **Cloud Document Storage** - 24/7 accessible contracts and invoices via Cloudflare R2 with permanent URLs
6. **Client Address Book** - Client management with contact details and booking history

## UNIQUE DIFFERENTIATOR: 
- **Music Industry Specialization**: Built specifically for musicians with UK compliance requirements, music-specific terminology, and gig-focused workflows
- **Cloud-First Architecture**: Documents accessible 24/7 even when app server offline, ensuring clients can always access contracts
- **Professional PDF Generation**: Beautiful, branded contracts and invoices with automatic cloud hosting and digital signatures
- **Static Gig Type System**: Reliable dropdown selection from 30 predefined gig types (Wedding Ceremony, Corporate Event, Private Party, etc.)

## PRICING MODEL: 
- **Core Tier**: £9.99/month - Unlimited bookings, contracts, invoices, email templates, cloud storage, client management
- **Trial Period**: 14-day free trial with credit card required for Core tier
- **Payment Processing**: Stripe integration with test mode for beta testing
- **Target Market**: UK musicians (pricing in GBP, phone verification via SMS)

## TECHNICAL DIFFERENTIATORS:
- **Modern Tech Stack**: React 18 + TypeScript frontend, Node.js/Express backend, PostgreSQL database
- **Professional PDF Generation**: Puppeteer-based system creating publication-quality documents
- **Session-Based Authentication**: Secure PostgreSQL session management with SMS phone verification
- **Production-Ready**: Comprehensive error handling, rate limiting, CORS configuration, environment detection

## BUSINESS MODEL INSIGHTS:
- **SaaS Subscription**: Monthly recurring revenue model targeting UK freelance music market

- **Vertical Focus**: Deep specialization in music industry rather than generic business management
- **Cloud Independence**: Documents remain accessible even during app maintenance, ensuring client satisfaction
- **Compliance Focus**: UK-specific requirements (insurance, PAT testing) create switching barriers for competitors