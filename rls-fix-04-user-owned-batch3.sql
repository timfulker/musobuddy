-- Step 4: User-owned tables (Batch 3 of 4)

-- USER_MESSAGES TABLE
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_messages_select_own" ON user_messages;
DROP POLICY IF EXISTS "user_messages_insert_own" ON user_messages;
DROP POLICY IF EXISTS "user_messages_update_own" ON user_messages;

CREATE POLICY "user_messages_select_own" ON user_messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND (u.id = user_messages.from_user_id OR u.id = user_messages.to_user_id))
  OR user_messages.to_user_id IS NULL
  OR is_admin(auth.uid())
);

CREATE POLICY "user_messages_insert_own" ON user_messages FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_messages.from_user_id) OR is_admin(auth.uid()));

CREATE POLICY "user_messages_update_own" ON user_messages FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_messages.to_user_id) OR is_admin(auth.uid()));

-- USER_SECURITY_STATUS TABLE
ALTER TABLE user_security_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_security_status_select_own" ON user_security_status;
DROP POLICY IF EXISTS "user_security_status_insert_admin" ON user_security_status;
DROP POLICY IF EXISTS "user_security_status_update_admin" ON user_security_status;

CREATE POLICY "user_security_status_select_own" ON user_security_status FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_security_status.user_id) OR is_admin(auth.uid()));

CREATE POLICY "user_security_status_insert_admin" ON user_security_status FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "user_security_status_update_admin" ON user_security_status FOR UPDATE
USING (is_admin(auth.uid()));

-- USER_ACTIVITY TABLE
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_activity_select_own" ON user_activity;
DROP POLICY IF EXISTS "user_activity_insert_own" ON user_activity;

CREATE POLICY "user_activity_select_own" ON user_activity FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_activity.user_id) OR is_admin(auth.uid()));

CREATE POLICY "user_activity_insert_own" ON user_activity FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_activity.user_id) OR is_admin(auth.uid()));

-- BOOKING_CONFLICTS TABLE
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

-- CONFLICT_RESOLUTIONS TABLE
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

SELECT 'Batch 3 completed: 5 more tables secured!' as status;
