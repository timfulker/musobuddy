-- ===================================================================
-- COMPREHENSIVE RLS SECURITY FIX
-- Addresses all 28 security errors from Supabase database linter
-- ===================================================================
--
-- This script will:
-- 1. Enable RLS on all tables that need it
-- 2. Create appropriate policies based on user ownership
-- 3. Ensure data isolation between users
--
-- IMPORTANT: Review and test in a non-production environment first!
-- ===================================================================

-- Helper function for admin checks (if not already exists)
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean AS $$
  SELECT COALESCE((SELECT is_admin FROM users WHERE supabase_uid = uid::text), false)
$$ LANGUAGE sql STABLE;

-- ===================================================================
-- SECTION 1: User-owned tables (standard pattern)
-- Tables where users can only access their own data
-- ===================================================================

-- 1. CLIENTS TABLE
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select_own" ON clients;
DROP POLICY IF EXISTS "clients_insert_own" ON clients;
DROP POLICY IF EXISTS "clients_update_own" ON clients;
DROP POLICY IF EXISTS "clients_delete_own" ON clients;

CREATE POLICY "clients_select_own" ON clients FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = clients.user_id) OR is_admin(auth.uid()));

CREATE POLICY "clients_insert_own" ON clients FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = clients.user_id) OR is_admin(auth.uid()));

CREATE POLICY "clients_update_own" ON clients FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = clients.user_id) OR is_admin(auth.uid()));

CREATE POLICY "clients_delete_own" ON clients FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = clients.user_id) OR is_admin(auth.uid()));

-- 2. EMAIL_TEMPLATES TABLE
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates_select_own" ON email_templates;
DROP POLICY IF EXISTS "email_templates_insert_own" ON email_templates;
DROP POLICY IF EXISTS "email_templates_update_own" ON email_templates;
DROP POLICY IF EXISTS "email_templates_delete_own" ON email_templates;

CREATE POLICY "email_templates_select_own" ON email_templates FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = email_templates.user_id) OR is_admin(auth.uid()));

CREATE POLICY "email_templates_insert_own" ON email_templates FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = email_templates.user_id) OR is_admin(auth.uid()));

CREATE POLICY "email_templates_update_own" ON email_templates FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = email_templates.user_id) OR is_admin(auth.uid()));

CREATE POLICY "email_templates_delete_own" ON email_templates FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = email_templates.user_id) OR is_admin(auth.uid()));

-- 3. FEEDBACK TABLE
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_select_own" ON feedback;
DROP POLICY IF EXISTS "feedback_insert_own" ON feedback;
DROP POLICY IF EXISTS "feedback_update_own" ON feedback;
DROP POLICY IF EXISTS "feedback_delete_own" ON feedback;

CREATE POLICY "feedback_select_own" ON feedback FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = feedback.user_id) OR is_admin(auth.uid()));

CREATE POLICY "feedback_insert_own" ON feedback FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = feedback.user_id) OR is_admin(auth.uid()));

CREATE POLICY "feedback_update_own" ON feedback FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = feedback.user_id) OR is_admin(auth.uid()));

CREATE POLICY "feedback_delete_own" ON feedback FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = feedback.user_id) OR is_admin(auth.uid()));

-- 4. EVENT_SYNC_MAPPING TABLE
ALTER TABLE event_sync_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_sync_mapping_select_own" ON event_sync_mapping;
DROP POLICY IF EXISTS "event_sync_mapping_insert_own" ON event_sync_mapping;
DROP POLICY IF EXISTS "event_sync_mapping_update_own" ON event_sync_mapping;
DROP POLICY IF EXISTS "event_sync_mapping_delete_own" ON event_sync_mapping;

CREATE POLICY "event_sync_mapping_select_own" ON event_sync_mapping FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = event_sync_mapping.user_id) OR is_admin(auth.uid()));

CREATE POLICY "event_sync_mapping_insert_own" ON event_sync_mapping FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = event_sync_mapping.user_id) OR is_admin(auth.uid()));

CREATE POLICY "event_sync_mapping_update_own" ON event_sync_mapping FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = event_sync_mapping.user_id) OR is_admin(auth.uid()));

CREATE POLICY "event_sync_mapping_delete_own" ON event_sync_mapping FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = event_sync_mapping.user_id) OR is_admin(auth.uid()));

