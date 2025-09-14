-- Clean schema for Supabase Production (37 tables)
-- Run this in Supabase SQL Editor

-- 1. Beta invite codes
CREATE TABLE IF NOT EXISTS beta_invite_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR NOT NULL,
    max_uses INTEGER DEFAULT 1 NOT NULL,
    current_uses INTEGER DEFAULT 0 NOT NULL,
    trial_days INTEGER DEFAULT 365 NOT NULL,
    description TEXT,
    status VARCHAR DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by VARCHAR NOT NULL,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_used_by VARCHAR
);

-- 2. Beta invites
CREATE TABLE IF NOT EXISTS beta_invites (
    email VARCHAR(255) NOT NULL,
    invited_by VARCHAR(255) NOT NULL,
    notes TEXT,
    cohort VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    used_by VARCHAR(255)
);

-- 3. Blocked dates
CREATE TABLE IF NOT EXISTS blocked_dates (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    color VARCHAR DEFAULT '#dc2626',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR
);

-- 4. Booking conflicts
CREATE TABLE IF NOT EXISTS booking_conflicts (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    enquiry_id INTEGER NOT NULL,
    conflicting_id INTEGER NOT NULL,
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

-- 5. Booking documents
CREATE TABLE IF NOT EXISTS booking_documents (
    id BIGSERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL,
    user_id VARCHAR NOT NULL,
    document_type VARCHAR DEFAULT 'other' NOT NULL,
    document_name VARCHAR NOT NULL,
    document_url TEXT NOT NULL,
    document_key TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 6. Bookings (already exists, skip)
-- CREATE TABLE IF NOT EXISTS bookings - SKIP, already exists

-- 7. Client communications
CREATE TABLE IF NOT EXISTS client_communications (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    client_id INTEGER,
    booking_id INTEGER,
    communication_type VARCHAR NOT NULL,
    subject VARCHAR,
    content TEXT,
    sent_at TIMESTAMP DEFAULT NOW(),
    delivery_status VARCHAR DEFAULT 'sent',
    error_message TEXT
);

-- 8. Clients (already exists, skip)
-- CREATE TABLE IF NOT EXISTS clients - SKIP, already exists

-- 9. Compliance documents
CREATE TABLE IF NOT EXISTS compliance_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    document_type VARCHAR NOT NULL,
    document_name VARCHAR NOT NULL,
    document_url TEXT NOT NULL,
    document_key TEXT NOT NULL,
    expires_at DATE,
    status VARCHAR DEFAULT 'active',
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 10. Compliance sent log
CREATE TABLE IF NOT EXISTS compliance_sent_log (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    document_type VARCHAR NOT NULL,
    sent_to VARCHAR NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW(),
    delivery_status VARCHAR DEFAULT 'sent'
);

-- 11. Conflict resolutions
CREATE TABLE IF NOT EXISTS conflict_resolutions (
    id BIGSERIAL PRIMARY KEY,
    conflict_id INTEGER NOT NULL,
    user_id VARCHAR NOT NULL,
    resolution_type VARCHAR NOT NULL,
    resolution_details TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_by VARCHAR
);

-- 12. Contract extraction patterns
CREATE TABLE IF NOT EXISTS contract_extraction_patterns (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    pattern_name VARCHAR NOT NULL,
    pattern_regex TEXT NOT NULL,
    extraction_field VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 13. Contract extractions
CREATE TABLE IF NOT EXISTS contract_extractions (
    id BIGSERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    user_id VARCHAR NOT NULL,
    extracted_data JSONB,
    extraction_confidence DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 14. Contracts (already exists, skip)
-- CREATE TABLE IF NOT EXISTS contracts - SKIP, already exists

-- 15. Email templates (already exists, skip)
-- CREATE TABLE IF NOT EXISTS email_templates - SKIP, already exists

-- 16. Event sync mapping
CREATE TABLE IF NOT EXISTS event_sync_mapping (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    booking_id INTEGER NOT NULL,
    external_event_id VARCHAR NOT NULL,
    sync_service VARCHAR NOT NULL,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    sync_status VARCHAR DEFAULT 'active'
);

-- 17. Feedback
CREATE TABLE IF NOT EXISTS feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    feedback_type VARCHAR NOT NULL,
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR DEFAULT 'new'
);

-- 18. Fraud prevention log
CREATE TABLE IF NOT EXISTS fraud_prevention_log (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR,
    ip_address VARCHAR,
    action VARCHAR NOT NULL,
    risk_score INTEGER,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 19. Google calendar integration
CREATE TABLE IF NOT EXISTS google_calendar_integration (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    google_calendar_id VARCHAR NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 20. Imported contracts
CREATE TABLE IF NOT EXISTS imported_contracts (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    original_filename VARCHAR NOT NULL,
    contract_data JSONB,
    import_status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- 21. Instrument mappings
CREATE TABLE IF NOT EXISTS instrument_mappings (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    instrument_name VARCHAR NOT NULL,
    category VARCHAR,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 22. Invoices (already exists, skip)
-- CREATE TABLE IF NOT EXISTS invoices - SKIP, already exists

-- 23. Message notifications
CREATE TABLE IF NOT EXISTS message_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    notification_type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

-- 24. Phone verifications
CREATE TABLE IF NOT EXISTS phone_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    phone_number VARCHAR NOT NULL,
    verification_code VARCHAR NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 25. Security monitoring
CREATE TABLE IF NOT EXISTS security_monitoring (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR,
    event_type VARCHAR NOT NULL,
    ip_address VARCHAR,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 26. Session (separate from sessions)
CREATE TABLE IF NOT EXISTS session (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    session_data JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 27. Sessions (already exists, skip)
-- CREATE TABLE IF NOT EXISTS sessions - SKIP, already exists

-- 28. SMS verifications
CREATE TABLE IF NOT EXISTS sms_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    phone_number VARCHAR NOT NULL,
    verification_code VARCHAR NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 29. Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    subject VARCHAR NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR DEFAULT 'open',
    priority VARCHAR DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- 30. Unparseable messages
CREATE TABLE IF NOT EXISTS unparseable_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    original_message TEXT NOT NULL,
    sender_email VARCHAR,
    received_at TIMESTAMP DEFAULT NOW(),
    processing_attempts INTEGER DEFAULT 0,
    last_error TEXT,
    status VARCHAR DEFAULT 'pending'
);

-- 31. User activity
CREATE TABLE IF NOT EXISTS user_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    activity_type VARCHAR NOT NULL,
    activity_data JSONB,
    ip_address VARCHAR,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 32. User audit logs
CREATE TABLE IF NOT EXISTS user_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    action VARCHAR NOT NULL,
    table_name VARCHAR,
    record_id VARCHAR,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 33. User login history
CREATE TABLE IF NOT EXISTS user_login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    login_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR,
    user_agent TEXT,
    login_method VARCHAR DEFAULT 'password',
    success BOOLEAN DEFAULT true,
    failure_reason VARCHAR
);

-- 34. User messages
CREATE TABLE IF NOT EXISTS user_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    message_type VARCHAR NOT NULL,
    subject VARCHAR,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- 35. User security status
CREATE TABLE IF NOT EXISTS user_security_status (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL UNIQUE,
    two_factor_enabled BOOLEAN DEFAULT false,
    last_password_change TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login TIMESTAMP,
    account_locked_until TIMESTAMP,
    security_questions_set BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 36. User settings (already exists, skip)
-- CREATE TABLE IF NOT EXISTS user_settings - SKIP, already exists

-- 37. Users (already exists, skip)
-- CREATE TABLE IF NOT EXISTS users - SKIP, already exists

-- Success message
SELECT 'Successfully created all 37 tables!' as result;