-- Check the actual status of the email in Supabase Auth
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check ALL users with this email (including soft-deleted)
SELECT
    id,
    email,
    created_at,
    updated_at,
    last_sign_in_at,
    deleted_at,
    CASE
        WHEN deleted_at IS NOT NULL THEN 'SOFT_DELETED'
        ELSE 'ACTIVE'
    END as status
FROM auth.users
WHERE email = 'timfulkeramazon+test@gmail.com'
   OR email ILIKE '%timfulkeramazon+test%';

-- 2. Check if email exists in identities
SELECT
    id,
    user_id,
    identity_data->>'email' as email,
    provider,
    created_at
FROM auth.identities
WHERE identity_data->>'email' = 'timfulkeramazon+test@gmail.com';

-- 3. Check audit logs for this email
SELECT
    id,
    payload->>'actor_name' as actor,
    payload->>'action' as action,
    created_at
FROM auth.audit_log_entries
WHERE payload->>'actor_username' = 'timfulkeramazon+test@gmail.com'
   OR payload->>'actor_name' ILIKE '%timfulkeramazon+test%'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if the issue is a unique constraint
SELECT
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name
FROM pg_constraint
WHERE conrelid = 'auth.users'::regclass
  AND contype = 'u';  -- unique constraints