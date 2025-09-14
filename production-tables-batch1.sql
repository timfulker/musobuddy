-- Production Database Schema Setup - BATCH 1
-- Essential tables for basic functionality
-- Run this in Supabase Production Dashboard → SQL Editor

-- 1. Create clients table (needed for bookings)
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT false,
  user_id BIGINT
);

-- Create indexes for clients table
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_deleted ON clients(deleted);

-- 2. Create bookings table (core functionality)
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  musician_name TEXT,
  band_name TEXT,
  event_type TEXT,
  venue_name TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  date DATE,
  arrival_time TIME,
  start_time TIME,
  end_time TIME,
  breaks TEXT,
  rate DECIMAL(10,2),
  travel DECIMAL(10,2),
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  collaboration_token TEXT UNIQUE,
  collaboration_expiry TIMESTAMP WITH TIME ZONE,
  last_client_update TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  email_hash TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN DEFAULT false,
  user_id BIGINT,
  instrument TEXT,
  special_requests TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  what3words TEXT,
  source TEXT,
  is_shared BOOLEAN DEFAULT false,
  event_coordinator_name TEXT,
  event_coordinator_phone TEXT,
  event_coordinator_email TEXT,
  load_in_time TIME,
  sound_check_time TIME,
  guest_count INTEGER,
  genre_tags TEXT[],
  backline_provided TEXT,
  rehearsal_needed BOOLEAN DEFAULT false,
  contract_status TEXT DEFAULT 'not_sent',
  invoice_status TEXT DEFAULT 'not_sent',
  deposit_amount DECIMAL(10,2),
  deposit_paid BOOLEAN DEFAULT false,
  balance_amount DECIMAL(10,2),
  balance_paid BOOLEAN DEFAULT false,
  attire TEXT,
  parking_info TEXT,
  stage_plot TEXT,
  tech_requirements TEXT,
  client_id INTEGER,
  has_conflict BOOLEAN DEFAULT false,
  rehearsal_dates TEXT[],
  production_advance TEXT,
  hospitality_rider TEXT,
  total_amount DECIMAL(10,2),
  quick_add_method TEXT,
  venue_capacity INTEGER,
  ticket_price DECIMAL(10,2),
  merchandise_split TEXT,
  sound_engineer_contact TEXT,
  lighting_requirements TEXT,
  time_zone TEXT DEFAULT 'America/Los_Angeles',
  coordinator_name TEXT,
  coordinator_phone TEXT,
  coordinator_email TEXT,
  invoice_sent_at TIMESTAMP WITH TIME ZONE,
  contract_sent_at TIMESTAMP WITH TIME ZONE,
  performance_time TIME,
  agreed_rate DECIMAL(10,2),
  google_calendar_id TEXT,
  google_event_id TEXT,
  travelCostMiles TEXT,
  performance_status TEXT DEFAULT 'upcoming',
  summary TEXT,
  terms TEXT,
  subtotal DECIMAL(10,2),
  tax_rate DECIMAL(5,4),
  tax_amount DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  discount_reason TEXT,
  payment_method TEXT,
  payment_received_date DATE,
  cancellation_date DATE,
  cancellation_reason TEXT,
  cancellation_fee DECIMAL(10,2),
  reschedule_date DATE,
  reschedule_reason TEXT,
  original_date DATE,
  venue_contact_name TEXT,
  venue_contact_phone TEXT,
  venue_contact_email TEXT,
  venue_website TEXT,
  venue_type TEXT,
  indoor_outdoor TEXT,
  venue_amenities TEXT[],
  set_list TEXT[],
  encore_planned BOOLEAN DEFAULT false,
  weather_backup_plan TEXT,
  insurance_required BOOLEAN DEFAULT false,
  insurance_policy_number TEXT,
  union_affiliation TEXT,
  visa_requirements TEXT,
  international_travel BOOLEAN DEFAULT false,
  currency TEXT DEFAULT 'USD',
  exchange_rate DECIMAL(10,6),
  promotional_materials TEXT,
  social_media_handles JSONB,
  press_release TEXT,
  photographer_contact TEXT,
  videographer_contact TEXT,
  live_stream BOOLEAN DEFAULT false,
  recording_rights TEXT,
  broadcast_rights TEXT,
  merch_sales_allowed BOOLEAN DEFAULT true,
  vendor_fee DECIMAL(10,2),
  commission_rate DECIMAL(5,2),
  agent_name TEXT,
  agent_contact TEXT,
  advance_payment_date DATE,
  final_payment_date DATE,
  payment_terms TEXT,
  late_payment_penalty DECIMAL(10,2),
  mileage_reimbursement DECIMAL(10,2),
  hotel_provided BOOLEAN DEFAULT false,
  meals_provided BOOLEAN DEFAULT false,
  per_diem DECIMAL(10,2)
);

