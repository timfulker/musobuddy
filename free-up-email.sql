-- Free up the email by changing it on the soft-deleted user
-- This allows you to reuse the email for a new signup

-- Option 1: Change the email on the deleted user to free it up
UPDATE auth.users
SET email = CONCAT('deleted_', id, '_', email)
WHERE email = 'timfulkeramazon+test@gmail.com'
  AND deleted_at IS NOT NULL;

-- Option 2: If you want to completely remove the soft-deleted user
-- First update the email to avoid constraint issues
UPDATE auth.users
SET email = CONCAT('deleted_', id, '_', email)
WHERE id = 'e4ed5095-0276-492e-a197-722db45cf384';

-- Then hard delete
DELETE FROM auth.identities WHERE user_id = 'e4ed5095-0276-492e-a197-722db45cf384';
DELETE FROM auth.sessions WHERE user_id = 'e4ed5095-0276-492e-a197-722db45cf384';
DELETE FROM auth.refresh_tokens WHERE user_id = 'e4ed5095-0276-492e-a197-722db45cf384';
DELETE FROM auth.mfa_factors WHERE user_id = 'e4ed5095-0276-492e-a197-722db45cf384';
DELETE FROM auth.users WHERE id = 'e4ed5095-0276-492e-a197-722db45cf384';

-- Verify the email is now free
SELECT COUNT(*) as users_with_email
FROM auth.users
WHERE email = 'timfulkeramazon+test@gmail.com';