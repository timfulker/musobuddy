-- Check for any triggers on auth.users table that might be causing signup failures
-- Run this in Supabase SQL Editor

-- 1. List all triggers on auth.users table
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
    AND event_object_table = 'users'
ORDER BY trigger_name;

-- 2. Check if there are any functions that might be called by triggers
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%user%'
    AND routine_type = 'FUNCTION';

-- 3. Check for any constraints on auth.users that might be blocking
SELECT
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_schema = 'auth'
    AND table_name = 'users'
    AND constraint_type IN ('CHECK', 'UNIQUE', 'FOREIGN KEY');

-- 4. Try to manually insert a test user to see the exact error
-- DO NOT RUN THIS IN PRODUCTION WITHOUT CAUTION
/*
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    instance_id,
    aud,
    role
) VALUES (
    gen_random_uuid(),
    'test-manual-' || extract(epoch from now())::text || '@example.com',
    crypt('testpass123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated'
);
*/

-- 5. Check if auth schema is accessible
SELECT
    schema_name,
    schema_owner
FROM information_schema.schemata
WHERE schema_name = 'auth';