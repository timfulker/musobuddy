-- FIX FOR dknmckqaraedpimxdsqq PRODUCTION DATABASE
-- Run this in your production Supabase SQL Editor
-- https://supabase.com/dashboard/project/dknmckqaraedpimxdsqq/sql/new

-- ============================================================
-- STEP 1: Find the auth user
-- ============================================================
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'timmfulkermusic@gmail.com';

-- Copy the ID from above (should be a UUID)
-- Use it in the next steps

-- ============================================================
-- STEP 2: Check if user exists in public.users
-- ============================================================
SELECT * FROM public.users
WHERE email = 'timmfulkermusic@gmail.com';

-- ============================================================
-- STEP 3: Create/Update the user in public.users
-- ============================================================

-- Replace YOUR_AUTH_UUID_HERE with the actual ID from Step 1
DO $$
DECLARE
    auth_uuid UUID;
BEGIN
    -- Get the auth user's ID
    SELECT id INTO auth_uuid
    FROM auth.users
    WHERE email = 'timmfulkermusic@gmail.com'
    LIMIT 1;

    IF auth_uuid IS NOT NULL THEN
        -- Insert or update the user
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
            auth_uuid::TEXT,
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
            supabase_uid = auth_uuid::TEXT,
            is_admin = true,
            tier = 'premium',
            email_verified = true,
            first_name = 'Tim',
            last_name = 'Fulker',
            updated_at = NOW();

        RAISE NOTICE 'User created/updated successfully with auth ID: %', auth_uuid;
    ELSE
        RAISE NOTICE 'No auth user found for timmfulkermusic@gmail.com';
    END IF;
END $$;

-- ============================================================
-- STEP 4: Verify the fix worked
-- ============================================================
SELECT
    u.id,
    u.email,
    u.supabase_uid,
    u.is_admin,
    au.id as auth_id,
    CASE
        WHEN u.supabase_uid = au.id::TEXT THEN '✅ MATCHED'
        ELSE '❌ MISMATCH'
    END as status
FROM public.users u
LEFT JOIN auth.users au ON au.email = u.email
WHERE u.email = 'timmfulkermusic@gmail.com';

-- Should show ✅ MATCHED