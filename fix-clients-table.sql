-- Fix clients table to allow null emails temporarily
-- Run this in PRODUCTION Supabase SQL Editor

ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;

-- Now the clients copy should work
SELECT 'Clients table fixed - email column now allows nulls' as status;