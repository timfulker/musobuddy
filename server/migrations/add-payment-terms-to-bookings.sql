-- Migration: Add payment terms fields to bookings table
-- These fields are now the single source of truth for payment terms (moved from contracts/invoices)

-- Add payment_terms column (e.g., "28_days_before", "7_days_after", etc.)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR;

-- Add due_date column (calculated from performance date + payment terms)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

-- Add payment_terms_customized column (tracks if user manually changed from default)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_terms_customized BOOLEAN DEFAULT false;

-- Add comment to document the change
COMMENT ON COLUMN bookings.payment_terms IS 'Single source of truth for payment terms - contracts and invoices read from here';
COMMENT ON COLUMN bookings.due_date IS 'Auto-calculated from event date + payment terms, or manually set';
COMMENT ON COLUMN bookings.payment_terms_customized IS 'True if user manually changed payment terms from default settings';
