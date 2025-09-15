-- Complete Safe MusoBuddy Schema - All 37 Tables with IF NOT EXISTS
-- This won't error if tables already exist

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Session storage table
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);

-- 2. Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  is_admin BOOLEAN DEFAULT false,
  is_assigned BOOLEAN DEFAULT false,
  is_beta_tester BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMP,
  has_paid BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  account_notes TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  email_prefix TEXT UNIQUE,
  quick_add_token TEXT UNIQUE,
  widget_url TEXT,
  widget_qr_code TEXT,
  phone_number VARCHAR(20),
  firebase_uid TEXT UNIQUE,
  supabase_uid TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. SMS Verification table
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

-- 4. Security monitoring
CREATE TABLE IF NOT EXISTS security_monitoring (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_service VARCHAR(50) NOT NULL,
  endpoint VARCHAR(100),
  request_count INTEGER DEFAULT 1,
  estimated_cost DECIMAL(10,6) DEFAULT 0,
  ip_address VARCHAR,
  user_agent TEXT,
  suspicious BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. User security status
CREATE TABLE IF NOT EXISTS user_security_status (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  risk_score INTEGER DEFAULT 0,
  last_review_at TIMESTAMP,
  blocked_at TIMESTAMP,
  blocked_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. User activity tracking
CREATE TABLE IF NOT EXISTS user_activity (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  details JSONB,
  ip_address VARCHAR,
  user_agent TEXT,
  session_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. User login history
CREATE TABLE IF NOT EXISTS user_login_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR,
  user_agent TEXT,
  login_time TIMESTAMP DEFAULT NOW(),
  logout_time TIMESTAMP,
  session_duration INTEGER,
  successful BOOLEAN DEFAULT true,
  failure_reason VARCHAR
);

-- 8. User messages
CREATE TABLE IF NOT EXISTS user_messages (
  id SERIAL PRIMARY KEY,
  from_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR NOT NULL DEFAULT 'announcement',
  priority VARCHAR DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_user_id VARCHAR REFERENCES users(id),
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

-- 10. User audit logs
CREATE TABLE IF NOT EXISTS user_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_user_id VARCHAR REFERENCES users(id),
  action VARCHAR NOT NULL,
  entity_type VARCHAR,
  entity_id VARCHAR,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  ip_address VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Blocked dates
CREATE TABLE IF NOT EXISTS blocked_dates (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- 12. Phone verifications
CREATE TABLE IF NOT EXISTS phone_verifications (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  verification_code VARCHAR(6),
  verified_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  ip_address VARCHAR,
  user_agent TEXT
);

-- 13. Fraud prevention log
CREATE TABLE IF NOT EXISTS fraud_prevention_log (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20),
  email_address VARCHAR,
  ip_address VARCHAR,
  device_fingerprint TEXT,
  action_taken VARCHAR(100),
  reason TEXT,
  risk_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 14. Trial usage tracking
CREATE TABLE IF NOT EXISTS trial_usage_tracking (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_used VARCHAR(100),
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP DEFAULT NOW(),
  session_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 15. Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- 16. Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- 17. Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_id INTEGER REFERENCES contracts(id),
  booking_id INTEGER REFERENCES bookings(id),
  invoice_number VARCHAR NOT NULL UNIQUE,
  client_name VARCHAR NOT NULL,
  client_email VARCHAR,
  cc_email VARCHAR,
  client_address VARCHAR,
  venue_address TEXT,
  performance_date TIMESTAMP,
  performance_fee VARCHAR,
  performance_duration TEXT,
  gig_type TEXT,
  invoice_type VARCHAR NOT NULL DEFAULT 'performance',
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  deposit_paid DECIMAL(10,2) DEFAULT 0,
  due_date TIMESTAMP NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMP,
  cloud_storage_url TEXT,
  cloud_storage_key TEXT,
  share_token VARCHAR NOT NULL,
  stripe_payment_link_id TEXT,
  stripe_payment_url TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 18. Booking documents
CREATE TABLE IF NOT EXISTS booking_documents (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR NOT NULL DEFAULT 'other',
  document_name VARCHAR NOT NULL,
  document_url TEXT NOT NULL,
  document_key TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 19. Client communications
CREATE TABLE IF NOT EXISTS client_communications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  client_name VARCHAR NOT NULL,
  client_email VARCHAR NOT NULL,
  communication_type VARCHAR NOT NULL DEFAULT 'email',
  direction VARCHAR NOT NULL DEFAULT 'outbound',
  template_id INTEGER,
  template_name VARCHAR,
  template_category VARCHAR,
  subject TEXT,
  message_body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  sent_at TIMESTAMP DEFAULT NOW(),
  delivery_status VARCHAR DEFAULT 'sent',
  opened_at TIMESTAMP,
  replied_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 20. Compliance documents
CREATE TABLE IF NOT EXISTS compliance_documents (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  expiry_date TIMESTAMP,
  status VARCHAR NOT NULL DEFAULT 'valid',
  document_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 21. User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR,
  business_contact_email VARCHAR,
  address_line_1 VARCHAR,
  address_line_2 VARCHAR,
  city VARCHAR,
  county VARCHAR,
  postcode VARCHAR,
  home_address_line_1 VARCHAR,
  home_address_line_2 VARCHAR,
  home_city VARCHAR,
  home_postcode VARCHAR,
  phone VARCHAR,
  website VARCHAR,
  tax_number VARCHAR,
  bank_details TEXT,
  contract_clauses JSONB DEFAULT '{}',
  custom_clauses JSONB DEFAULT '[]',
  email_from_name VARCHAR,
  invoice_prefix VARCHAR,
  next_invoice_number INTEGER DEFAULT 1,
  booking_display_limit VARCHAR DEFAULT '50',
  primary_instrument VARCHAR,
  secondary_instruments JSONB DEFAULT '[]',
  gig_types TEXT,
  custom_gig_types TEXT,
  theme_accent_color VARCHAR DEFAULT '#673ab7',
  theme_show_terms BOOLEAN DEFAULT true,
  email_signature_text TEXT,
  invoice_payment_terms VARCHAR DEFAULT '7_days_after',
  invoice_clauses JSONB DEFAULT '{}',
  custom_invoice_clauses JSONB DEFAULT '[]',
  distance_units VARCHAR DEFAULT 'miles',
  ai_pricing_enabled BOOLEAN DEFAULT true,
  base_hourly_rate DECIMAL(10,2) DEFAULT 130.00,
  minimum_booking_hours DECIMAL(3,1) DEFAULT 2.0,
  additional_hour_rate DECIMAL(10,2) DEFAULT 60.00,
  dj_service_rate DECIMAL(10,2) DEFAULT 300.00,
  travel_surcharge_enabled BOOLEAN DEFAULT false,
  local_travel_radius INTEGER DEFAULT 20,
  custom_pricing_packages JSONB DEFAULT '[]',
  pricing_notes TEXT,
  special_offers TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 22. Google Calendar Integration
CREATE TABLE IF NOT EXISTS google_calendar_integration (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  google_refresh_token TEXT NOT NULL,
  google_calendar_id VARCHAR DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_token TEXT,
  webhook_channel_id VARCHAR,
  webhook_expiration TIMESTAMP,
  auto_sync_bookings BOOLEAN DEFAULT true,
  auto_import_events BOOLEAN DEFAULT false,
  sync_direction VARCHAR DEFAULT 'bidirectional',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 23. Event sync mapping
CREATE TABLE IF NOT EXISTS event_sync_mapping (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  musobuddy_id INTEGER,
  musobuddy_type VARCHAR NOT NULL,
  google_event_id VARCHAR NOT NULL,
  google_calendar_id VARCHAR DEFAULT 'primary',
  last_synced_at TIMESTAMP DEFAULT NOW(),
  sync_direction VARCHAR NOT NULL,
  conflict_status VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 24. Email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  category VARCHAR DEFAULT 'general',
  subject VARCHAR NOT NULL,
  email_body TEXT NOT NULL,
  sms_body TEXT,
  is_default BOOLEAN DEFAULT false,
  is_auto_respond BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 25. Conflict resolutions
CREATE TABLE IF NOT EXISTS conflict_resolutions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_ids TEXT NOT NULL,
  conflict_date TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP DEFAULT NOW(),
  resolved_by VARCHAR NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 26. Clients
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  booking_ids TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 27. Instrument mappings
CREATE TABLE IF NOT EXISTS instrument_mappings (
  id SERIAL PRIMARY KEY,
  instrument VARCHAR NOT NULL UNIQUE,
  gig_types TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 28. Booking conflicts
CREATE TABLE IF NOT EXISTS booking_conflicts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enquiry_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  conflicting_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  conflict_type VARCHAR NOT NULL,
  conflict_date TIMESTAMP NOT NULL,
  severity VARCHAR NOT NULL,
  travel_time INTEGER,
  distance DECIMAL(5,2),
  time_gap INTEGER,
  is_resolved BOOLEAN DEFAULT false,
  resolution VARCHAR,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- 29. Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR DEFAULT 'medium',
  status VARCHAR DEFAULT 'open',
  page VARCHAR,
  admin_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 30. Unparseable messages
CREATE TABLE IF NOT EXISTS unparseable_messages (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR NOT NULL,
  from_contact VARCHAR,
  subject VARCHAR,
  raw_message TEXT NOT NULL,
  client_address TEXT,
  parsing_error_details TEXT,
  message_type VARCHAR DEFAULT 'general',
  status VARCHAR DEFAULT 'pending',
  review_notes TEXT,
  converted_to_booking_id INTEGER REFERENCES bookings(id),
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP
);

-- 31. Message notifications
CREATE TABLE IF NOT EXISTS message_notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_email VARCHAR NOT NULL,
  subject VARCHAR NOT NULL,
  message_url TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 32. Beta invites
CREATE TABLE IF NOT EXISTS beta_invites (
  email VARCHAR PRIMARY KEY,
  status VARCHAR DEFAULT 'pending',
  invited_by VARCHAR NOT NULL REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  used_by VARCHAR REFERENCES users(id),
  notes TEXT,
  cohort VARCHAR DEFAULT '2025_beta'
);

-- 33. Beta invite codes
CREATE TABLE IF NOT EXISTS beta_invite_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR DEFAULT 'active',
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  trial_days INTEGER DEFAULT 365,
  description TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  last_used_by VARCHAR REFERENCES users(id)
);

-- 34. Imported contracts
CREATE TABLE IF NOT EXISTS imported_contracts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR,
  cloud_storage_url VARCHAR,
  cloud_storage_key VARCHAR,
  contract_type VARCHAR,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  booking_id INTEGER REFERENCES bookings(id)
);

-- 35. Contract extraction patterns
CREATE TABLE IF NOT EXISTS contract_extraction_patterns (
  id SERIAL PRIMARY KEY,
  contract_type VARCHAR NOT NULL,
  field_name VARCHAR NOT NULL,
  extraction_method JSONB,
  success_rate DECIMAL,
  usage_count INTEGER DEFAULT 0,
  created_by VARCHAR REFERENCES users(id),
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 36. Contract extractions
CREATE TABLE IF NOT EXISTS contract_extractions (
  id SERIAL PRIMARY KEY,
  imported_contract_id INTEGER REFERENCES imported_contracts(id),
  extracted_data JSONB,
  extraction_time_seconds INTEGER,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_contracts_booking_id ON contracts(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_booking_id ON client_communications(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_documents_booking_id ON booking_documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_user ON blocked_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_range ON blocked_dates(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_security_user_service ON security_monitoring(user_id, api_service);
CREATE INDEX IF NOT EXISTS idx_security_created_at ON security_monitoring(created_at);
CREATE INDEX IF NOT EXISTS idx_security_suspicious ON security_monitoring(suspicious);
CREATE INDEX IF NOT EXISTS idx_client_communications_user ON client_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_client_email ON client_communications(client_email);
CREATE INDEX IF NOT EXISTS idx_client_communications_sent_at ON client_communications(sent_at);
CREATE INDEX IF NOT EXISTS idx_booking_documents_user ON booking_documents(user_id);