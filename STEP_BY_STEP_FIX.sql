-- STEP 1: Check if auth user exists
-- Run this first:
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'timmfulkermusic@gmail.com';

-- STEP 2: Check if database user exists
-- Run this second:
SELECT * FROM public.users
WHERE email = 'timmfulkermusic@gmail.com';

-- STEP 3: Get the auth user ID (copy the result from step 1)
-- Replace 'PASTE_AUTH_ID_HERE' with the actual ID from step 1
-- Then run this:

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
    'PASTE_AUTH_ID_HERE',
    'Tim',
    'Fulker',
    true,
    'premium',
    true,
    false,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE
SET
    supabase_uid = 'PASTE_AUTH_ID_HERE',
    is_admin = true,
    tier = 'premium',
    email_verified = true,
    updated_at = NOW();

-- STEP 4: Verify it worked
-- Run this last:
SELECT
    u.email,
    u.supabase_uid,
    u.is_admin,
    au.id as auth_id
FROM public.users u
LEFT JOIN auth.users au ON au.email = u.email
WHERE u.email = 'timmfulkermusic@gmail.com';