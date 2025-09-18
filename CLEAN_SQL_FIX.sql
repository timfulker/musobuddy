-- STEP 1: Check if auth user exists
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'timmfulkermusic@gmail.com';

-- STEP 2: Check if database user exists
SELECT * FROM public.users
WHERE email = 'timmfulkermusic@gmail.com';

-- STEP 3: Create the user (replace YOUR_AUTH_ID with actual ID from step 1)
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
    'YOUR_AUTH_ID',
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
    supabase_uid = 'YOUR_AUTH_ID',
    is_admin = true,
    tier = 'premium',
    email_verified = true,
    updated_at = NOW();

-- STEP 4: Verify it worked
SELECT
    u.email,
    u.supabase_uid,
    u.is_admin,
    au.id as auth_id
FROM public.users u
LEFT JOIN auth.users au ON au.email = u.email
WHERE u.email = 'timmfulkermusic@gmail.com';