-- Create production schema using development structure
-- This copies the exact table structures from development
-- Run this in Supabase Production Dashboard → SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- BOOKINGS table (exactly as in development)
CREATE TABLE IF NOT EXISTS public.bookings (
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

-- Create sequence for bookings
CREATE SEQUENCE IF NOT EXISTS public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;
ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);

-- CLIENTS table (exactly as in development)
CREATE TABLE IF NOT EXISTS public.clients (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    address text,
    notes text,
    total_bookings integer DEFAULT 0,
    total_revenue numeric(10,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    booking_ids text
);

-- Create sequence for clients
CREATE SEQUENCE IF NOT EXISTS public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;
ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);

-- CONTRACTS table (exactly as in development)
CREATE TABLE IF NOT EXISTS public.contracts (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    enquiry_id integer NOT NULL,
    contract_number character varying NOT NULL,
    client_name character varying NOT NULL,
    event_date timestamp without time zone NOT NULL,
    event_time character varying NOT NULL,
    venue character varying NOT NULL,
    fee numeric(10,2) NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    signed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    client_email character varying NOT NULL,
    client_phone character varying,
    event_end_time character varying,
    reminder_enabled boolean DEFAULT true,
    reminder_days integer DEFAULT 3,
    last_reminder_sent timestamp without time zone,
    reminder_count integer DEFAULT 0,
    cloud_storage_url text,
    cloud_storage_key text,
    signing_url_created_at timestamp without time zone,
    venue_address text,
    client_fillable_fields jsonb,
    client_address text,
    payment_instructions text,
    equipment_requirements text,
    special_requirements text,
    deposit numeric(10,2),
    client_signature text,
    sent_at timestamp without time zone,
    signing_page_url text,
    signing_page_key text,
    client_ip_address character varying,
    template character varying DEFAULT 'standard'::character varying,
    setlist text,
    rider_notes text,
    travel_expenses numeric(10,2) DEFAULT 0.00,
    cancellation_policy text,
    additional_terms text,
    superseded_by integer,
    original_contract_id integer,
    performance_duration text,
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

-- Create sequence for contracts
CREATE SEQUENCE IF NOT EXISTS public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;
ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);

-- INVOICES table (exactly as in development)
CREATE TABLE IF NOT EXISTS public.invoices (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    contract_id integer,
    invoice_number character varying NOT NULL,
    client_name character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date timestamp without time zone NOT NULL,
    status character varying DEFAULT 'pending'::character varying NOT NULL,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    client_address text,
    event_date timestamp without time zone,
    fee numeric(10,2),
    deposit_paid numeric(10,2) DEFAULT 0.00,
    client_email character varying,
    venue_address text,
    cloud_storage_url text,
    cloud_storage_key text,
    cc_email character varying,
    booking_id integer,
    invoice_theme character varying DEFAULT 'classic'::character varying,
    share_token character varying,
    stripe_payment_link_id character varying,
    stripe_payment_url text,
    stripe_session_id character varying,
    performance_duration text,
    gig_type character varying,
    invoice_type character varying DEFAULT 'standard'::character varying,
    description text
);

-- Create sequence for invoices
CREATE SEQUENCE IF NOT EXISTS public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;
ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);

-- Add primary key constraints
ALTER TABLE ONLY public.bookings ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clients ADD CONSTRAINT clients_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.contracts ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);

-- Add unique constraints
ALTER TABLE ONLY public.contracts ADD CONSTRAINT contracts_contract_number_unique UNIQUE (contract_number);
ALTER TABLE ONLY public.invoices ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_enquiry_id ON public.contracts(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable RLS (but don't create policies yet - we'll do after data copy)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Production schema created successfully!';
  RAISE NOTICE 'Tables created: bookings, clients, contracts, invoices';
  RAISE NOTICE 'Ready for data copy from development database';
END $$;