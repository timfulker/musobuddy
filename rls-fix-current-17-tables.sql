-- ===================================================================
-- RLS SECURITY FIX FOR 17 CURRENTLY FLAGGED TABLES
-- Generated: 2025-10-07
-- ===================================================================
--
-- This script addresses the current database linter errors for:
-- 1. User-owned tables (9): bands, booking_documents, bookings,
--    compliance_documents, contracts, invoices, blocked_dates,
--    client_communications, user_settings
-- 2. Admin-only tables (2): security_monitoring, user_audit_logs
-- 3. Monitoring/Telemetry tables (5): front_end_errors, front_end_monitoring,
--    network_requests, performance_metrics, user_interactions
-- 4. Core table (1): users
--
-- IMPORTANT: Test in development first!
-- ===================================================================

-- Step 1: Create or verify the is_admin helper function
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean AS $$
  SELECT COALESCE((SELECT is_admin FROM users WHERE supabase_uid = uid::text), false)
$$ LANGUAGE sql STABLE;

-- ===================================================================
-- SECTION 1: USER-OWNED TABLES (9 tables)
-- Users can only access their own data
-- ===================================================================

-- 1. BANDS TABLE
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bands_select_own" ON bands;
DROP POLICY IF EXISTS "bands_insert_own" ON bands;
DROP POLICY IF EXISTS "bands_update_own" ON bands;
DROP POLICY IF EXISTS "bands_delete_own" ON bands;

CREATE POLICY "bands_select_own" ON bands FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bands.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "bands_insert_own" ON bands FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bands.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "bands_update_own" ON bands FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bands.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "bands_delete_own" ON bands FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bands.user_id)
  OR is_admin(auth.uid())
);

-- 2. BOOKING_DOCUMENTS TABLE
ALTER TABLE booking_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_documents_select_own" ON booking_documents;
DROP POLICY IF EXISTS "booking_documents_insert_own" ON booking_documents;
DROP POLICY IF EXISTS "booking_documents_update_own" ON booking_documents;
DROP POLICY IF EXISTS "booking_documents_delete_own" ON booking_documents;

CREATE POLICY "booking_documents_select_own" ON booking_documents FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_documents.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "booking_documents_insert_own" ON booking_documents FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_documents.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "booking_documents_update_own" ON booking_documents FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_documents.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "booking_documents_delete_own" ON booking_documents FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_documents.user_id)
  OR is_admin(auth.uid())
);

-- 3. BOOKINGS TABLE
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;
DROP POLICY IF EXISTS "bookings_update_own" ON bookings;
DROP POLICY IF EXISTS "bookings_delete_own" ON bookings;

CREATE POLICY "bookings_select_own" ON bookings FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bookings.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "bookings_insert_own" ON bookings FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bookings.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "bookings_update_own" ON bookings FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bookings.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "bookings_delete_own" ON bookings FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bookings.user_id)
  OR is_admin(auth.uid())
);

-- 4. COMPLIANCE_DOCUMENTS TABLE
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_documents_select_own" ON compliance_documents;
DROP POLICY IF EXISTS "compliance_documents_insert_own" ON compliance_documents;
DROP POLICY IF EXISTS "compliance_documents_update_own" ON compliance_documents;
DROP POLICY IF EXISTS "compliance_documents_delete_own" ON compliance_documents;

CREATE POLICY "compliance_documents_select_own" ON compliance_documents FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = compliance_documents.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "compliance_documents_insert_own" ON compliance_documents FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = compliance_documents.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "compliance_documents_update_own" ON compliance_documents FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = compliance_documents.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "compliance_documents_delete_own" ON compliance_documents FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = compliance_documents.user_id)
  OR is_admin(auth.uid())
);

-- 5. CONTRACTS TABLE
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_select_own" ON contracts;
DROP POLICY IF EXISTS "contracts_insert_own" ON contracts;
DROP POLICY IF EXISTS "contracts_update_own" ON contracts;
DROP POLICY IF EXISTS "contracts_delete_own" ON contracts;