-- Create indexes for bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_client_email ON bookings(client_email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_deleted ON bookings(deleted);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);

-- 3. Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  contract_number TEXT UNIQUE,
  booking_id INTEGER,
  template_type TEXT DEFAULT 'standard',
  terms TEXT,
  special_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_data TEXT,
  signer_name TEXT,
  signer_email TEXT,
  signer_ip TEXT,
  status TEXT DEFAULT 'draft',
  pdf_url TEXT,
  signing_url TEXT,
  signing_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  user_id BIGINT,
  client_name TEXT,
  client_email TEXT,
  event_date DATE,
  venue_name TEXT,
  performance_time TIME,
  agreed_rate DECIMAL(10,2),
  additional_terms TEXT[],
  cancellation_policy TEXT,
  force_majeure_clause TEXT,
  payment_schedule TEXT,
  technical_requirements TEXT,
  hospitality_requirements TEXT,
  merchandise_terms TEXT,
  recording_terms TEXT,
  promotional_terms TEXT,
  liability_insurance TEXT,
  indemnification_clause TEXT,
  governing_law TEXT DEFAULT 'California',
  dispute_resolution TEXT,
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(10,2),
  deposit_due_date DATE,
  final_payment_due_date DATE,
  contract_version INTEGER DEFAULT 1,
  previous_version_id INTEGER,
  change_summary TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  is_template BOOLEAN DEFAULT false,
  template_name TEXT,
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_reason TEXT
);

-- Create indexes for contracts table
CREATE INDEX IF NOT EXISTS idx_contracts_booking_id ON contracts(booking_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signed_at ON contracts(signed_at);

-- 4. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  booking_id INTEGER,
  client_name TEXT,
  client_email TEXT,
  client_address TEXT,
  event_date DATE,
  event_location TEXT,
  items JSONB,
  subtotal DECIMAL(10,2),
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  terms TEXT DEFAULT 'Net 30',
  due_date DATE,
  overdue_amount DECIMAL(10,2),
  reminder_count INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  pdf_url TEXT,
  stripe_invoice_id TEXT,
  stripe_payment_intent TEXT,
  user_id BIGINT,
  performance_description TEXT,
  purchase_order_number TEXT,
  billing_contact_name TEXT,
  billing_contact_email TEXT,
  billing_contact_phone TEXT,
  line_items_detail TEXT,
  currency TEXT DEFAULT 'USD',
  exchange_rate DECIMAL(10,6),
  bank_details TEXT,
  swift_code TEXT,
  iban TEXT,
  routing_number TEXT,
  account_number TEXT,
  payment_instructions TEXT,
  late_fee_percentage DECIMAL(5,2),
  late_fee_amount DECIMAL(10,2),
  partial_payment_allowed BOOLEAN DEFAULT false,
  partial_payments JSONB,
  credit_applied DECIMAL(10,2),
  credit_memo_number TEXT,
  refund_amount DECIMAL(10,2),
  refund_date DATE,
  refund_reason TEXT,
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT,
  next_invoice_date DATE,
  recurring_end_date DATE
);

-- Create indexes for invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON clients TO authenticated;
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON contracts TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable RLS (but don't create policies yet - we'll do that after data transfer)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Batch 1 tables created successfully: clients, bookings, contracts, invoices';
END $$;