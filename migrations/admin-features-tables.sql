-- Migration: Add beta email templates and API usage tracking tables
-- Date: 2025-10-05
-- Description: Creates tables for beta email template management and API usage tracking in admin panel

-- Beta Email Templates Table
CREATE TABLE IF NOT EXISTS beta_email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  subject VARCHAR NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API Usage Tracking Table
CREATE TABLE IF NOT EXISTS api_usage_tracking (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service VARCHAR NOT NULL,
  endpoint VARCHAR,
  request_count INTEGER DEFAULT 1,
  tokens_used INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10, 6) DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- API Usage Stats Table (aggregated per user)
CREATE TABLE IF NOT EXISTS api_usage_stats (
  user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_requests INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0,
  last_activity TIMESTAMP,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  risk_score INTEGER DEFAULT 0,
  service_breakdown JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_tracking_user_id ON api_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_tracking_timestamp ON api_usage_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_tracking_service ON api_usage_tracking(service);
CREATE INDEX IF NOT EXISTS idx_beta_email_templates_active ON beta_email_templates(is_active) WHERE is_active = true;

-- Comments for documentation
COMMENT ON TABLE beta_email_templates IS 'Stores customizable email templates for beta invitations';
COMMENT ON TABLE api_usage_tracking IS 'Tracks individual API calls made by users for cost monitoring';
COMMENT ON TABLE api_usage_stats IS 'Aggregated API usage statistics per user for admin dashboard';

-- Grant permissions (adjust if needed based on your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON beta_email_templates TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON api_usage_tracking TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON api_usage_stats TO your_app_user;
