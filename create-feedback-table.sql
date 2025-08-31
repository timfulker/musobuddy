-- Create feedback table for beta tester feedback system
-- Run this to create the feedback table if it doesn't exist

CREATE TABLE IF NOT EXISTS feedback (
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

-- Check if table was created successfully
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'feedback' 
ORDER BY ordinal_position;