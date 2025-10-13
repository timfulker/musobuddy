-- Migration: Add title column to bookings table in PRODUCTION
-- This fixes the critical issue where bookings are being rejected
-- because production database is missing the 'title' column

-- Check if column exists first (safe to run multiple times)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS title TEXT;

-- Update existing bookings to have a title based on client_name if title is null
UPDATE bookings
SET title = COALESCE(client_name, 'Booking Request')
WHERE title IS NULL;

-- Make the column NOT NULL for future inserts (optional - only if you want to enforce it)
-- ALTER TABLE bookings ALTER COLUMN title SET NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
AND column_name = 'title';