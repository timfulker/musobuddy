-- Update ring-fenced accounts to has_paid = true
-- Run this once to set up the 3 special accounts before enforcing the hard payment rule

-- Admin account
UPDATE users 
SET has_paid = true, updated_at = NOW()
WHERE email = 'timfulker@gmail.com';

-- Musician account  
UPDATE users 
SET has_paid = true, updated_at = NOW()
WHERE email = 'timfulkermusic@gmail.com';

-- Dummy account
UPDATE users 
SET has_paid = true, updated_at = NOW()
WHERE email = 'jake.stanley@musobuddy.com';

-- Verify the updates
SELECT email, has_paid, is_admin, is_assigned, updated_at 
FROM users 
WHERE email IN ('timfulker@gmail.com', 'timfulkermusic@gmail.com', 'jake.stanley@musobuddy.com');