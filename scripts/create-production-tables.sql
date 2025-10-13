-- Production Database Schema Setup
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  firebase_uid TEXT,
  supabase_uid UUID REFERENCES auth.users(id),
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- 2. Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  theme TEXT DEFAULT 'light',
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  calendar_sync BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user_settings table
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 3. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for users table
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = supabase_uid);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = supabase_uid);

-- 5. Create RLS policies for user_settings table
CREATE POLICY "Users can view own settings"
ON user_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = user_settings.user_id
    AND users.supabase_uid = auth.uid()
  )
);

CREATE POLICY "Users can update own settings"
ON user_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = user_settings.user_id
    AND users.supabase_uid = auth.uid()
  )
);

CREATE POLICY "Users can insert own settings"
ON user_settings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.user_id = user_settings.user_id
    AND users.supabase_uid = auth.uid()
  )
);

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON user_settings TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;