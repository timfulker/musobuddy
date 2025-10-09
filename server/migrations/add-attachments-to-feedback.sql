-- Add attachments column to feedback table
-- This column stores an array of attachment URLs as JSON

ALTER TABLE feedback
ADD COLUMN IF NOT EXISTS attachments jsonb;

-- Add comment for documentation
COMMENT ON COLUMN feedback.attachments IS 'Array of attachment URLs uploaded with feedback';
