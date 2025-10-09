-- ===================================================================
-- RLS FIX: unparseable_messages table
-- This table was missing from the initial 17-table RLS fix
-- ===================================================================

-- Enable RLS on unparseable_messages table
ALTER TABLE unparseable_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "unparseable_messages_select_own" ON unparseable_messages;
DROP POLICY IF EXISTS "unparseable_messages_insert_own" ON unparseable_messages;
DROP POLICY IF EXISTS "unparseable_messages_update_own" ON unparseable_messages;
DROP POLICY IF EXISTS "unparseable_messages_delete_own" ON unparseable_messages;

-- SELECT: Users can view their own unparseable messages, admins can view all
CREATE POLICY "unparseable_messages_select_own" ON unparseable_messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = unparseable_messages.user_id)
  OR is_admin(auth.uid())
);

-- INSERT: Users can create their own unparseable messages (via webhook), admins can create any
CREATE POLICY "unparseable_messages_insert_own" ON unparseable_messages FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = unparseable_messages.user_id)
  OR is_admin(auth.uid())
);

-- UPDATE: Users can update their own unparseable messages, admins can update any
CREATE POLICY "unparseable_messages_update_own" ON unparseable_messages FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = unparseable_messages.user_id)
  OR is_admin(auth.uid())
);

-- DELETE: Users can delete their own unparseable messages, admins can delete any
CREATE POLICY "unparseable_messages_delete_own" ON unparseable_messages FOR DELETE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = unparseable_messages.user_id)
  OR is_admin(auth.uid())
);

-- Verify
SELECT 'RLS policies created for unparseable_messages!' as status;

-- Check that RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'unparseable_messages';
