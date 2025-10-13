-- Row Level Security Policies for Supabase
-- These policies ensure users can only access their own data

-- First, add supabase_uid column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_uid UUID;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);

-- Enable RLS on all important tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;

-- BOOKINGS POLICIES
-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT
    USING (
        user_id IN (
            SELECT id::text FROM users
            WHERE supabase_uid = auth.uid()
        )
    );

-- Users can create bookings for themselves
CREATE POLICY "Users can create own bookings" ON bookings
    FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id::text FROM users
            WHERE supabase_uid = auth.uid()
        )
    );

-- Users can update their own bookings
CREATE POLICY "Users can update own bookings" ON bookings
    FOR UPDATE
    USING (
        user_id IN (
            SELECT id::text FROM users
            WHERE supabase_uid = auth.uid()
        )
    );

-- Users can delete their own bookings
CREATE POLICY "Users can delete own bookings" ON bookings
    FOR DELETE
    USING (
        user_id IN (
            SELECT id::text FROM users
            WHERE supabase_uid = auth.uid()
        )
    );

-- CLIENTS POLICIES
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can create own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;

CREATE POLICY "Users can view own clients" ON clients
    FOR SELECT
    USING (
        user_id IN (
            SELECT id::text FROM users
            WHERE supabase_uid = auth.uid()
        )
    );

CREATE POLICY "Users can create own clients" ON clients
    FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id::text FROM users
            WHERE supabase_uid = auth.uid()
        )
    );

CREATE POLICY "Users can update own clients" ON clients
    FOR UPDATE
    USING (
        user_id IN (
            SELECT id::text FROM users
            WHERE supabase_uid = auth.uid()
        )
    );

-- INVOICES POLICIES
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;

CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT
    USING (
        booking_id IN (
            SELECT id FROM bookings
            WHERE user_id IN (
                SELECT id::text FROM users
                WHERE supabase_uid = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create own invoices" ON invoices
    FOR INSERT
    WITH CHECK (
        booking_id IN (
            SELECT id FROM bookings
            WHERE user_id IN (
                SELECT id::text FROM users
                WHERE supabase_uid = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE
    USING (
        booking_id IN (
            SELECT id FROM bookings
            WHERE user_id IN (
                SELECT id::text FROM users
                WHERE supabase_uid = auth.uid()
            )
        )
    );

-- CONTRACTS POLICIES
DROP POLICY IF EXISTS "Users can view own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can create own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;

CREATE POLICY "Users can view own contracts" ON contracts
    FOR SELECT
    USING (
        booking_id IN (
            SELECT id FROM bookings
            WHERE user_id IN (
                SELECT id::text FROM users
                WHERE supabase_uid = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create own contracts" ON contracts
    FOR INSERT
    WITH CHECK (
        booking_id IN (
            SELECT id FROM bookings
            WHERE user_id IN (
                SELECT id::text FROM users
                WHERE supabase_uid = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update own contracts" ON contracts
    FOR UPDATE
    USING (
        booking_id IN (
            SELECT id FROM bookings
            WHERE user_id IN (
                SELECT id::text FROM users
                WHERE supabase_uid = auth.uid()
            )
        )
    );

-- USER SETTINGS POLICIES
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT
    USING (
        user_id IN (
            SELECT id::text FROM users
            WHERE supabase_uid = auth.uid()
        )
    );

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE
    USING (
        user_id IN (
            SELECT id::text FROM users
            WHERE supabase_uid = auth.uid()
        )
    );

-- PUBLIC ACCESS POLICIES (for unauthenticated access if needed)
-- Example: Allow public read access to certain tables
-- CREATE POLICY "Public can view published content" ON some_table
--     FOR SELECT
--     USING (is_published = true);

-- ADMIN POLICIES (optional - for admin users)
-- You could add policies that check if user is admin
-- Example:
-- CREATE POLICY "Admins can view all bookings" ON bookings
--     FOR SELECT
--     USING (
--         EXISTS (
--             SELECT 1 FROM users
--             WHERE supabase_uid = auth.uid()
--             AND is_admin = true
--         )
--     );

-- Update test users with their Supabase UIDs
-- (We'll do this separately with the actual UIDs from the test users we created)

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;