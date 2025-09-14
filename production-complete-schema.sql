-- Complete table schema from backup
-- Created: 2025-09-14T23:22:56.122Z
-- Tables: 37

CREATE TABLE public.beta_invite_codes (
    id integer NOT NULL,
    code character varying NOT NULL,
    max_uses integer DEFAULT 1 NOT NULL,
    current_uses integer DEFAULT 0 NOT NULL,
    trial_days integer DEFAULT 365 NOT NULL,
    description text,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying NOT NULL,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    last_used_by character varying
);

CREATE TABLE public.beta_invites (
    email character varying(255) NOT NULL,
    invited_by character varying(255) NOT NULL,
    notes text,
    cohort character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying,
    invited_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    used_at timestamp without time zone,
    used_by character varying(255)
);

CREATE TABLE public.blocked_dates (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    title character varying NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    color character varying DEFAULT '#dc2626'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_recurring boolean DEFAULT false,
    recurrence_pattern character varying
);

CREATE TABLE public.booking_conflicts (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    enquiry_id integer NOT NULL,
    conflicting_id integer NOT NULL,
    conflict_type character varying NOT NULL,
    conflict_date timestamp without time zone NOT NULL,
    severity character varying NOT NULL,
    travel_time integer,
    distance numeric(5,2),
    time_gap integer,
    is_resolved boolean DEFAULT false,
    resolution character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    resolved_at timestamp without time zone
);

