-- ============================================================================
-- ALIGN SUPABASE SCHEMA WITH NEON/FIREBASE SCHEMA
-- ============================================================================
-- Run this in Supabase SQL Editor to make schemas identical
-- This eliminates the need for field mapping in the code

BEGIN;

-- Add missing columns that exist in Neon but not in Supabase
-- (Most of these probably already exist, but IF NOT EXISTS prevents errors)

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS mileage DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Add the standard columns with correct names (not the Supabase variants)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS deposit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

-- Copy data from Supabase naming to standard naming
-- (This preserves your existing data while adding standard column names)
UPDATE bookings
SET
  deposit = COALESCE(deposit, deposit_amount),
  latitude = COALESCE(latitude, map_latitude),
  longitude = COALESCE(longitude, map_longitude)
WHERE
  deposit IS NULL OR
  latitude IS NULL OR
  longitude IS NULL;

-- Add any other missing standard fields that the app expects
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS dress_code TEXT,
ADD COLUMN IF NOT EXISTS parking_info TEXT,
ADD COLUMN IF NOT EXISTS venue_contact_info TEXT;

COMMIT;

-- ============================================================================
-- VERIFICATION: Check that schemas now match
-- ============================================================================

SELECT
  'Columns now in Supabase bookings table:' as status;

SELECT
  column_name,
  data_type,
  character_maximum_length,
  numeric_precision,
  numeric_scale,
  is_nullable
FROM
  information_schema.columns
WHERE
  table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY
  column_name;

-- Count check
SELECT
  COUNT(*) as total_columns
FROM
  information_schema.columns
WHERE
  table_schema = 'public'
  AND table_name = 'bookings';

-- ============================================================================
-- PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT
  'Schema alignment complete! ✅' as status,
  'You can now remove all field mapping code from the Supabase adapter' as next_step;