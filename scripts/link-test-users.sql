-- Link existing users to Supabase Auth test users
-- Run this after setting up RLS policies

-- Update test users with their Supabase UIDs
-- These are the actual UIDs from the test users we created

-- Admin user
UPDATE users
SET supabase_uid = 'e604e8f7-9dd0-4913-bbe2-93d3757a1ed2'
WHERE email = 'test+admin@example.com' OR email LIKE '%admin%' AND supabase_uid IS NULL
LIMIT 1;

-- Test User 1
UPDATE users
SET supabase_uid = '89ecbef8-9083-4464-854b-2004d1944264'
WHERE email = 'test+user1@example.com' OR (email LIKE '%test%' AND supabase_uid IS NULL)
LIMIT 1;

-- Test User 2
UPDATE users
SET supabase_uid = '8e83e58a-5bfc-4d45-8c74-50ef4878a603'
WHERE email = 'test+user2@example.com' OR (email LIKE '%user2%' AND supabase_uid IS NULL)
LIMIT 1;

-- Demo User
UPDATE users
SET supabase_uid = '6993358f-16c6-4147-8834-895248b25753'
WHERE email = 'test+demo@example.com' OR (email LIKE '%demo%' AND supabase_uid IS NULL)
LIMIT 1;

-- Check the results
SELECT id, email, firebase_uid, supabase_uid
FROM users;

-- If you need to link a specific user manually:
-- UPDATE users
-- SET supabase_uid = 'YOUR-SUPABASE-USER-ID'
-- WHERE email = 'your-email@example.com';