CREATE POLICY "contracts_select_own" ON contracts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contracts.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "contracts_insert_own" ON contracts FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contracts.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "contracts_update_own" ON contracts FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contracts.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "contracts_delete_own" ON contracts FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contracts.user_id)
  OR is_admin(auth.uid())
);

-- 6. INVOICES TABLE
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_own" ON invoices;
DROP POLICY IF EXISTS "invoices_insert_own" ON invoices;
DROP POLICY IF EXISTS "invoices_update_own" ON invoices;
DROP POLICY IF EXISTS "invoices_delete_own" ON invoices;

CREATE POLICY "invoices_select_own" ON invoices FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = invoices.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "invoices_insert_own" ON invoices FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = invoices.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "invoices_update_own" ON invoices FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = invoices.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "invoices_delete_own" ON invoices FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = invoices.user_id)
  OR is_admin(auth.uid())
);

-- 7. BLOCKED_DATES TABLE
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_dates_select_own" ON blocked_dates;
DROP POLICY IF EXISTS "blocked_dates_insert_own" ON blocked_dates;
DROP POLICY IF EXISTS "blocked_dates_update_own" ON blocked_dates;
DROP POLICY IF EXISTS "blocked_dates_delete_own" ON blocked_dates;

CREATE POLICY "blocked_dates_select_own" ON blocked_dates FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = blocked_dates.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "blocked_dates_insert_own" ON blocked_dates FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = blocked_dates.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "blocked_dates_update_own" ON blocked_dates FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = blocked_dates.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "blocked_dates_delete_own" ON blocked_dates FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = blocked_dates.user_id)
  OR is_admin(auth.uid())
);

-- 8. CLIENT_COMMUNICATIONS TABLE
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_communications_select_own" ON client_communications;
DROP POLICY IF EXISTS "client_communications_insert_own" ON client_communications;
DROP POLICY IF EXISTS "client_communications_update_own" ON client_communications;
DROP POLICY IF EXISTS "client_communications_delete_own" ON client_communications;

CREATE POLICY "client_communications_select_own" ON client_communications FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = client_communications.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "client_communications_insert_own" ON client_communications FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = client_communications.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "client_communications_update_own" ON client_communications FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = client_communications.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "client_communications_delete_own" ON client_communications FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = client_communications.user_id)
  OR is_admin(auth.uid())
);

-- 9. USER_SETTINGS TABLE
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_select_own" ON user_settings;
DROP POLICY IF EXISTS "user_settings_insert_own" ON user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON user_settings;
DROP POLICY IF EXISTS "user_settings_delete_own" ON user_settings;

CREATE POLICY "user_settings_select_own" ON user_settings FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_settings.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "user_settings_insert_own" ON user_settings FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_settings.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "user_settings_update_own" ON user_settings FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_settings.user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "user_settings_delete_own" ON user_settings FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_settings.user_id)
  OR is_admin(auth.uid())
);

-- ===================================================================
-- SECTION 2: ADMIN-ONLY TABLES (2 tables)
-- Only admins can access these monitoring/audit tables
-- ===================================================================

-- 10. SECURITY_MONITORING TABLE
ALTER TABLE security_monitoring ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_monitoring_admin_all" ON security_monitoring;

CREATE POLICY "security_monitoring_admin_all" ON security_monitoring FOR ALL
USING (is_admin(auth.uid()));

-- 11. USER_AUDIT_LOGS TABLE
ALTER TABLE user_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_audit_logs_admin_all" ON user_audit_logs;

CREATE POLICY "user_audit_logs_admin_all" ON user_audit_logs FOR ALL
USING (is_admin(auth.uid()));

-- ===================================================================
-- SECTION 3: MONITORING/TELEMETRY TABLES (5 tables)
-- Session-based telemetry, no user_id FK
-- Backend service role can insert, admins can read for dashboards
-- ===================================================================

-- 12. FRONT_END_ERRORS TABLE
ALTER TABLE front_end_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "front_end_errors_insert_authenticated" ON front_end_errors;
DROP POLICY IF EXISTS "front_end_errors_select_admin" ON front_end_errors;

