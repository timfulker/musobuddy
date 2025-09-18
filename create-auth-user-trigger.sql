-- Create trigger to automatically create user in main database when Supabase Auth user is created
-- This should be run in the Supabase SQL Editor

-- First, create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    supabase_uid,
    password_hash,
    is_admin,
    has_paid,
    trial_ends_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.id,
    'supabase_managed', -- Placeholder since Supabase handles auth
    COALESCE((NEW.raw_user_meta_data->>'isAdmin')::boolean, false),
    false,
    NOW() + INTERVAL '14 days', -- 14-day trial
    NOW(),
    NOW()
  );

  -- Also create default user settings
  INSERT INTO public.user_settings (
    user_id,
    business_name,
    theme_accent_color,
    theme_show_terms,
    created_at,
    updated_at
  )
  SELECT
    id,
    first_name || ' ' || last_name || ' Music',
    '#3b82f6',
    true,
    NOW(),
    NOW()
  FROM public.users
  WHERE supabase_uid = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- Test the trigger by showing its status
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';