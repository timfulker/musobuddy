-- HARD DELETE user to completely free up the email address
-- Run this in Supabase SQL Editor

-- First, check if the user exists (even if soft-deleted)
SELECT
    id,
    email,
    created_at,
    deleted_at,
    is_sso_user,
    CASE
        WHEN deleted_at IS NOT NULL THEN 'SOFT DELETED'
        ELSE 'ACTIVE'
    END as status
FROM auth.users
WHERE email = 'timfulkeramazon+test@gmail.com';

-- Delete from public.users first (if exists)
DELETE FROM public.users
WHERE email = 'timfulkeramazon+test@gmail.com'
   OR supabase_uid IN (
       SELECT id FROM auth.users WHERE email = 'timfulkeramazon+test@gmail.com'
   );

-- Delete any user metadata
DELETE FROM auth.identities
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'timfulkeramazon+test@gmail.com'
);

-- Delete any sessions
DELETE FROM auth.sessions
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'timfulkeramazon+test@gmail.com'
);

-- Delete any refresh tokens
DELETE FROM auth.refresh_tokens
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'timfulkeramazon+test@gmail.com'
);

-- Delete any MFA factors
DELETE FROM auth.mfa_factors
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'timfulkeramazon+test@gmail.com'
);

-- Finally, HARD DELETE from auth.users
DELETE FROM auth.users
WHERE email = 'timfulkeramazon+test@gmail.com';

-- Verify the email is now free
SELECT COUNT(*) as remaining_users
FROM auth.users
WHERE email = 'timfulkeramazon+test@gmail.com';

-- This should return 0