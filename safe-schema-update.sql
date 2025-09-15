-- Safe Schema Update - Only creates missing tables
-- Use CREATE TABLE IF NOT EXISTS to avoid conflicts

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop and recreate only if you want a completely fresh start
-- Otherwise, this will safely add missing tables

CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  is_admin BOOLEAN DEFAULT false,
  is_assigned BOOLEAN DEFAULT false,
  is_beta_tester BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMP,
  has_paid BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  account_notes TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  email_prefix TEXT UNIQUE,
  quick_add_token TEXT UNIQUE,
  widget_url TEXT,
  widget_qr_code TEXT,
  phone_number VARCHAR(20),
  firebase_uid TEXT UNIQUE,
  supabase_uid TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Continue with all other tables...
-- [Rest of schema with IF NOT EXISTS for each table]