-- Allow authenticated users to insert their own error logs
CREATE POLICY "front_end_errors_insert_authenticated" ON front_end_errors FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow admins to view all errors for monitoring
CREATE POLICY "front_end_errors_select_admin" ON front_end_errors FOR SELECT
USING (is_admin(auth.uid()));

-- 13. FRONT_END_MONITORING TABLE
ALTER TABLE front_end_monitoring ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "front_end_monitoring_insert_service" ON front_end_monitoring;
DROP POLICY IF EXISTS "front_end_monitoring_select_admin" ON front_end_monitoring;
DROP POLICY IF EXISTS "front_end_monitoring_update_service" ON front_end_monitoring;

-- Service role can insert/update aggregated data
CREATE POLICY "front_end_monitoring_insert_service" ON front_end_monitoring FOR INSERT
WITH CHECK (auth.role() = 'authenticated' OR is_admin(auth.uid()));

CREATE POLICY "front_end_monitoring_update_service" ON front_end_monitoring FOR UPDATE
USING (auth.role() = 'authenticated' OR is_admin(auth.uid()));

-- Admins can view aggregated monitoring data
CREATE POLICY "front_end_monitoring_select_admin" ON front_end_monitoring FOR SELECT
USING (is_admin(auth.uid()));

-- 14. NETWORK_REQUESTS TABLE
ALTER TABLE network_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "network_requests_insert_authenticated" ON network_requests;
DROP POLICY IF EXISTS "network_requests_select_admin" ON network_requests;

-- Allow authenticated users to log their own network requests
CREATE POLICY "network_requests_insert_authenticated" ON network_requests FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow admins to view all network request logs
CREATE POLICY "network_requests_select_admin" ON network_requests FOR SELECT
USING (is_admin(auth.uid()));

-- 15. PERFORMANCE_METRICS TABLE
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "performance_metrics_insert_authenticated" ON performance_metrics;
DROP POLICY IF EXISTS "performance_metrics_select_admin" ON performance_metrics;

-- Allow authenticated users to log their own performance metrics
CREATE POLICY "performance_metrics_insert_authenticated" ON performance_metrics FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow admins to view all performance metrics
CREATE POLICY "performance_metrics_select_admin" ON performance_metrics FOR SELECT
USING (is_admin(auth.uid()));

-- 16. USER_INTERACTIONS TABLE
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_interactions_insert_authenticated" ON user_interactions;
DROP POLICY IF EXISTS "user_interactions_select_admin" ON user_interactions;

-- Allow authenticated users to log their own interactions
CREATE POLICY "user_interactions_insert_authenticated" ON user_interactions FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow admins to view all user interactions
CREATE POLICY "user_interactions_select_admin" ON user_interactions FOR SELECT
USING (is_admin(auth.uid()));

-- ===================================================================
-- SECTION 4: USERS TABLE (1 table)
-- Users can view/update their own record, admins can view all
-- ===================================================================

-- 17. USERS TABLE
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- Users can view their own record, admins can view all
CREATE POLICY "users_select_own" ON users FOR SELECT
USING (
  supabase_uid = auth.uid()::text
  OR is_admin(auth.uid())
);

-- Allow user registration (INSERT during signup)
CREATE POLICY "users_insert_own" ON users FOR INSERT
WITH CHECK (supabase_uid = auth.uid()::text);

-- Users can update their own record, admins can update any
CREATE POLICY "users_update_own" ON users FOR UPDATE
USING (
  supabase_uid = auth.uid()::text
  OR is_admin(auth.uid())
);

-- Only admins can delete users
CREATE POLICY "users_delete_admin" ON users FOR DELETE
USING (is_admin(auth.uid()));

-- ===================================================================
-- VERIFICATION
-- ===================================================================

SELECT 'RLS policies created successfully for all 17 tables!' as status;

-- Verify all tables have RLS enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'bands', 'booking_documents', 'bookings', 'compliance_documents',
    'contracts', 'invoices', 'security_monitoring', 'user_audit_logs',
    'user_settings', 'blocked_dates', 'client_communications', 'users',
    'front_end_errors', 'front_end_monitoring', 'network_requests',
    'performance_metrics', 'user_interactions'
  )
ORDER BY tablename;
