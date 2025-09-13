-- Import bookings from CSV
-- Run this in Supabase SQL Editor after uploading the CSV

-- First, create a temporary table to import the CSV data
CREATE TEMP TABLE bookings_import AS SELECT * FROM bookings WHERE 1=0;

-- Then use Supabase's CSV import feature:
-- 1. Go to Table Editor in Supabase Dashboard
-- 2. Select the "bookings" table
-- 3. Click "Import data via CSV"
-- 4. Upload bookings.csv
-- 5. Map columns appropriately
-- 6. Import

-- Alternative: Direct COPY command if you have psql access
-- \COPY bookings FROM 'bookings.csv' WITH CSV HEADER;