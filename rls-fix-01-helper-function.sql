-- Step 1: Create the helper function
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean AS $$
  SELECT COALESCE((SELECT is_admin FROM users WHERE supabase_uid = uid::text), false)
$$ LANGUAGE sql STABLE;

SELECT 'Helper function created successfully!' as status;
