-- Fix Supabase schema to match Neon/Firebase exactly
-- Run this in Supabase SQL Editor to align the schemas

-- 1. Add missing columns that exist in Neon but not in Supabase
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS mileage DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);

-- 2. Add the deposit column (Supabase uses deposit_amount, Neon uses deposit)
-- First check if deposit exists, if not add it
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS deposit DECIMAL(10, 2);

-- 3. Copy data from misnamed columns to correctly named ones
UPDATE bookings
SET
  deposit = deposit_amount,
  latitude = map_latitude,
  longitude = map_longitude
WHERE deposit IS NULL OR latitude IS NULL OR longitude IS NULL;

-- 4. OPTIONAL: After verifying data is copied, you could drop the old columns
-- But I recommend keeping them for now as backup
-- ALTER TABLE bookings DROP COLUMN deposit_amount;
-- ALTER TABLE bookings DROP COLUMN map_latitude;
-- ALTER TABLE bookings DROP COLUMN map_longitude;

-- 5. Add any other missing standard columns from your app
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS dress_code TEXT;

-- 6. Verify the schema matches
-- This query will show all columns in the bookings table
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM
  information_schema.columns
WHERE
  table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY
  ordinal_position;

-- 7. Create indexes for better performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);