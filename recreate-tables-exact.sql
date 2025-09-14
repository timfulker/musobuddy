-- Recreate tables with exact Neon schemas
-- Run this in Supabase Production SQL Editor

-- Drop and recreate client_communications
DROP TABLE IF EXISTS client_communications CASCADE;
CREATE TABLE client_communications (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    booking_id INTEGER,
    client_name VARCHAR NOT NULL,
    client_email VARCHAR NOT NULL,
    communication_type VARCHAR DEFAULT 'email' NOT NULL,
    direction VARCHAR DEFAULT 'outbound' NOT NULL,
    template_id INTEGER,
    template_name VARCHAR,
    template_category VARCHAR,
    subject TEXT,
    message_body TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivery_status VARCHAR DEFAULT 'sent',
    opened_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop and recreate compliance_documents
DROP TABLE IF EXISTS compliance_documents CASCADE;
CREATE TABLE compliance_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    type VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    expiry_date TIMESTAMP,
    status VARCHAR DEFAULT 'valid' NOT NULL,
    document_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Drop and recreate unparseable_messages
DROP TABLE IF EXISTS unparseable_messages CASCADE;
CREATE TABLE unparseable_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    source VARCHAR DEFAULT 'email' NOT NULL,
    from_contact TEXT NOT NULL,
    raw_message TEXT NOT NULL,
    client_address TEXT,
    parsing_error_details TEXT,
    message_type VARCHAR,
    status VARCHAR DEFAULT 'new' NOT NULL,
    review_notes TEXT,
    converted_to_booking_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    subject VARCHAR
);

-- Drop and recreate security_monitoring
DROP TABLE IF EXISTS security_monitoring CASCADE;
CREATE TABLE security_monitoring (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    api_service VARCHAR NOT NULL,
    endpoint VARCHAR,
    request_count INTEGER DEFAULT 1,
    estimated_cost DECIMAL DEFAULT 0,
    ip_address VARCHAR,
    user_agent TEXT,
    suspicious BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Drop and recreate phone_verifications
DROP TABLE IF EXISTS phone_verifications CASCADE;
CREATE TABLE phone_verifications (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR NOT NULL,
    verification_code VARCHAR,
    verified_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    ip_address VARCHAR,
    user_agent TEXT
);

-- Success message
SELECT 'Successfully recreated all tables with exact Neon schemas!' as result;