-- 5. GOOGLE_CALENDAR_INTEGRATION TABLE
ALTER TABLE google_calendar_integration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "google_calendar_integration_select_own" ON google_calendar_integration;
DROP POLICY IF EXISTS "google_calendar_integration_insert_own" ON google_calendar_integration;
DROP POLICY IF EXISTS "google_calendar_integration_update_own" ON google_calendar_integration;
DROP POLICY IF EXISTS "google_calendar_integration_delete_own" ON google_calendar_integration;

CREATE POLICY "google_calendar_integration_select_own" ON google_calendar_integration FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = google_calendar_integration.user_id) OR is_admin(auth.uid()));

CREATE POLICY "google_calendar_integration_insert_own" ON google_calendar_integration FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = google_calendar_integration.user_id) OR is_admin(auth.uid()));

CREATE POLICY "google_calendar_integration_update_own" ON google_calendar_integration FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = google_calendar_integration.user_id) OR is_admin(auth.uid()));

CREATE POLICY "google_calendar_integration_delete_own" ON google_calendar_integration FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = google_calendar_integration.user_id) OR is_admin(auth.uid()));

-- 6. MESSAGE_NOTIFICATIONS TABLE
ALTER TABLE message_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_notifications_select_own" ON message_notifications;
DROP POLICY IF EXISTS "message_notifications_insert_own" ON message_notifications;
DROP POLICY IF EXISTS "message_notifications_update_own" ON message_notifications;
DROP POLICY IF EXISTS "message_notifications_delete_own" ON message_notifications;

CREATE POLICY "message_notifications_select_own" ON message_notifications FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = message_notifications.user_id) OR is_admin(auth.uid()));

CREATE POLICY "message_notifications_insert_own" ON message_notifications FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = message_notifications.user_id) OR is_admin(auth.uid()));

CREATE POLICY "message_notifications_update_own" ON message_notifications FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = message_notifications.user_id) OR is_admin(auth.uid()));

CREATE POLICY "message_notifications_delete_own" ON message_notifications FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = message_notifications.user_id) OR is_admin(auth.uid()));

-- 7. TRIAL_USAGE_TRACKING TABLE
ALTER TABLE trial_usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trial_usage_tracking_select_own" ON trial_usage_tracking;
DROP POLICY IF EXISTS "trial_usage_tracking_insert_own" ON trial_usage_tracking;
DROP POLICY IF EXISTS "trial_usage_tracking_update_own" ON trial_usage_tracking;
DROP POLICY IF EXISTS "trial_usage_tracking_delete_own" ON trial_usage_tracking;

CREATE POLICY "trial_usage_tracking_select_own" ON trial_usage_tracking FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = trial_usage_tracking.user_id) OR is_admin(auth.uid()));

CREATE POLICY "trial_usage_tracking_insert_own" ON trial_usage_tracking FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = trial_usage_tracking.user_id) OR is_admin(auth.uid()));

CREATE POLICY "trial_usage_tracking_update_own" ON trial_usage_tracking FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = trial_usage_tracking.user_id) OR is_admin(auth.uid()));

CREATE POLICY "trial_usage_tracking_delete_own" ON trial_usage_tracking FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = trial_usage_tracking.user_id) OR is_admin(auth.uid()));

-- 8. UNPARSEABLE_MESSAGES TABLE
ALTER TABLE unparseable_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unparseable_messages_select_own" ON unparseable_messages;
DROP POLICY IF EXISTS "unparseable_messages_insert_own" ON unparseable_messages;
DROP POLICY IF EXISTS "unparseable_messages_update_own" ON unparseable_messages;
DROP POLICY IF EXISTS "unparseable_messages_delete_own" ON unparseable_messages;

CREATE POLICY "unparseable_messages_select_own" ON unparseable_messages FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = unparseable_messages.user_id) OR is_admin(auth.uid()));

CREATE POLICY "unparseable_messages_insert_own" ON unparseable_messages FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = unparseable_messages.user_id) OR is_admin(auth.uid()));

CREATE POLICY "unparseable_messages_update_own" ON unparseable_messages FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = unparseable_messages.user_id) OR is_admin(auth.uid()));

CREATE POLICY "unparseable_messages_delete_own" ON unparseable_messages FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = unparseable_messages.user_id) OR is_admin(auth.uid()));

-- 9. SUPPORT_TICKETS TABLE
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_select_own" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_own" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_own_or_assigned" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete_own" ON support_tickets;

