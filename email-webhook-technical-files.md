# Email Webhook Technical Files - Complete List

## Core Issue
Webhook throwing "value.toISOString is not a function" error when processing incoming emails from Mailgun.

## Primary Files

### 1. server/mailgun-webhook.ts
- Main webhook handler function
- Email parsing and enquiry creation logic
- Where the timestamp error is occurring

### 2. server/index.ts
- Route registration for webhook endpoint
- Express middleware configuration
- Priority route handling

### 3. server/storage.ts
- Database operations interface
- createEnquiry method implementation
- Where database insertion happens

### 4. shared/schema.ts
- Database schema definitions
- Enquiry table structure with timestamp fields
- Zod validation schemas

### 5. server/db.ts
- Database connection setup
- Drizzle ORM configuration
- Neon PostgreSQL connection

## Configuration Files

### 6. drizzle.config.ts
- Database configuration
- Schema file references

### 7. package.json
- Dependencies including Drizzle ORM
- Mailgun SDK configuration

## Test Files

### 8. test-mailgun-route-direct.js
- Direct webhook testing script
- Shows exact error reproduction

### 9. debug-actual-mailgun.js
- Alternative test script
- Mailgun format simulation

## DNS/Email Configuration

### 10. dmarc-setup-instructions.md
- DMARC configuration details
- DNS record requirements

### 11. mailgun-system-operational.md
- Mailgun setup documentation
- Route configuration details

## Error Trace
The error occurs in this flow:
1. Webhook receives POST request
2. parseEmailForEnquiry extracts data
3. storage.createEnquiry called with data
4. Database tries to insert with timestamp field
5. Error: "value.toISOString is not a function"

## Key Technical Details
- Using Drizzle ORM with PostgreSQL
- Timestamp fields defined as `timestamp("field_name")` in schema
- Database expects Date objects, not strings
- Error happening during database insertion, not in webhook parsing

## Environment
- Node.js/Express server
- PostgreSQL database via Neon
- Mailgun webhook integration
- TypeScript throughout