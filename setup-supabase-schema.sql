-- MusoBuddy Database Schema
-- Clean snake_case columns with proper foreign keys
-- Run this in both Development and Production Supabase projects

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (main user accounts)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  firebase_uid VARCHAR(255) UNIQUE,
  supabase_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  has_paid BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User settings
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  contract_clauses TEXT,
  theme_accent_color VARCHAR(7) DEFAULT '#3b82f6',
  theme_show_terms BOOLEAN DEFAULT true,
  custom_gig_types TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table (comprehensive event information)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(50),
  client_address TEXT,
  venue VARCHAR(255),
  venue_address TEXT,
  venue_contact_info TEXT,
  parking_info TEXT,
  event_date DATE,
  event_time TIME,
  event_end_time TIME,
  performance_duration INTEGER, -- minutes
  fee DECIMAL(10,2),
  final_amount DECIMAL(10,2),
  travel_expense DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  deposit_paid BOOLEAN DEFAULT false,
  payment_due_date DATE,
  equipment_requirements TEXT,
  special_requirements TEXT,
  dress_code VARCHAR(255),
  styles TEXT[],
  must_play_songs TEXT[],
  avoid_songs TEXT[],
  first_dance_song VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new',
  workflow_stage VARCHAR(50) DEFAULT 'inquiry',
  google_calendar_event_id VARCHAR(255),
  original_email_content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contracts table
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  client_name VARCHAR(255),
  event_date DATE,
  performance_duration INTEGER,
  venue_address TEXT,
  travel_expenses DECIMAL(10,2),
  pdf_url VARCHAR(500),
  signed_at TIMESTAMP,
  signature_data TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  client_name VARCHAR(255),
  performance_date DATE,
  performance_fee DECIMAL(10,2),
  gig_type VARCHAR(255),
  deposit_paid BOOLEAN DEFAULT false,
  pdf_url VARCHAR(500),
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SMS verifications (for phone verification)
CREATE TABLE sms_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(50) NOT NULL,
  code VARCHAR(6) NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Client communications (message threads)
CREATE TABLE client_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  client_email VARCHAR(255),
  subject VARCHAR(500),
  message_content TEXT,
  is_from_client BOOLEAN DEFAULT true,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- Booking documents (file attachments)
CREATE TABLE booking_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  file_url VARCHAR(500),
  file_type VARCHAR(100),
  category VARCHAR(100),
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_supabase_uid ON users(supabase_uid);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_contracts_booking_id ON contracts(booking_id);
CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX idx_client_communications_booking_id ON client_communications(booking_id);
CREATE INDEX idx_booking_documents_booking_id ON booking_documents(booking_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_documents ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only see their own data)
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = supabase_uid);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = supabase_uid);

CREATE POLICY "Users can view own settings" ON user_settings FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
);

CREATE POLICY "Users can view own bookings" ON bookings FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
);

CREATE POLICY "Users can view own contracts" ON contracts FOR ALL USING (
  booking_id IN (SELECT id FROM bookings WHERE user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
);

CREATE POLICY "Users can view own invoices" ON invoices FOR ALL USING (
  booking_id IN (SELECT id FROM bookings WHERE user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
);

CREATE POLICY "Users can view own communications" ON client_communications FOR ALL USING (
  booking_id IN (SELECT id FROM bookings WHERE user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
);

CREATE POLICY "Users can view own documents" ON booking_documents FOR ALL USING (
  booking_id IN (SELECT id FROM bookings WHERE user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
);