CREATE POLICY "support_tickets_select_own" ON support_tickets FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = support_tickets.user_id)
  OR EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = support_tickets.assigned_to_user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "support_tickets_insert_own" ON support_tickets FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = support_tickets.user_id) OR is_admin(auth.uid()));

CREATE POLICY "support_tickets_update_own_or_assigned" ON support_tickets FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = support_tickets.user_id)
  OR EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = support_tickets.assigned_to_user_id)
  OR is_admin(auth.uid())
);

CREATE POLICY "support_tickets_delete_own" ON support_tickets FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = support_tickets.user_id) OR is_admin(auth.uid()));

-- 10. USER_LOGIN_HISTORY TABLE
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_login_history_select_own" ON user_login_history;
DROP POLICY IF EXISTS "user_login_history_insert_own" ON user_login_history;

CREATE POLICY "user_login_history_select_own" ON user_login_history FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_login_history.user_id) OR is_admin(auth.uid()));

CREATE POLICY "user_login_history_insert_own" ON user_login_history FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_login_history.user_id) OR is_admin(auth.uid()));

-- 11. USER_MESSAGES TABLE (special case: from/to user)
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_messages_select_own" ON user_messages;
DROP POLICY IF EXISTS "user_messages_insert_own" ON user_messages;
DROP POLICY IF EXISTS "user_messages_update_own" ON user_messages;

CREATE POLICY "user_messages_select_own" ON user_messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND (u.id = user_messages.from_user_id OR u.id = user_messages.to_user_id))
  OR user_messages.to_user_id IS NULL -- Broadcast messages
  OR is_admin(auth.uid())
);

CREATE POLICY "user_messages_insert_own" ON user_messages FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_messages.from_user_id) OR is_admin(auth.uid()));

CREATE POLICY "user_messages_update_own" ON user_messages FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_messages.to_user_id) OR is_admin(auth.uid()));

-- 12. USER_SECURITY_STATUS TABLE
ALTER TABLE user_security_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_security_status_select_own" ON user_security_status;
DROP POLICY IF EXISTS "user_security_status_insert_admin" ON user_security_status;
DROP POLICY IF EXISTS "user_security_status_update_admin" ON user_security_status;

-- Users can view their own security status, admins can view all
CREATE POLICY "user_security_status_select_own" ON user_security_status FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_security_status.user_id) OR is_admin(auth.uid()));

-- Only admins can insert/update security status
CREATE POLICY "user_security_status_insert_admin" ON user_security_status FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "user_security_status_update_admin" ON user_security_status FOR UPDATE
USING (is_admin(auth.uid()));

-- 13. USER_ACTIVITY TABLE
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_activity_select_own" ON user_activity;
DROP POLICY IF EXISTS "user_activity_insert_own" ON user_activity;

CREATE POLICY "user_activity_select_own" ON user_activity FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_activity.user_id) OR is_admin(auth.uid()));

CREATE POLICY "user_activity_insert_own" ON user_activity FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_activity.user_id) OR is_admin(auth.uid()));

-- 14. BOOKING_CONFLICTS TABLE
ALTER TABLE booking_conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_conflicts_select_own" ON booking_conflicts;
DROP POLICY IF EXISTS "booking_conflicts_insert_own" ON booking_conflicts;
DROP POLICY IF EXISTS "booking_conflicts_update_own" ON booking_conflicts;
DROP POLICY IF EXISTS "booking_conflicts_delete_own" ON booking_conflicts;

CREATE POLICY "booking_conflicts_select_own" ON booking_conflicts FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_conflicts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "booking_conflicts_insert_own" ON booking_conflicts FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_conflicts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "booking_conflicts_update_own" ON booking_conflicts FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_conflicts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "booking_conflicts_delete_own" ON booking_conflicts FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_conflicts.user_id) OR is_admin(auth.uid()));

-- 15. CONFLICT_RESOLUTIONS TABLE
ALTER TABLE conflict_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conflict_resolutions_select_own" ON conflict_resolutions;
DROP POLICY IF EXISTS "conflict_resolutions_insert_own" ON conflict_resolutions;
DROP POLICY IF EXISTS "conflict_resolutions_update_own" ON conflict_resolutions;

CREATE POLICY "conflict_resolutions_select_own" ON conflict_resolutions FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = conflict_resolutions.user_id) OR is_admin(auth.uid()));

