-- Run this in your DEVELOPMENT database SQL Editor to export data
-- Copy the results and run in PRODUCTION database

-- First, let's see what we're working with
SELECT 'Data export starting...' as status;

-- Export all table creation statements
SELECT 'Creating tables...' as status;

-- You'll need to manually copy the CREATE TABLE statements from development
-- Go to Supabase Development Dashboard > SQL Editor and run:

-- Export clients data
SELECT 'Exporting clients...' as status;
COPY (SELECT * FROM clients) TO STDOUT WITH CSV HEADER;

-- Export bookings data
SELECT 'Exporting bookings...' as status;
COPY (SELECT * FROM bookings) TO STDOUT WITH CSV HEADER;

-- Export contracts data
SELECT 'Exporting contracts...' as status;
COPY (SELECT * FROM contracts) TO STDOUT WITH CSV HEADER;

-- Export invoices data
SELECT 'Exporting invoices...' as status;
COPY (SELECT * FROM invoices) TO STDOUT WITH CSV HEADER;