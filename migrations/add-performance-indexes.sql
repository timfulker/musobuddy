-- Performance Indexes Migration
-- Run this in Supabase Dashboard → SQL Editor

-- Bookings table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_date
ON bookings(user_id, event_date DESC)
WHERE status != 'cancelled';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_event_date
ON bookings(event_date)
WHERE status NOT IN ('cancelled', 'rejected');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status
ON bookings(status, user_id);

-- Message notifications indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread
ON message_notifications(user_id, is_read)
WHERE is_read = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_booking
ON message_notifications(booking_id, received_at DESC)
WHERE booking_id IS NOT NULL;

-- Contracts index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_enquiry
ON contracts(enquiry_id)
WHERE enquiry_id IS NOT NULL;

-- Update statistics
ANALYZE bookings;
ANALYZE message_notifications;
ANALYZE contracts;