CREATE POLICY "conflict_resolutions_insert_own" ON conflict_resolutions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = conflict_resolutions.user_id) OR is_admin(auth.uid()));

CREATE POLICY "conflict_resolutions_update_own" ON conflict_resolutions FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = conflict_resolutions.user_id) OR is_admin(auth.uid()));

-- 16. IMPORTED_CONTRACTS TABLE
ALTER TABLE imported_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imported_contracts_select_own" ON imported_contracts;
DROP POLICY IF EXISTS "imported_contracts_insert_own" ON imported_contracts;
DROP POLICY IF EXISTS "imported_contracts_update_own" ON imported_contracts;
DROP POLICY IF EXISTS "imported_contracts_delete_own" ON imported_contracts;

CREATE POLICY "imported_contracts_select_own" ON imported_contracts FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = imported_contracts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "imported_contracts_insert_own" ON imported_contracts FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = imported_contracts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "imported_contracts_update_own" ON imported_contracts FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = imported_contracts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "imported_contracts_delete_own" ON imported_contracts FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = imported_contracts.user_id) OR is_admin(auth.uid()));

-- 17. API_USAGE_TRACKING TABLE
ALTER TABLE api_usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_usage_tracking_select_own" ON api_usage_tracking;
DROP POLICY IF EXISTS "api_usage_tracking_insert_own" ON api_usage_tracking;

CREATE POLICY "api_usage_tracking_select_own" ON api_usage_tracking FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = api_usage_tracking.user_id) OR is_admin(auth.uid()));

CREATE POLICY "api_usage_tracking_insert_own" ON api_usage_tracking FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = api_usage_tracking.user_id) OR is_admin(auth.uid()));

-- 18. API_USAGE_STATS TABLE
ALTER TABLE api_usage_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_usage_stats_select_own" ON api_usage_stats;
DROP POLICY IF EXISTS "api_usage_stats_insert_own" ON api_usage_stats;
DROP POLICY IF EXISTS "api_usage_stats_update_own" ON api_usage_stats;

CREATE POLICY "api_usage_stats_select_own" ON api_usage_stats FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = api_usage_stats.user_id) OR is_admin(auth.uid()));

CREATE POLICY "api_usage_stats_insert_own" ON api_usage_stats FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = api_usage_stats.user_id) OR is_admin(auth.uid()));

CREATE POLICY "api_usage_stats_update_own" ON api_usage_stats FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = api_usage_stats.user_id) OR is_admin(auth.uid()));

-- 19. CONTRACT_EXTRACTIONS TABLE
ALTER TABLE contract_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_extractions_select_own" ON contract_extractions;
DROP POLICY IF EXISTS "contract_extractions_insert_own" ON contract_extractions;
DROP POLICY IF EXISTS "contract_extractions_update_own" ON contract_extractions;

CREATE POLICY "contract_extractions_select_own" ON contract_extractions FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extractions.user_id) OR is_admin(auth.uid()));

CREATE POLICY "contract_extractions_insert_own" ON contract_extractions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extractions.user_id) OR is_admin(auth.uid()));

CREATE POLICY "contract_extractions_update_own" ON contract_extractions FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extractions.user_id) OR is_admin(auth.uid()));

-- ===================================================================
-- SECTION 2: Admin-only tables
-- Tables that only admins should access
-- ===================================================================

-- 20. BETA_INVITE_CODES TABLE (Admin only)
ALTER TABLE beta_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beta_invite_codes_admin_all" ON beta_invite_codes;

CREATE POLICY "beta_invite_codes_admin_all" ON beta_invite_codes FOR ALL
USING (is_admin(auth.uid()));

-- 21. BETA_INVITES TABLE (Admin only)
ALTER TABLE beta_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beta_invites_admin_all" ON beta_invites;

CREATE POLICY "beta_invites_admin_all" ON beta_invites FOR ALL
USING (is_admin(auth.uid()));

-- 22. BETA_EMAIL_TEMPLATES TABLE (Admin only)
ALTER TABLE beta_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beta_email_templates_admin_all" ON beta_email_templates;

CREATE POLICY "beta_email_templates_admin_all" ON beta_email_templates FOR ALL
USING (is_admin(auth.uid()));

-- 23. FRAUD_PREVENTION_LOG TABLE (Admin only - no user_id field)
ALTER TABLE fraud_prevention_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fraud_prevention_log_admin_all" ON fraud_prevention_log;

