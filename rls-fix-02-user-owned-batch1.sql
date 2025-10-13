-- Step 2: User-owned tables (Batch 1 of 4)
-- CLIENTS TABLE
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

-- EMAIL_TEMPLATES TABLE
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

-- FEEDBACK TABLE
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

-- EVENT_SYNC_MAPPING TABLE
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

-- GOOGLE_CALENDAR_INTEGRATION TABLE
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

SELECT 'Batch 1 completed: 5 tables secured!' as status;
