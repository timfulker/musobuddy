-- Missing compliance_sent_log table
CREATE TABLE IF NOT EXISTS compliance_sent_log (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL,
    user_id VARCHAR NOT NULL,
    recipient_email VARCHAR NOT NULL,
    document_ids INTEGER[] NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint if bookings table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        ALTER TABLE compliance_sent_log 
        ADD CONSTRAINT fk_compliance_booking 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;
END $$;