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
1. **Professional Contract Generation** - Automated PDF contracts with digital signature capabilities hosted on cloud storage
2. **Intelligent Booking Management** - Calendar system with conflict detection, status tracking, and email automation
3. **Professional Invoice System** - PDF invoice generation with payment tracking and automated reminders
4. **Email Automation** - Custom email templates, automated client communication, and webhook-based enquiry processing
5. **Compliance Document Management** - Insurance, PAT testing, license tracking with expiry alerts
6. **Cloud Document Storage** - 24/7 accessible contracts and invoices via Cloudflare R2 storage
7. **Client Address Book** - Centralized client management with booking history and preferences

## UNIQUE DIFFERENTIATOR: 
- **Music Industry Specialization**: Built specifically for musicians with UK compliance requirements, music-specific terminology, and gig-focused workflows
- **Cloud-First Architecture**: Documents accessible 24/7 even when app server offline, ensuring clients can always access contracts
- **Email-to-Booking Automation**: Unique webhook system that converts client emails directly into bookings using AI parsing

- **Professional PDF Generation**: Beautiful, branded contracts and invoices with automatic cloud hosting and digital signatures

## PRICING MODEL: 
- **Core Tier**: £9.99/month - Unlimited bookings, contracts, invoices, professional email sending, cloud storage, compliance tracking
- **Premium Tier**: Coming Soon - Advanced analytics, calendar integrations, client portal, enhanced AI features
- **Trial Period**: 14-day free trial with credit card required for Core tier
- **Payment Processing**: Stripe integration with test mode for safe beta testing
- **Target Market**: UK musicians (pricing in GBP, phone verification via Twilio)

## TECHNICAL DIFFERENTIATORS:
- **Modern Tech Stack**: React 18 + TypeScript frontend, Node.js/Express backend, PostgreSQL database
- **AI Integration**: OpenAI for email parsing, Anthropic Claude for contract analysis
- **Professional PDF Generation**: Puppeteer-based system creating publication-quality documents
- **Session-Based Authentication**: Secure PostgreSQL session management with phone verification
- **Production-Ready**: Comprehensive error handling, rate limiting, CORS configuration, environment detection

## BUSINESS MODEL INSIGHTS:
- **SaaS Subscription**: Monthly recurring revenue model targeting UK freelance music market

- **Vertical Focus**: Deep specialization in music industry rather than generic business management
- **Cloud Independence**: Documents remain accessible even during app maintenance, ensuring client satisfaction
- **Compliance Focus**: UK-specific requirements (insurance, PAT testing) create switching barriers for competitors