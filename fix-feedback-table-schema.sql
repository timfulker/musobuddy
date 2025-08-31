-- Fix feedback table schema - the id column was created as TEXT instead of SERIAL
-- This script will drop and recreate the table with correct schema

-- First, check if there's any existing data
SELECT COUNT(*) as existing_rows FROM feedback;

-- Drop the existing table (it was created incorrectly)
DROP TABLE IF EXISTS feedback;

-- Create the table with correct schema matching Drizzle definition
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  page VARCHAR,
  admin_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Verify the table was created correctly
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'feedback' 
ORDER BY ordinal_position;

-- Test that SERIAL is working
SELECT 
    'feedback_id_seq'::regclass as sequence_exists,
    nextval('feedback_id_seq') as next_id_value;

-- Reset the sequence just in case
SELECT setval('feedback_id_seq', 1, false);