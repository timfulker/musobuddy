-- PRODUCTION DATABASE MIGRATION
-- Run this in your Supabase Production SQL Editor
-- This brings the production database schema up to date with development

-- ============================================================
-- STEP 1: Update users table schema
-- ============================================================

-- Add missing columns to users table if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS supabase_uid TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- STEP 2: Create auth trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    supabase_uid,
    created_at,
    updated_at,
    email_verified,
    is_admin,
    tier,
    first_name,
    last_name
  )
  VALUES (
    gen_random_uuid(),
    NEW.email,
    NEW.id,
    NOW(),
    NOW(),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    false,
    'free',
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (supabase_uid) DO UPDATE
  SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 3: Create auth trigger
-- ============================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 4: Create admin user in users table
-- ============================================================

-- First, check if the Supabase auth user was created (ID from the script output)
-- The script created auth user: 2352f0ea-05db-4e50-942b-f25700f0b2a9

INSERT INTO public.users (
  id,
  email,
  supabase_uid,
  first_name,
  last_name,
  is_admin,
  tier,
  email_verified,
  phone_verified,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'timmfulkermusic@gmail.com',
  '2352f0ea-05db-4e50-942b-f25700f0b2a9', -- The Supabase auth UID from the script
  'Tim',
  'Fulker',
  true,  -- Admin privileges
  'premium',
  true,  -- Email verified
  false,
  NOW(),
  NOW()
) ON CONFLICT (supabase_uid) DO UPDATE
SET
  is_admin = true,
  tier = 'premium',
  email_verified = true,
  first_name = 'Tim',
  last_name = 'Fulker',
  updated_at = NOW();

-- ============================================================
-- STEP 5: Verify the setup
-- ============================================================

-- Check that the admin user was created properly
SELECT
  id,
  email,
  supabase_uid,
  first_name,
  last_name,
  is_admin,
  tier,
  email_verified
FROM users
WHERE email = 'timmfulkermusic@gmail.com';

-- ============================================================
-- PRODUCTION CREDENTIALS
-- ============================================================
-- Email: timmfulkermusic@gmail.com
-- Password: MusicPro2025!
--
-- ⚠️ CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!
-- ============================================================