CREATE POLICY "fraud_prevention_log_admin_all" ON fraud_prevention_log FOR ALL
USING (is_admin(auth.uid()));

-- ===================================================================
-- SECTION 3: Special case tables
-- Tables with unique access patterns
-- ===================================================================

-- 24. SESSIONS TABLE (session-based access, used by Express session store)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_all_authenticated" ON sessions;

-- Allow authenticated users to manage their own sessions
-- Note: This is tricky because sessions table doesn't have user_id
-- We need to allow the service role to manage all sessions
CREATE POLICY "sessions_all_authenticated" ON sessions FOR ALL
USING (auth.role() = 'authenticated' OR is_admin(auth.uid()));

-- 25. INSTRUMENT_MAPPINGS TABLE (read-only for all authenticated users)
ALTER TABLE instrument_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instrument_mappings_select_all" ON instrument_mappings;
DROP POLICY IF EXISTS "instrument_mappings_insert_admin" ON instrument_mappings;
DROP POLICY IF EXISTS "instrument_mappings_update_admin" ON instrument_mappings;

-- All authenticated users can read instrument mappings
CREATE POLICY "instrument_mappings_select_all" ON instrument_mappings FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins can insert/update
CREATE POLICY "instrument_mappings_insert_admin" ON instrument_mappings FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "instrument_mappings_update_admin" ON instrument_mappings FOR UPDATE
USING (is_admin(auth.uid()));

-- 26. CONTRACT_EXTRACTION_PATTERNS TABLE (read global, write own)
ALTER TABLE contract_extraction_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_extraction_patterns_select_own_or_global" ON contract_extraction_patterns;
DROP POLICY IF EXISTS "contract_extraction_patterns_insert_own" ON contract_extraction_patterns;
DROP POLICY IF EXISTS "contract_extraction_patterns_update_own" ON contract_extraction_patterns;

-- Users can see their own patterns or global patterns
CREATE POLICY "contract_extraction_patterns_select_own_or_global" ON contract_extraction_patterns FOR SELECT
USING (
  contract_extraction_patterns.is_global = true
  OR EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extraction_patterns.created_by)
  OR is_admin(auth.uid())
);

-- Users can only insert their own patterns (admins can make them global)
CREATE POLICY "contract_extraction_patterns_insert_own" ON contract_extraction_patterns FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extraction_patterns.created_by)
  OR is_admin(auth.uid())
);

-- Users can only update their own patterns
CREATE POLICY "contract_extraction_patterns_update_own" ON contract_extraction_patterns FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extraction_patterns.created_by)
  OR is_admin(auth.uid())
);

-- ===================================================================
-- SECTION 4: Pre-signup data tables (no RLS needed but enable for security)
-- Tables that store data before user accounts are created
-- ===================================================================

-- 27. SMS_VERIFICATIONS TABLE (pre-signup data, restrict to service role)
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_verifications_service_role_only" ON sms_verifications;

-- Only service role (backend) can access this table
CREATE POLICY "sms_verifications_service_role_only" ON sms_verifications FOR ALL
USING (is_admin(auth.uid()));

-- 28. PHONE_VERIFICATIONS TABLE (pre-signup data, restrict to service role)
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phone_verifications_service_role_only" ON phone_verifications;

-- Only service role (backend) can access this table
CREATE POLICY "phone_verifications_service_role_only" ON phone_verifications FOR ALL
USING (is_admin(auth.uid()));

-- ===================================================================
-- VERIFICATION QUERY
-- ===================================================================

-- Check which tables now have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'beta_invite_codes', 'beta_invites', 'clients', 'contract_extractions',
    'email_templates', 'contract_extraction_patterns', 'feedback',
    'fraud_prevention_log', 'event_sync_mapping', 'google_calendar_integration',
    'instrument_mappings', 'phone_verifications', 'sessions',
    'message_notifications', 'sms_verifications', 'trial_usage_tracking',
    'unparseable_messages', 'support_tickets', 'user_login_history',
    'user_messages', 'user_security_status', 'user_activity',
    'booking_conflicts', 'conflict_resolutions', 'imported_contracts',
    'beta_email_templates', 'api_usage_tracking', 'api_usage_stats'
  )
ORDER BY tablename;

-- Success message
SELECT 'RLS policies created successfully for all 28 tables!' as status;
