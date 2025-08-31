-- Fix admin accounts - set is_beta_tester = false for admin users
-- Admins should manage beta feedback but not be beta testers themselves

-- Update admin account - remove beta tester status
UPDATE users 
SET is_beta_tester = false, updated_at = NOW()
WHERE email = 'timfulker@gmail.com' AND is_admin = true;

-- Verify the update
SELECT email, is_admin, is_beta_tester, is_assigned, has_paid, updated_at 
FROM users 
WHERE email = 'timfulker@gmail.com';

-- Optional: Check all admin users to ensure none are marked as beta testers
SELECT email, is_admin, is_beta_tester, is_assigned 
FROM users 
WHERE is_admin = true;