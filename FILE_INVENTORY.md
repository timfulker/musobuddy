# Complete File Inventory - MusoBuddy Project

## Core Application Structure

### Server-Side Files
```
server/
├── index.ts                     # Main server entry point with webhook handler
├── core/
│   ├── auth.ts                  # Authentication middleware and utilities
│   ├── database.ts              # Database connection and validation
│   ├── routes.ts                # All API routes and endpoints
│   ├── storage.ts               # Database operations and data access layer
│   ├── stripe-service.ts        # Stripe integration and webhook processing
│   ├── services.ts              # Business logic services
│   └── cloud-storage.ts         # Cloudflare R2 integration
└── vite.ts                      # Vite development server integration
```

### Client-Side Files
```
client/
├── index.html                   # Main HTML template
├── src/
│   ├── main.tsx                 # React application entry point
│   ├── App.tsx                  # Main app component with routing
│   ├── components/
│   │   ├── ui/                  # Shadcn UI components
│   │   ├── booking-action-menu.tsx
│   │   ├── conflict-resolution-dialog.tsx
│   │   └── [other components]
│   ├── pages/
│   │   ├── dashboard.tsx        # Main dashboard
│   │   ├── bookings.tsx         # Booking management
│   │   ├── contracts.tsx        # Contract generation
│   │   ├── invoices.tsx         # Invoice management
│   │   ├── compliance.tsx       # Compliance documents
│   │   ├── signup.tsx           # User registration
│   │   ├── landing.tsx          # Landing page
│   │   ├── pricing.tsx          # Subscription pricing
│   │   └── trial-success.tsx    # Post-subscription success
│   ├── lib/
│   │   ├── queryClient.ts       # React Query configuration
│   │   ├── utils.ts             # Utility functions
│   │   └── validations.ts       # Form validation schemas
│   └── hooks/
│       ├── use-auth.ts          # Authentication hook
│       └── use-toast.ts         # Toast notification hook
└── public/                      # Static assets
```

### Shared Schema
```
shared/
└── schema.ts                    # Database schema and types (Drizzle ORM)
```

## Configuration Files

### Build & Development
- **`package.json`** - Dependencies and scripts
- **`vite.config.ts`** - Frontend build configuration
- **`tsconfig.json`** - TypeScript configuration
- **`tailwind.config.ts`** - Tailwind CSS configuration
- **`postcss.config.js`** - PostCSS configuration
- **`components.json`** - Shadcn UI configuration

### Database
- **`drizzle.config.ts`** - Database configuration and migrations
- **`.env`** - Environment variables (not in repo)

## Documentation Files

### Project Documentation
- **`replit.md`** - Main project documentation and changelog
- **`Instructions.md`** - Development instructions
- **`USER_GUIDE.md`** - User manual
- **`BETA_TESTING_GUIDE.md`** - Beta testing instructions

### Technical Documentation
- **`ARCHITECTURE_REBUILD.md`** - Architecture overview
- **`AUTHENTICATION_ISSUE_ANALYSIS.md`** - Auth system analysis
- **`BACKUP_SYSTEMS_PROPOSAL.md`** - Backup strategy
- **`PRODUCTION_WEBHOOK_MIGRATION.md`** - Webhook configuration guide
- **`EXTERNAL_HELP_PACKAGE.md`** - Current issue documentation

## Test & Debug Scripts

### Webhook Testing
- **`debug-webhook-secret.js`** - Tests webhook with proper signatures
- **`test-webhook-endpoint.js`** - Basic webhook testing
- **`trigger-confirmation-emails.js`** - Retrieves Stripe sessions
- **`delete-and-recreate-webhook.js`** - Webhook management

### Database Testing  
- **`test-subscription-flow.js`** - End-to-end subscription testing
- **`fix-webhook-debug.js`** - Manual subscription activation

### Other Testing
- **`test-auth.txt`** - Authentication testing logs
- **`test-stripe-checkout.js`** - Stripe checkout testing
- **`setup-stripe-test-prices.js`** - Test product setup

## Build Output
```
dist/
├── index.js                     # Compiled server bundle
└── public/                      # Built frontend assets
    ├── index.html
    └── assets/
        ├── index-[hash].js      # Frontend JavaScript bundle
        └── index-[hash].css     # Frontend CSS bundle
```

## Key Directories Not Listed
- **`node_modules/`** - Dependencies (standard)
- **`attached_assets/`** - User-uploaded files and debug logs
- Various cookie and session files for testing

## Current Issue Focus

### Primary Files for Webhook Issue
1. **`server/index.ts`** - Webhook handler implementation
2. **`server/core/stripe-service.ts`** - Webhook processing logic
3. **`server/core/storage.ts`** - Database operations
4. **`EXTERNAL_HELP_PACKAGE.md`** - Detailed issue analysis

### Environment Dependencies
- Stripe API keys (test mode)
- Database connection string
- Webhook secret key
- Cloudflare R2 credentials

The webhook system processes requests correctly but logs are not visible in the published version, making verification difficult.