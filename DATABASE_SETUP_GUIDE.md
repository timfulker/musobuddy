# Database Setup Guide

This guide will help you create two new Neon databases (development and production) with identical schemas.

## Prerequisites
- Neon account (https://neon.tech)
- psql command-line tool (or use Neon's SQL editor)

## Step 1: Create New Databases on Neon

### Option A: Using Neon Dashboard
1. Log in to your Neon account at https://console.neon.tech
2. Create **Development Database**:
   - Click "Create Database"
   - Name: `musobuddy-dev` (or your preferred name)
   - Region: Choose closest to you (e.g., US East 2)
   - Copy the connection string when created

3. Create **Production Database**:
   - Click "Create Database"
   - Name: `musobuddy-prod` (or your preferred name)
   - Region: Same as development
   - Copy the connection string when created

### Option B: Using Neon CLI
```bash
# Install Neon CLI if not already installed
npm install -g @neondatabase/cli

# Authenticate
neonctl auth

# Create development database
neonctl projects create --name musobuddy-dev --region-id aws-us-east-2

# Create production database
neonctl projects create --name musobuddy-prod --region-id aws-us-east-2

# Get connection strings
neonctl connection-string musobuddy-dev
neonctl connection-string musobuddy-prod
```

## Step 2: Import Schema to New Databases

### For Development Database (with existing data):
```bash
# Using the full backup (includes schema + data)
psql "YOUR_NEW_DEV_CONNECTION_STRING" < database_backup_20250912_210143.sql
```

### For Production Database (schema only, no data):
```bash
# Using schema-only file
psql "YOUR_NEW_PROD_CONNECTION_STRING" < schema_only.sql
```

## Step 3: Update Environment Variables

Update your `.env` file with the new connection strings:

```env
# Development database (with test data)
DATABASE_URL_DEV=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Production database (clean, no test data)
DATABASE_URL_PROD=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Default environment
NODE_ENV=development
```

## Step 4: Update Server Configuration

The server needs to be updated to use the correct database based on NODE_ENV:

1. Create a new file `server/config/database.ts`:
```typescript
export function getDatabaseUrl(): string {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    if (!process.env.DATABASE_URL_PROD) {
      throw new Error('DATABASE_URL_PROD is not set for production environment');
    }
    console.log('📊 Using PRODUCTION database');
    return process.env.DATABASE_URL_PROD;
  } else {
    if (!process.env.DATABASE_URL_DEV) {
      throw new Error('DATABASE_URL_DEV is not set for development environment');
    }
    console.log('📊 Using DEVELOPMENT database');
    return process.env.DATABASE_URL_DEV;
  }
}
```

2. Update `server/db.ts` to use the configuration:
```typescript
import { getDatabaseUrl } from './config/database';

// ... existing imports ...

const DATABASE_URL = getDatabaseUrl();

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

## Step 5: Verification

### Test Development Database:
```bash
NODE_ENV=development npm run dev
# Should connect to development database with existing data
```

### Test Production Database:
```bash
NODE_ENV=production npm run build && npm start
# Should connect to production database (empty/clean)
```

## Important Notes

1. **Data Isolation**: 
   - Development database contains your existing 1,122 bookings and test data
   - Production database starts clean with no test data

2. **Connection Security**:
   - Always use `sslmode=require` for Neon connections
   - Never commit actual connection strings to git
   - Use environment variables for all sensitive data

3. **Backup Strategy**:
   - Regular backups of production database
   - Development database can be refreshed from production periodically
   - Keep schema changes synchronized between environments

4. **Migration Management**:
   - Apply schema changes to development first
   - Test thoroughly before applying to production
   - Consider using a migration tool like Drizzle Kit for schema management

## Schema Tables Included

The following tables will be created in both databases:
- sessions (auth sessions)
- users (user accounts and settings)
- sms_verifications (SMS verification codes)
- security_monitoring (API usage tracking)
- user_security_status (abuse prevention)
- bookings (booking records)
- clients (client information)
- settings (user settings)
- contracts (contract templates and records)
- invoices (invoice records)
- feedback (user feedback)
- unparseable_messages (email parsing errors)
- beta_invite_codes (beta program codes)
- beta_invites (beta program invites)

## Troubleshooting

### Connection Refused
- Check if the database is active in Neon dashboard
- Verify the connection string is correct
- Ensure your IP is not blocked

### Permission Denied
- Check database user permissions
- Verify the database name in connection string

### Schema Import Errors
- Ensure the database is empty before importing
- Check for extension requirements (uuid-ossp)
- Verify PostgreSQL version compatibility (16.x)