-- Complete automated data migration script
-- This imports ALL data from your backup in one go

-- First, let's use your existing backup file
-- Run this to import everything at once:

-- If you have the database_backup_20250912_210143.sql file:
-- \i database_backup_20250912_210143.sql

-- OR use the clean data dump approach:

-- Clear existing data (optional - only if you want a fresh start)
-- TRUNCATE TABLE bookings, clients, users, invoices, contracts, user_settings, email_templates CASCADE;

-- Import users first (they have foreign keys)
\COPY users FROM 'users.csv' WITH CSV HEADER;

-- Import all other tables
\COPY bookings FROM 'bookings.csv' WITH CSV HEADER;
\COPY clients FROM 'clients.csv' WITH CSV HEADER;
\COPY user_settings FROM 'user_settings.csv' WITH CSV HEADER;
\COPY invoices FROM 'invoices.csv' WITH CSV HEADER;
\COPY contracts FROM 'contracts.csv' WITH CSV HEADER;

-- Verify counts
SELECT
  'bookings' as table_name, COUNT(*) as count FROM bookings
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'user_settings', COUNT(*) FROM user_settings
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts
ORDER BY table_name;