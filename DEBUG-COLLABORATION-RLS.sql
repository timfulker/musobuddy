-- DEBUG: Check collaboration token and RLS setup

-- 1. Check if booking 108 exists and has a collaboration token
SELECT
  id,
  client_name,
  collaboration_token IS NOT NULL as has_token,
  LEFT(collaboration_token, 16) as token_preview,
  collaboration_token_generated_at,
  user_id
FROM bookings
WHERE id = 108;

-- 2. Check if service role can access the booking (bypasses RLS)
-- This simulates what your backend does
SELECT
  id,
  client_name,
  venue,
  event_date
FROM bookings
WHERE id = 108;
-- If this returns data, service role works

-- 3. Check current RLS policies on bookings table
SELECT
  policyname,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'bookings';

-- 4. Test if a regular user could access booking 108 (should be blocked)
-- This simulates direct client access (should fail)
SET ROLE authenticated;
SET request.jwt.claims.sub TO 'some-random-uid';
SELECT id, client_name FROM bookings WHERE id = 108;
RESET ROLE;
-- Expected: Should return nothing (RLS blocks it)

-- 5. Check if there are any RLS issues with the bookings table
SELECT
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'bookings') as policy_count
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'bookings';
