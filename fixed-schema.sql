-- Fixed Schema - Matching existing Supabase UUID types
-- Only creates missing tables with correct data types

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. SMS Verification table (user_id as UUID to match existing users table)
CREATE TABLE IF NOT EXISTS sms_verifications (
  id SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  phone_number VARCHAR NOT NULL,
  password VARCHAR NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Security monitoring (user_id as UUID)
CREATE TABLE IF NOT EXISTS security_monitoring (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_service VARCHAR(50) NOT NULL,
  endpoint VARCHAR(100),
  request_count INTEGER DEFAULT 1,
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  ip_address VARCHAR,
  user_agent TEXT,
  suspicious BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. User security status (user_id as UUID)
CREATE TABLE IF NOT EXISTS user_security_status (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  risk_score INTEGER DEFAULT 0,
  last_review_at TIMESTAMP,
  blocked_at TIMESTAMP,
  blocked_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. User activity tracking (user_id as UUID)
CREATE TABLE IF NOT EXISTS user_activity (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  details JSONB,
  ip_address VARCHAR,
  user_agent TEXT,
  session_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. User login history (user_id as UUID)
CREATE TABLE IF NOT EXISTS user_login_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR,
  user_agent TEXT,
  login_time TIMESTAMP DEFAULT NOW(),
  logout_time TIMESTAMP,
  session_duration INTEGER,
  successful BOOLEAN DEFAULT true,
  failure_reason VARCHAR
);

-- 8. User messages (user_id as UUID)
CREATE TABLE IF NOT EXISTS user_messages (
  id SERIAL PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR NOT NULL DEFAULT 'announcement',
  priority VARCHAR DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Support tickets (user_id as UUID)
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES users(id),
  subject VARCHAR NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR DEFAULT 'general',
  priority VARCHAR DEFAULT 'medium',
  status VARCHAR DEFAULT 'open',
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- 10. User audit logs (user_id as UUID)
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES users(id),
  action VARCHAR NOT NULL,
  entity_type VARCHAR,
  entity_id VARCHAR,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Blocked dates (user_id as UUID)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR,
  color VARCHAR(7) DEFAULT '#ef4444',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. Trial usage tracking (user_id as UUID)
CREATE TABLE IF NOT EXISTS trial_usage_tracking (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_used VARCHAR(100),
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP DEFAULT NOW(),
  session_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 15. Bookings table (user_id as UUID)
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name VARCHAR NOT NULL,
  client_email VARCHAR,
  client_phone VARCHAR,
  client_address TEXT,
  event_date TIMESTAMP,
  event_time VARCHAR,
  event_end_time VARCHAR,
  performance_duration TEXT,
  venue VARCHAR,
  venue_address TEXT,
  venue_contact_info TEXT,
  what3words VARCHAR,
  gig_type VARCHAR,
  event_type VARCHAR,
  fee DECIMAL(10,2),
  final_amount DECIMAL(10,2),
  travel_expense DECIMAL(10,2) DEFAULT 0.00,
  deposit_amount DECIMAL(10,2),
  equipment_requirements TEXT,
  special_requirements TEXT,
  equipment_provided TEXT,
  whats_included TEXT,
  dress_code VARCHAR,
  styles TEXT,
  style_mood VARCHAR,
  must_play_songs TEXT,
  avoid_songs TEXT,
  set_order VARCHAR,
  first_dance_song VARCHAR,
  processional_song VARCHAR,
  signing_register_song VARCHAR,
  recessional_song VARCHAR,
  special_dedications TEXT,
  reference_tracks TEXT,
  encore_allowed BOOLEAN DEFAULT false,
  encore_suggestions TEXT,
  contact_person VARCHAR,
  contact_phone VARCHAR,
  venue_contact TEXT,
  sound_tech_contact TEXT,
  stage_size VARCHAR,
  power_equipment TEXT,
  sound_check_time TEXT,
  load_in_info TEXT,
  parking_info TEXT,
  parking_permit_required BOOLEAN DEFAULT false,
  weather_contingency TEXT,
  meal_provided BOOLEAN DEFAULT false,
  dietary_requirements TEXT,
  guest_announcements TEXT,
  photo_permission BOOLEAN DEFAULT false,
  status VARCHAR NOT NULL DEFAULT 'new',
  workflow_stage VARCHAR NOT NULL DEFAULT 'initial',
  response_needed BOOLEAN DEFAULT true,
  last_contacted_at TIMESTAMP,
  has_conflicts BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  conflict_count INTEGER DEFAULT 0,
  conflict_details TEXT,
  contract_sent BOOLEAN DEFAULT false,
  contract_signed BOOLEAN DEFAULT false,
  invoice_sent BOOLEAN DEFAULT false,
  paid_in_full BOOLEAN DEFAULT false,
  deposit_paid BOOLEAN DEFAULT false,
  quoted_amount DECIMAL(10,2),
  uploaded_documents JSONB DEFAULT '[]',
  notes TEXT,
  shared_notes TEXT,
  field_locks JSONB DEFAULT '{}',
  collaboration_token VARCHAR UNIQUE,
  collaboration_token_generated_at TIMESTAMP,
  distance TEXT,
  distance_value INTEGER,
  duration TEXT,
  email_hash VARCHAR UNIQUE,
  processed_at TIMESTAMP,
  document_url TEXT,
  document_key TEXT,
  document_name TEXT,
  document_uploaded_at TIMESTAMP,
  map_static_url TEXT,
  map_latitude DECIMAL(10,7),
  map_longitude DECIMAL(10,7),
  original_email_content TEXT,
  apply_now_link VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Continue with remaining tables using UUID for user_id references...
-- 16. Contracts table (user_id as UUID)
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id),
  contract_number VARCHAR NOT NULL UNIQUE,
  client_name VARCHAR NOT NULL,
  client_address TEXT,
  client_phone VARCHAR,
  client_email VARCHAR,
  venue VARCHAR,
  venue_address TEXT,
  event_date TIMESTAMP NOT NULL,
  event_time VARCHAR,
  event_end_time VARCHAR,
  performance_duration VARCHAR,
  fee DECIMAL(10,2) NOT NULL,
  deposit DECIMAL(10,2) DEFAULT 0.00,
  deposit_days INTEGER DEFAULT 7,
  travel_expenses VARCHAR,
  original_fee VARCHAR,
  original_travel_expenses VARCHAR,
  payment_instructions TEXT,
  equipment_requirements TEXT,
  special_requirements TEXT,
  client_fillable_fields TEXT,
  status VARCHAR NOT NULL DEFAULT 'draft',
  template VARCHAR NOT NULL DEFAULT 'professional',
  signed_at TIMESTAMP,
  superseded_by INTEGER,
  original_contract_id INTEGER,
  cloud_storage_url TEXT,
  cloud_storage_key TEXT,
  signing_page_url TEXT,
  signing_page_key TEXT,
  signing_url_created_at TIMESTAMP,
  client_signature TEXT,
  client_ip_address VARCHAR,
  venue_contact TEXT,
  sound_tech_contact TEXT,
  stage_size VARCHAR(50),
  power_equipment TEXT,
  dress_code VARCHAR(255),
  style_mood VARCHAR(50),
  must_play_songs TEXT,
  avoid_songs TEXT,
  set_order VARCHAR(50),
  first_dance_song VARCHAR(255),
  processional_song VARCHAR(255),
  signing_register_song VARCHAR(255),
  recessional_song VARCHAR(255),
  special_dedications TEXT,
  guest_announcements TEXT,
  load_in_info TEXT,
  sound_check_time VARCHAR(50),
  weather_contingency TEXT,
  parking_permit_required BOOLEAN DEFAULT false,
  meal_provided BOOLEAN DEFAULT false,
  dietary_requirements TEXT,
  shared_notes TEXT,
  reference_tracks TEXT,
  photo_permission BOOLEAN DEFAULT false,
  encore_allowed BOOLEAN DEFAULT false,
  encore_suggestions VARCHAR(255),
  client_portal_url TEXT,
  client_portal_token TEXT,
  client_portal_qr_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add remaining tables in same pattern...
-- I'll just add the key ones for now to test

-- User settings (user_id as UUID)
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR,
  business_contact_email VARCHAR,
  theme_accent_color VARCHAR DEFAULT '#673ab7',
  theme_show_terms BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_security_user_service ON security_monitoring(user_id, api_service);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_contracts_booking_id ON contracts(booking_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_user ON blocked_dates(user_id);