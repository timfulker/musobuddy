-- Add missing columns to bookings table for CSV import compatibility
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS title VARCHAR;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS previous_status VARCHAR;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS uploaded_contract_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS uploaded_contract_key VARCHAR;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS uploaded_contract_filename VARCHAR;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS uploaded_invoice_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS uploaded_invoice_key VARCHAR;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS uploaded_invoice_filename VARCHAR;