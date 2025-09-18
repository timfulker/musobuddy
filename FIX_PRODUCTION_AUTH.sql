-- PRODUCTION AUTH FIX
-- Run this in your Supabase PRODUCTION SQL Editor
-- This fixes the existing admin user

-- ============================================================
-- STEP 1: Check what we have
-- ============================================================

-- See if the auth user exists
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'timmfulkermusic@gmail.com';

-- See if database user exists
SELECT id, email, supabase_uid, is_admin, tier
FROM public.users
WHERE email = 'timmfulkermusic@gmail.com';

-- ============================================================
-- STEP 2: Fix the user record
-- ============================================================

-- The auth user was created with ID: 2352f0ea-05db-4e50-942b-f25700f0b2a9
-- Update or create the database user

-- First, delete any duplicate records (keeping only one)
DELETE FROM public.users
WHERE email = 'timmfulkermusic@gmail.com'
AND supabase_uid IS NULL;

-- Now update/insert the correct record
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
  '2352f0ea-05db-4e50-942b-f25700f0b2a9', -- The Supabase auth UID
  'Tim',
  'Fulker',
  true,  -- Admin privileges
  'premium',
  true,  -- Email verified
  false,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE
SET
  supabase_uid = '2352f0ea-05db-4e50-942b-f25700f0b2a9',
  is_admin = true,
  tier = 'premium',
  email_verified = true,
  first_name = 'Tim',
  last_name = 'Fulker',
  updated_at = NOW();

-- ============================================================
-- STEP 3: Verify it worked
-- ============================================================

SELECT
  u.id as user_id,
  u.email,
  u.supabase_uid,
  u.is_admin,
  u.tier,
  au.id as auth_id,
  au.email_confirmed_at
FROM users u
LEFT JOIN auth.users au ON au.id::text = u.supabase_uid
WHERE u.email = 'timmfulkermusic@gmail.com';

-- Should show one record with matching supabase_uid and auth_id