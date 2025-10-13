# Database Migrations

This directory contains SQL migrations for the MusoBuddy database.

## Running Migrations

### Option 1: Supabase SQL Editor (Recommended for Production)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file you want to run
4. Copy and paste the SQL into the editor
5. Click **Run** to execute

### Option 2: Command Line (Using psql)

```bash
# Connect to your database
psql "postgresql://user:password@host:port/database"

# Run a specific migration
\i migrations/admin-features-tables.sql
```

### Option 3: Drizzle Kit

```bash
# Push schema changes to database
npm run db:push
```

## Available Migrations

### `admin-features-tables.sql`
**Date:** 2025-10-05
**Purpose:** Adds admin panel features
- Creates `beta_email_templates` table for customizable beta invitation emails
- Creates `api_usage_tracking` table for detailed API call logging
- Creates `api_usage_stats` table for aggregated user API usage statistics
- Adds performance indexes

**Required for:**
- Admin panel API usage monitoring
- Beta email template management
- Cost tracking and user risk scoring

## Verification

After running a migration, verify it succeeded:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('beta_email_templates', 'api_usage_tracking', 'api_usage_stats');

-- Check table structure
\d beta_email_templates
\d api_usage_tracking
\d api_usage_stats
```

## Rollback

If you need to rollback a migration:

```sql
-- Drop the tables (WARNING: This will delete all data)
DROP TABLE IF EXISTS api_usage_stats CASCADE;
DROP TABLE IF EXISTS api_usage_tracking CASCADE;
DROP TABLE IF EXISTS beta_email_templates CASCADE;
```

## Notes

- Always backup your database before running migrations in production
- Test migrations in development/staging first
- Some migrations may take time on large databases
- Check application logs after migration to ensure everything works
