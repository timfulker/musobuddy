-- PRODUCTION FIX: Create trigger to automatically create user in public.users when Supabase Auth user is created
-- Run this in Supabase SQL Editor for production database
-- This fixes the "Database error saving new user" error during signup

-- First, drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new user into public.users
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    supabase_uid,
    is_admin,
    is_active,
    has_paid,
    trial_ends_at,
    onboarding_completed,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', NEW.raw_user_meta_data->>'last_name', ''),
    NEW.id,
    false,
    true,
    false,
    NOW() + INTERVAL '14 days', -- 14-day trial
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    supabase_uid = NEW.id,
    updated_at = NOW()
  WHERE users.supabase_uid IS NULL; -- Only update if no supabase_uid exists

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- Verify the trigger was created
SELECT
  'Trigger created successfully' as status,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Also check if any users are missing from public.users
SELECT
  COUNT(*) as orphaned_auth_users,
  'These auth users have no corresponding public.users record' as description
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.supabase_uid
WHERE pu.supabase_uid IS NULL;