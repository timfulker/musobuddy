-- Migration: Add inbound email log table
-- This table tracks all emails received via SendGrid Inbound Parse webhooks

CREATE TABLE IF NOT EXISTS inbound_email_log (
  id SERIAL PRIMARY KEY,
  webhook_type VARCHAR NOT NULL,
  from_email VARCHAR NOT NULL,
  from_name VARCHAR,
  to_email VARCHAR NOT NULL,
  subject TEXT,
  text_content TEXT,
  html_content TEXT,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  booking_id INTEGER,
  attachment_count INTEGER DEFAULT 0,
  attachment_names JSONB,
  raw_headers JSONB,
  spam_score DECIMAL(5, 2),
  processing_status VARCHAR DEFAULT 'received',
  error_message TEXT,
  received_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inbound_email_log_from_email ON inbound_email_log(from_email);
CREATE INDEX IF NOT EXISTS idx_inbound_email_log_to_email ON inbound_email_log(to_email);
CREATE INDEX IF NOT EXISTS idx_inbound_email_log_user_id ON inbound_email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_inbound_email_log_booking_id ON inbound_email_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_inbound_email_log_received_at ON inbound_email_log(received_at);
CREATE INDEX IF NOT EXISTS idx_inbound_email_log_webhook_type ON inbound_email_log(webhook_type);

COMMENT ON TABLE inbound_email_log IS 'Logs all inbound emails received via SendGrid Inbound Parse webhooks';
COMMENT ON COLUMN inbound_email_log.webhook_type IS 'Type of webhook: enquiries or replies';
COMMENT ON COLUMN inbound_email_log.processing_status IS 'Status: received, processed, or failed';