CREATE TABLE public.booking_documents (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    user_id character varying NOT NULL,
    document_type character varying DEFAULT 'other'::character varying NOT NULL,
    document_name character varying NOT NULL,
    document_url text NOT NULL,
    document_key text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.bookings (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    title character varying NOT NULL,
    client_name character varying NOT NULL,
    client_email character varying,
    client_phone character varying,
    event_date timestamp without time zone,
    event_time character varying,
    event_end_time character varying,
    performance_duration text,
    venue character varying,
    event_type character varying,
    gig_type character varying,
    estimated_value character varying,
    status character varying DEFAULT 'new'::character varying NOT NULL,
    notes text,
    original_email_content text,
    apply_now_link character varying,
    response_needed boolean DEFAULT true,
    last_contacted_at timestamp without time zone,
    has_conflicts boolean DEFAULT false,
    conflict_count integer DEFAULT 0,
    conflict_details text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    previous_status character varying,
    contract_sent boolean DEFAULT false,
    contract_signed boolean DEFAULT false,
    invoice_sent boolean DEFAULT false,
    paid_in_full boolean DEFAULT false,
    deposit_paid boolean DEFAULT false,
    quoted_amount numeric(10,2),
    deposit_amount numeric(10,2),
    final_amount numeric(10,2),
    completed boolean DEFAULT false,
    venue_address text,
    client_address text,
    equipment_requirements text,
    special_requirements text,
    fee numeric(10,2),
    styles text,
    equipment_provided text,
    whats_included text,
    uploaded_contract_url text,
    uploaded_contract_key text,
    uploaded_contract_filename character varying,
    uploaded_invoice_url text,
    uploaded_invoice_key text,
    uploaded_invoice_filename character varying,
    uploaded_documents jsonb DEFAULT '[]'::jsonb,
    travel_expense numeric(10,2),
    venue_contact text,
    sound_tech_contact text,
    stage_size character varying(50),
    power_equipment text,
    dress_code character varying(255),
    style_mood character varying(50),
    must_play_songs text,
    avoid_songs text,
    set_order character varying(50),
    first_dance_song character varying(255),
    processional_song character varying(255),
    signing_register_song character varying(255),
    recessional_song character varying(255),
    special_dedications text,
    guest_announcements text,
    load_in_info text,
    sound_check_time character varying(50),
    weather_contingency text,
    parking_permit_required boolean DEFAULT false,
    meal_provided boolean DEFAULT false,
    dietary_requirements text,
    shared_notes text,
    reference_tracks text,
    photo_permission boolean DEFAULT false,
    encore_allowed boolean DEFAULT false,
    encore_suggestions character varying(255),
    venue_contact_info text,
    parking_info text,
    contact_phone text,
    what3words character varying,
    email_hash character varying,
    processed_at timestamp without time zone,
    field_locks jsonb DEFAULT '{}'::jsonb,
    document_url text,
    document_key text,
    document_name text,
    document_uploaded_at timestamp without time zone,
    distance text,
    distance_value integer,
    duration text,
    collaboration_token character varying,
    collaboration_token_generated_at timestamp without time zone,
    workflow_stage character varying(50) DEFAULT 'initial'::character varying,
    map_static_url text,
    map_latitude numeric(10,7),
    map_longitude numeric(10,7)
);

CREATE TABLE public.client_communications (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    booking_id integer,
    client_name character varying NOT NULL,
    client_email character varying NOT NULL,
    communication_type character varying DEFAULT 'email'::character varying NOT NULL,
    direction character varying DEFAULT 'outbound'::character varying NOT NULL,
    template_id integer,
    template_name character varying,
    template_category character varying,
    subject text,
    message_body text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    sent_at timestamp with time zone DEFAULT now(),
    delivery_status character varying DEFAULT 'sent'::character varying,
    opened_at timestamp with time zone,
    replied_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.clients (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    address text,
    notes text,
    total_bookings integer DEFAULT 0,
    total_revenue numeric(10,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    booking_ids text
);

CREATE TABLE public.compliance_documents (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    type character varying NOT NULL,
    name character varying NOT NULL,
    expiry_date timestamp without time zone,
    status character varying DEFAULT 'valid'::character varying NOT NULL,
    document_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.compliance_sent_log (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    user_id character varying NOT NULL,
    recipient_email character varying NOT NULL,
    document_ids integer[] NOT NULL,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.conflict_resolutions (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    booking_ids text NOT NULL,
    conflict_date date NOT NULL,
    resolved_by character varying(255) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    resolved_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.contract_extraction_patterns (
    id integer NOT NULL,
    contract_type character varying NOT NULL,
    field_name character varying NOT NULL,
    extraction_method jsonb,
    success_rate numeric,
    usage_count integer DEFAULT 0,
    created_by character varying,
    is_global boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.contract_extractions (
    id integer NOT NULL,
    imported_contract_id integer,
    extracted_data jsonb,
    extraction_time_seconds integer,
    user_id character varying,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.contracts (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    enquiry_id integer,
    contract_number character varying NOT NULL,
    client_name character varying NOT NULL,
    event_date timestamp without time zone NOT NULL,
    event_time character varying,
    venue character varying NOT NULL,
    fee numeric(10,2) NOT NULL,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    signed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    client_email character varying,
    client_phone character varying,
    event_end_time character varying,
    reminder_enabled boolean DEFAULT false,
    reminder_days integer DEFAULT 3,
    last_reminder_sent timestamp without time zone,
    reminder_count integer DEFAULT 0,
    cloud_storage_url text,
    cloud_storage_key text,
    signing_url_created_at timestamp without time zone,
    venue_address text,
    client_fillable_fields text,
    client_address text,
    payment_instructions text,
    equipment_requirements text,
    special_requirements text,
    deposit numeric(10,2) DEFAULT 0.00,
    client_signature character varying(255),
    sent_at timestamp without time zone,
    signing_page_url text,
    signing_page_key text,
    client_ip_address text,
    template character varying(50) DEFAULT 'professional'::character varying,
    setlist text,
    rider_notes text,
    travel_expenses numeric(10,2) DEFAULT 0.00,
    cancellation_policy text,
    additional_terms text,
    superseded_by integer,
    original_contract_id integer,
    performance_duration character varying,
    client_portal_url text,
    client_portal_token text,
    client_portal_qr_code text,
    venue_contact text,
    sound_tech_contact text,
    stage_size character varying(50),
    power_equipment text,
    dress_code character varying(255),
    style_mood character varying(50),
    must_play_songs text,
    avoid_songs text,
    set_order character varying(50),
    first_dance_song character varying(255),
    processional_song character varying(255),
    signing_register_song character varying(255),
    recessional_song character varying(255),
    special_dedications text,
    guest_announcements text,
    load_in_info text,
    sound_check_time character varying(50),
    weather_contingency text,
    parking_permit_required boolean DEFAULT false,
    meal_provided boolean DEFAULT false,
    dietary_requirements text,
    shared_notes text,
    reference_tracks text,
    photo_permission boolean DEFAULT false,
    encore_allowed boolean DEFAULT false,
    encore_suggestions character varying(255),
    deposit_days integer DEFAULT 7
);

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    name character varying NOT NULL,
    subject character varying NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    email_body text NOT NULL,
    sms_body text,
    is_auto_respond boolean DEFAULT false,
    category character varying DEFAULT 'general'::character varying
);

CREATE TABLE public.event_sync_mapping (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    musobuddy_id integer NOT NULL,
    musobuddy_type character varying NOT NULL,
    google_event_id character varying NOT NULL,
    google_calendar_id character varying DEFAULT 'primary'::character varying,
    sync_direction character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.feedback (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    type character varying NOT NULL,
    title character varying NOT NULL,
    description text NOT NULL,
    priority character varying DEFAULT 'medium'::character varying,
    status character varying DEFAULT 'open'::character varying,
    page character varying,
    admin_notes text,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT feedback_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('critical'::character varying)::text]))),
    CONSTRAINT feedback_status_check CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('in_progress'::character varying)::text, ('resolved'::character varying)::text, ('closed'::character varying)::text]))),
    CONSTRAINT feedback_type_check CHECK (((type)::text = ANY (ARRAY[('bug'::character varying)::text, ('feature'::character varying)::text, ('improvement'::character varying)::text, ('other'::character varying)::text])))
);

