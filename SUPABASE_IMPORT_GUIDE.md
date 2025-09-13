# 🚨 Supabase Database Import Guide

Since the Supabase database is empty, we need to import the schema and data. Follow these steps:

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Select your **musobuddy-dev** project
3. Click on **SQL Editor** in the left sidebar

## Step 2: Create Tables (Run Each Block Separately)

### Block 1: Enable Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Block 2: Create Core Tables
Run the contents of `supabase-schema-clean.sql` in chunks. Here are the most important tables:

```sql
-- Users table (core)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    firebase_uid VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    phone_number VARCHAR,
    is_admin BOOLEAN DEFAULT false,
    is_assigned BOOLEAN DEFAULT false,
    has_paid BOOLEAN DEFAULT false,
    tier VARCHAR DEFAULT 'free',
    phone_verified BOOLEAN DEFAULT false,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table (main data)
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    client_name VARCHAR NOT NULL,
    client_email VARCHAR,
    client_phone VARCHAR,
    event_date TIMESTAMP,
    event_time VARCHAR,
    event_end_time VARCHAR,
    performance_duration TEXT,
    venue VARCHAR,
    event_type VARCHAR,
    gig_type VARCHAR,
    estimated_value VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'new',
    notes TEXT,
    original_email_content TEXT,
    parsed_data JSONB,
    human_review_required BOOLEAN DEFAULT false,
    review_notes TEXT,
    confidence_score NUMERIC,
    parse_version VARCHAR,
    invoice_created BOOLEAN DEFAULT false,
    contract_created BOOLEAN DEFAULT false,
    payment_status VARCHAR,
    payment_amount NUMERIC,
    payment_date TIMESTAMP,
    email_hash VARCHAR UNIQUE,
    source VARCHAR DEFAULT 'email',
    google_event_id VARCHAR,
    google_calendar_link TEXT,
    collaboration_token VARCHAR UNIQUE,
    collaboration_enabled BOOLEAN DEFAULT false,
    shared_at TIMESTAMP,
    shared_by VARCHAR,
    imported_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    email VARCHAR,
    phone VARCHAR,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id),
    invoice_number VARCHAR UNIQUE,
    amount NUMERIC NOT NULL,
    status VARCHAR DEFAULT 'draft',
    issued_date DATE,
    due_date DATE,
    paid_date DATE,
    payment_method VARCHAR,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id),
    contract_number VARCHAR UNIQUE,
    status VARCHAR DEFAULT 'draft',
    signed_date TIMESTAMP,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR UNIQUE NOT NULL,
    business_name VARCHAR,
    business_email VARCHAR,
    business_phone VARCHAR,
    business_address TEXT,
    invoice_prefix VARCHAR,
    invoice_notes TEXT,
    contract_terms TEXT,
    notification_preferences JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Step 3: Import Data

After creating the tables, run this to check they exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## Step 4: Alternative - Use Supabase Migration Tool

If the manual approach is too complex, you can:

1. Use Supabase CLI to push the schema:
```bash
npx supabase db push
```

2. Or use pg_dump with proper connection string (from your Supabase dashboard):
```bash
# Get the connection string from Supabase Dashboard > Settings > Database
# It will look like: postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
```

## Step 5: Verify Import

Once tables are created, verify with:

```sql
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
```

Expected result: ~37 tables

## Files Available for Import:
- `neon-schema.sql` - Original full schema (64KB)
- `supabase-schema-clean.sql` - Clean schema without comments (76KB)
- `neon-data.sql` - Full data export (1.8MB)

## 🔥 Quick Alternative:

If you want everything at once, you can try running the full backup we created earlier:
`database_backup_20250912_210143.sql`

Just upload it to Supabase SQL Editor and run it.