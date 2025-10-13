-- Step 3: User-owned tables (Batch 2 of 4)

-- MESSAGE_NOTIFICATIONS TABLE
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

-- TRIAL_USAGE_TRACKING TABLE
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

-- UNPARSEABLE_MESSAGES TABLE
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

-- SUPPORT_TICKETS TABLE
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

-- USER_LOGIN_HISTORY TABLE
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_login_history_select_own" ON user_login_history;
DROP POLICY IF EXISTS "user_login_history_insert_own" ON user_login_history;

CREATE POLICY "user_login_history_select_own" ON user_login_history FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_login_history.user_id) OR is_admin(auth.uid()));

CREATE POLICY "user_login_history_insert_own" ON user_login_history FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_login_history.user_id) OR is_admin(auth.uid()));

SELECT 'Batch 2 completed: 5 more tables secured!' as status;