CREATE TABLE public.fraud_prevention_log (
    id integer NOT NULL,
    phone_number character varying(20),
    email_address character varying(255),
    ip_address character varying(255),
    device_fingerprint text,
    action_taken character varying(100),
    reason text,
    risk_score integer,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.google_calendar_integration (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    google_refresh_token text NOT NULL,
    google_calendar_id character varying DEFAULT 'primary'::character varying,
    sync_enabled boolean DEFAULT true,
    last_sync_at timestamp without time zone,
    sync_token text,
    webhook_channel_id character varying,
    webhook_expiration timestamp without time zone,
    auto_sync_bookings boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    auto_import_events boolean DEFAULT true,
    sync_direction character varying DEFAULT 'both'::character varying
);

CREATE TABLE public.imported_contracts (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    filename character varying NOT NULL,
    file_size integer,
    mime_type character varying,
    cloud_storage_url character varying,
    cloud_storage_key character varying,
    contract_type character varying,
    uploaded_at timestamp without time zone DEFAULT now(),
    booking_id integer
);

CREATE TABLE public.instrument_mappings (
    id integer NOT NULL,
    instrument character varying NOT NULL,
    gig_types text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.invoices (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    contract_id integer,
    invoice_number character varying NOT NULL,
    client_name character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date timestamp without time zone NOT NULL,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    client_address character varying,
    event_date timestamp without time zone,
    fee numeric(10,2),
    deposit_paid numeric(10,2) DEFAULT '0'::numeric,
    client_email character varying,
    venue_address text,
    cloud_storage_url text,
    cloud_storage_key text,
    cc_email character varying,
    booking_id integer,
    invoice_theme character varying DEFAULT 'professional'::character varying,
    share_token text,
    stripe_payment_link_id text,
    stripe_payment_url text,
    stripe_session_id text,
    performance_duration text,
    gig_type text,
    invoice_type character varying DEFAULT 'performance'::character varying NOT NULL,
    description text
);

CREATE TABLE public.message_notifications (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    booking_id integer NOT NULL,
    sender_email character varying NOT NULL,
    subject character varying NOT NULL,
    message_url text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    is_dismissed boolean DEFAULT false
);

CREATE TABLE public.phone_verifications (
    id integer NOT NULL,
    phone_number character varying(20) NOT NULL,
    verification_code character varying(6),
    verified_at timestamp without time zone,
    attempts integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone,
    ip_address character varying(255),
    user_agent text
);

CREATE TABLE public.security_monitoring (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    api_service character varying(50) NOT NULL,
    endpoint character varying(100),
    request_count integer DEFAULT 1,
    estimated_cost numeric(10,6) DEFAULT 0,
    ip_address character varying,
    user_agent text,
    suspicious boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);

CREATE TABLE public.sms_verifications (
    id integer NOT NULL,
    email character varying NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    phone_number character varying NOT NULL,
    password character varying NOT NULL,
    verification_code character varying(6) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.support_tickets (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    assigned_to_user_id character varying,
    subject character varying NOT NULL,
    description text NOT NULL,
    category character varying DEFAULT 'general'::character varying,
    priority character varying DEFAULT 'medium'::character varying,
    status character varying DEFAULT 'open'::character varying,
    resolution text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    resolved_at timestamp without time zone
);

CREATE TABLE public.unparseable_messages (
    id integer NOT NULL,
    user_id character varying(255) NOT NULL,
    source character varying(50) DEFAULT 'email'::character varying NOT NULL,
    from_contact text NOT NULL,
    raw_message text NOT NULL,
    client_address text,
    parsing_error_details text,
    message_type character varying(50),
    status character varying(20) DEFAULT 'new'::character varying NOT NULL,
    review_notes text,
    converted_to_booking_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp without time zone,
    subject character varying
);

CREATE TABLE public.user_activity (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    action character varying NOT NULL,
    details jsonb,
    ip_address character varying,
    user_agent text,
    session_id character varying,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.user_audit_logs (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    admin_user_id character varying,
    action character varying NOT NULL,
    entity_type character varying,
    entity_id character varying,
    old_values jsonb,
    new_values jsonb,
    reason text,
    ip_address character varying,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.user_login_history (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    ip_address character varying,
    user_agent text,
    login_time timestamp without time zone DEFAULT now(),
    logout_time timestamp without time zone,
    session_duration integer,
    successful boolean DEFAULT true,
    failure_reason character varying
);

CREATE TABLE public.user_messages (
    id integer NOT NULL,
    from_user_id character varying NOT NULL,
    to_user_id character varying,
    subject character varying NOT NULL,
    content text NOT NULL,
    type character varying DEFAULT 'announcement'::character varying NOT NULL,
    priority character varying DEFAULT 'normal'::character varying,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.user_security_status (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    is_blocked boolean DEFAULT false,
    block_reason text,
    risk_score integer DEFAULT 0,
    last_review_at timestamp without time zone,
    blocked_at timestamp without time zone,
    blocked_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.user_settings (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    business_name character varying,
    phone character varying,
    website character varying,
    tax_number character varying,
    bank_details text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    email_from_name character varying,
    next_invoice_number integer DEFAULT 1,
    address_line1 character varying,
    address_line2 character varying,
    city character varying,
    postcode character varying,
    custom_gig_types text,
    county character varying,
    theme_accent_color character varying DEFAULT '#673ab7'::character varying,
    theme_show_terms boolean DEFAULT true,
    booking_display_limit character varying DEFAULT '50'::character varying,
    primary_instrument character varying,
    ai_pricing_enabled boolean DEFAULT true,
    base_hourly_rate numeric(10,2) DEFAULT 130.00,
    minimum_booking_hours integer DEFAULT 2,
    additional_hour_rate numeric(10,2) DEFAULT 60.00,
    dj_service_rate numeric(10,2) DEFAULT 300.00,
    travel_surcharge_enabled boolean DEFAULT false,
    pricing_notes text,
    special_offers text,
    local_travel_radius integer DEFAULT 50,
    custom_pricing_packages jsonb DEFAULT '[]'::jsonb,
    secondary_instruments jsonb DEFAULT '[]'::jsonb,
    distance_units character varying DEFAULT 'miles'::character varying,
    invoice_prefix character varying,
    contract_clauses jsonb DEFAULT '{}'::jsonb,
    custom_clauses jsonb DEFAULT '[]'::jsonb,
    gig_types text,
    invoice_payment_terms character varying DEFAULT '7_days'::character varying,
    invoice_clauses jsonb DEFAULT '{}'::jsonb,
    custom_invoice_clauses jsonb DEFAULT '[]'::jsonb,
    home_address_line1 character varying(255),
    home_address_line2 character varying(255),
    home_city character varying(100),
    home_postcode character varying(20),
    business_contact_email character varying,
    email_signature_text text
);

CREATE TABLE public.users (
    id character varying NOT NULL,
    email character varying NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    last_login_ip character varying,
    login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp without time zone,
    is_lifetime boolean DEFAULT false,
    stripe_customer_id text,
    is_beta_tester boolean DEFAULT false,
    beta_feedback_count integer DEFAULT 0,
    email_prefix text,
    phone_number character varying(20),
    signup_ip_address character varying(255),
    device_fingerprint text,
    fraud_score integer DEFAULT 0,
    reminder_sent_at timestamp without time zone,
    ai_pricing_enabled boolean DEFAULT true,
    base_hourly_rate numeric(10,2) DEFAULT 130.00,
    minimum_booking_hours integer DEFAULT 2,
    additional_hour_rate numeric(10,2) DEFAULT 60.00,
    dj_service_rate numeric(10,2) DEFAULT 300.00,
    quick_add_token text,
    widget_url text,
    widget_qr_code text,
    password_reset_token character varying(128),
    password_reset_expires_at timestamp without time zone,
    created_by_admin boolean DEFAULT false,
    firebase_uid text,
    is_assigned boolean DEFAULT false,
    trial_ends_at timestamp without time zone,
    has_paid boolean DEFAULT false,
    account_notes text,
    stripe_subscription_id text,
    assigned_at timestamp without time zone,
    assigned_by character varying,
    onboarding_completed boolean DEFAULT false,
    settings_completed boolean DEFAULT false,
    supabase_uid uuid
);

-- Create sequences for auto-increment columns
CREATE SEQUENCE IF NOT EXISTS beta_invite_codes_id_seq;
CREATE SEQUENCE IF NOT EXISTS blocked_dates_id_seq;
CREATE SEQUENCE IF NOT EXISTS booking_conflicts_id_seq;
CREATE SEQUENCE IF NOT EXISTS booking_documents_id_seq;
CREATE SEQUENCE IF NOT EXISTS bookings_id_seq;
CREATE SEQUENCE IF NOT EXISTS clients_id_seq;
CREATE SEQUENCE IF NOT EXISTS compliance_documents_id_seq;
CREATE SEQUENCE IF NOT EXISTS conflict_resolutions_id_seq;
CREATE SEQUENCE IF NOT EXISTS contracts_id_seq;
CREATE SEQUENCE IF NOT EXISTS feedback_id_seq;
CREATE SEQUENCE IF NOT EXISTS imported_contracts_id_seq;
CREATE SEQUENCE IF NOT EXISTS invoices_id_seq;
CREATE SEQUENCE IF NOT EXISTS message_notifications_id_seq;
CREATE SEQUENCE IF NOT EXISTS support_tickets_id_seq;
CREATE SEQUENCE IF NOT EXISTS unparseable_messages_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_audit_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_login_history_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_messages_id_seq;

-- Set sequence ownership
ALTER SEQUENCE beta_invite_codes_id_seq OWNED BY beta_invite_codes.id;
ALTER SEQUENCE blocked_dates_id_seq OWNED BY blocked_dates.id;
ALTER SEQUENCE booking_conflicts_id_seq OWNED BY booking_conflicts.id;
ALTER SEQUENCE booking_documents_id_seq OWNED BY booking_documents.id;
ALTER SEQUENCE bookings_id_seq OWNED BY bookings.id;
ALTER SEQUENCE clients_id_seq OWNED BY clients.id;
ALTER SEQUENCE compliance_documents_id_seq OWNED BY compliance_documents.id;
ALTER SEQUENCE conflict_resolutions_id_seq OWNED BY conflict_resolutions.id;
ALTER SEQUENCE contracts_id_seq OWNED BY contracts.id;
ALTER SEQUENCE feedback_id_seq OWNED BY feedback.id;
ALTER SEQUENCE imported_contracts_id_seq OWNED BY imported_contracts.id;
ALTER SEQUENCE invoices_id_seq OWNED BY invoices.id;
ALTER SEQUENCE message_notifications_id_seq OWNED BY message_notifications.id;
ALTER SEQUENCE support_tickets_id_seq OWNED BY support_tickets.id;
ALTER SEQUENCE unparseable_messages_id_seq OWNED BY unparseable_messages.id;
ALTER SEQUENCE user_audit_logs_id_seq OWNED BY user_audit_logs.id;
ALTER SEQUENCE user_login_history_id_seq OWNED BY user_login_history.id;
ALTER SEQUENCE user_messages_id_seq OWNED BY user_messages.id;
