--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_security_status DROP CONSTRAINT IF EXISTS user_security_status_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.security_monitoring DROP CONSTRAINT IF EXISTS security_monitoring_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.message_notifications DROP CONSTRAINT IF EXISTS message_notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.message_notifications DROP CONSTRAINT IF EXISTS message_notifications_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_booking_id_bookings_id_fk;
ALTER TABLE IF EXISTS ONLY public.imported_contracts DROP CONSTRAINT IF EXISTS imported_contracts_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.contract_extractions DROP CONSTRAINT IF EXISTS contract_extractions_imported_contract_id_fkey;
DROP INDEX IF EXISTS public.idx_security_user_service;
DROP INDEX IF EXISTS public.idx_security_suspicious;
DROP INDEX IF EXISTS public.idx_security_created_at;
DROP INDEX IF EXISTS public.idx_feedback_user_id;
DROP INDEX IF EXISTS public.idx_feedback_status;
DROP INDEX IF EXISTS public.idx_feedback_created_at;
DROP INDEX IF EXISTS public.idx_contracts_status;
DROP INDEX IF EXISTS public.idx_contracts_signed_at;
DROP INDEX IF EXISTS public.idx_client_communications_user;
DROP INDEX IF EXISTS public.idx_client_communications_sent_at;
DROP INDEX IF EXISTS public.idx_client_communications_client_email;
DROP INDEX IF EXISTS public.idx_client_communications_booking;
DROP INDEX IF EXISTS public.idx_booking_documents_user;
DROP INDEX IF EXISTS public.idx_booking_documents_booking;
DROP INDEX IF EXISTS public."IDX_session_expire";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_quick_add_token_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_firebase_uid_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_prefix_key;
ALTER TABLE IF EXISTS ONLY public.user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_unique;
ALTER TABLE IF EXISTS ONLY public.user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.user_security_status DROP CONSTRAINT IF EXISTS user_security_status_user_id_key;
ALTER TABLE IF EXISTS ONLY public.user_security_status DROP CONSTRAINT IF EXISTS user_security_status_pkey;
ALTER TABLE IF EXISTS ONLY public.user_messages DROP CONSTRAINT IF EXISTS user_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.user_login_history DROP CONSTRAINT IF EXISTS user_login_history_pkey;
ALTER TABLE IF EXISTS ONLY public.user_audit_logs DROP CONSTRAINT IF EXISTS user_audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.user_activity DROP CONSTRAINT IF EXISTS user_activity_pkey;
ALTER TABLE IF EXISTS ONLY public.unparseable_messages DROP CONSTRAINT IF EXISTS unparseable_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_pkey;
ALTER TABLE IF EXISTS ONLY public.sms_verifications DROP CONSTRAINT IF EXISTS sms_verifications_pkey;
ALTER TABLE IF EXISTS ONLY public.sms_verifications DROP CONSTRAINT IF EXISTS sms_verifications_email_key;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.session DROP CONSTRAINT IF EXISTS session_pkey;
ALTER TABLE IF EXISTS ONLY public.security_monitoring DROP CONSTRAINT IF EXISTS security_monitoring_pkey;
ALTER TABLE IF EXISTS ONLY public.phone_verifications DROP CONSTRAINT IF EXISTS phone_verifications_pkey;
ALTER TABLE IF EXISTS ONLY public.message_notifications DROP CONSTRAINT IF EXISTS message_notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_unique;
ALTER TABLE IF EXISTS ONLY public.instrument_mappings DROP CONSTRAINT IF EXISTS instrument_mappings_pkey;
ALTER TABLE IF EXISTS ONLY public.instrument_mappings DROP CONSTRAINT IF EXISTS instrument_mappings_instrument_unique;
ALTER TABLE IF EXISTS ONLY public.imported_contracts DROP CONSTRAINT IF EXISTS imported_contracts_pkey;
ALTER TABLE IF EXISTS ONLY public.google_calendar_integration DROP CONSTRAINT IF EXISTS google_calendar_integration_user_id_key;
ALTER TABLE IF EXISTS ONLY public.google_calendar_integration DROP CONSTRAINT IF EXISTS google_calendar_integration_pkey;
ALTER TABLE IF EXISTS ONLY public.fraud_prevention_log DROP CONSTRAINT IF EXISTS fraud_prevention_log_pkey;
ALTER TABLE IF EXISTS ONLY public.feedback DROP CONSTRAINT IF EXISTS feedback_pkey;
ALTER TABLE IF EXISTS ONLY public.event_sync_mapping DROP CONSTRAINT IF EXISTS event_sync_mapping_pkey;
ALTER TABLE IF EXISTS ONLY public.email_templates DROP CONSTRAINT IF EXISTS email_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.contracts DROP CONSTRAINT IF EXISTS contracts_pkey;
ALTER TABLE IF EXISTS ONLY public.contracts DROP CONSTRAINT IF EXISTS contracts_contract_number_unique;
ALTER TABLE IF EXISTS ONLY public.contract_extractions DROP CONSTRAINT IF EXISTS contract_extractions_pkey;
ALTER TABLE IF EXISTS ONLY public.contract_extraction_patterns DROP CONSTRAINT IF EXISTS contract_extraction_patterns_pkey;
ALTER TABLE IF EXISTS ONLY public.conflict_resolutions DROP CONSTRAINT IF EXISTS conflict_resolutions_pkey;
ALTER TABLE IF EXISTS ONLY public.compliance_sent_log DROP CONSTRAINT IF EXISTS compliance_sent_log_pkey;
ALTER TABLE IF EXISTS ONLY public.compliance_documents DROP CONSTRAINT IF EXISTS compliance_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_pkey;
ALTER TABLE IF EXISTS ONLY public.client_communications DROP CONSTRAINT IF EXISTS client_communications_pkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_new_pkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_email_hash_key;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_collaboration_token_key;
ALTER TABLE IF EXISTS ONLY public.booking_documents DROP CONSTRAINT IF EXISTS booking_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.booking_conflicts DROP CONSTRAINT IF EXISTS booking_conflicts_pkey;
ALTER TABLE IF EXISTS ONLY public.blocked_dates DROP CONSTRAINT IF EXISTS blocked_dates_pkey;
ALTER TABLE IF EXISTS ONLY public.beta_invites DROP CONSTRAINT IF EXISTS beta_invites_pkey;
ALTER TABLE IF EXISTS ONLY public.beta_invite_codes DROP CONSTRAINT IF EXISTS beta_invite_codes_pkey;
ALTER TABLE IF EXISTS ONLY public.beta_invite_codes DROP CONSTRAINT IF EXISTS beta_invite_codes_code_key;
ALTER TABLE IF EXISTS public.user_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_security_status ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_login_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_activity ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.unparseable_messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.support_tickets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sms_verifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.security_monitoring ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.phone_verifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.message_notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.invoices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.instrument_mappings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.imported_contracts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.google_calendar_integration ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fraud_prevention_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.feedback ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.event_sync_mapping ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.email_templates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.contracts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.contract_extractions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.contract_extraction_patterns ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.conflict_resolutions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.compliance_sent_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.compliance_documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.clients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.client_communications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.bookings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.booking_documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.booking_conflicts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.blocked_dates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.beta_invite_codes ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.user_settings_id_seq;
DROP TABLE IF EXISTS public.user_settings;
DROP SEQUENCE IF EXISTS public.user_security_status_id_seq;
DROP TABLE IF EXISTS public.user_security_status;
DROP SEQUENCE IF EXISTS public.user_messages_id_seq;
DROP TABLE IF EXISTS public.user_messages;
DROP SEQUENCE IF EXISTS public.user_login_history_id_seq;
DROP TABLE IF EXISTS public.user_login_history;
DROP SEQUENCE IF EXISTS public.user_audit_logs_id_seq;
DROP TABLE IF EXISTS public.user_audit_logs;
DROP SEQUENCE IF EXISTS public.user_activity_id_seq;
DROP TABLE IF EXISTS public.user_activity;
DROP SEQUENCE IF EXISTS public.unparseable_messages_id_seq;
DROP TABLE IF EXISTS public.unparseable_messages;
DROP SEQUENCE IF EXISTS public.support_tickets_id_seq;
DROP TABLE IF EXISTS public.support_tickets;
DROP SEQUENCE IF EXISTS public.sms_verifications_id_seq;
DROP TABLE IF EXISTS public.sms_verifications;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.session;
DROP SEQUENCE IF EXISTS public.security_monitoring_id_seq;
DROP TABLE IF EXISTS public.security_monitoring;
DROP SEQUENCE IF EXISTS public.phone_verifications_id_seq;
DROP TABLE IF EXISTS public.phone_verifications;
DROP SEQUENCE IF EXISTS public.message_notifications_id_seq;
DROP TABLE IF EXISTS public.message_notifications;
DROP SEQUENCE IF EXISTS public.invoices_id_seq;
DROP TABLE IF EXISTS public.invoices;
DROP SEQUENCE IF EXISTS public.instrument_mappings_id_seq;
DROP TABLE IF EXISTS public.instrument_mappings;
DROP SEQUENCE IF EXISTS public.imported_contracts_id_seq;
DROP TABLE IF EXISTS public.imported_contracts;
DROP SEQUENCE IF EXISTS public.google_calendar_integration_id_seq;
DROP TABLE IF EXISTS public.google_calendar_integration;
DROP SEQUENCE IF EXISTS public.fraud_prevention_log_id_seq;
DROP TABLE IF EXISTS public.fraud_prevention_log;
DROP SEQUENCE IF EXISTS public.feedback_id_seq;
DROP TABLE IF EXISTS public.feedback;
DROP SEQUENCE IF EXISTS public.event_sync_mapping_id_seq;
DROP TABLE IF EXISTS public.event_sync_mapping;
DROP SEQUENCE IF EXISTS public.email_templates_id_seq;
DROP TABLE IF EXISTS public.email_templates;
DROP SEQUENCE IF EXISTS public.contracts_id_seq;
DROP TABLE IF EXISTS public.contracts;
DROP SEQUENCE IF EXISTS public.contract_extractions_id_seq;
DROP TABLE IF EXISTS public.contract_extractions;
DROP SEQUENCE IF EXISTS public.contract_extraction_patterns_id_seq;
DROP TABLE IF EXISTS public.contract_extraction_patterns;
DROP SEQUENCE IF EXISTS public.conflict_resolutions_id_seq;
DROP TABLE IF EXISTS public.conflict_resolutions;
DROP SEQUENCE IF EXISTS public.compliance_sent_log_id_seq;
DROP TABLE IF EXISTS public.compliance_sent_log;
DROP SEQUENCE IF EXISTS public.compliance_documents_id_seq;
DROP TABLE IF EXISTS public.compliance_documents;
DROP SEQUENCE IF EXISTS public.clients_id_seq;
DROP TABLE IF EXISTS public.clients;
DROP SEQUENCE IF EXISTS public.client_communications_id_seq;
DROP TABLE IF EXISTS public.client_communications;
DROP SEQUENCE IF EXISTS public.bookings_new_id_seq;
DROP TABLE IF EXISTS public.bookings;
DROP SEQUENCE IF EXISTS public.booking_documents_id_seq;
DROP TABLE IF EXISTS public.booking_documents;
DROP SEQUENCE IF EXISTS public.booking_conflicts_id_seq;
DROP TABLE IF EXISTS public.booking_conflicts;
DROP SEQUENCE IF EXISTS public.blocked_dates_id_seq;
DROP TABLE IF EXISTS public.blocked_dates;
DROP TABLE IF EXISTS public.beta_invites;
DROP SEQUENCE IF EXISTS public.beta_invite_codes_id_seq;
DROP TABLE IF EXISTS public.beta_invite_codes;
DROP EXTENSION IF EXISTS "uuid-ossp";
--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: beta_invite_codes; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: beta_invite_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.beta_invite_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: beta_invite_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.beta_invite_codes_id_seq OWNED BY public.beta_invite_codes.id;


--
-- Name: beta_invites; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: blocked_dates; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: blocked_dates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blocked_dates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blocked_dates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blocked_dates_id_seq OWNED BY public.blocked_dates.id;


--
-- Name: booking_conflicts; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: booking_conflicts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_conflicts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: booking_conflicts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.booking_conflicts_id_seq OWNED BY public.booking_conflicts.id;


--
-- Name: booking_documents; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: booking_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: booking_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.booking_documents_id_seq OWNED BY public.booking_documents.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: bookings_new_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_new_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_new_id_seq OWNED BY public.bookings.id;


--
-- Name: client_communications; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: client_communications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_communications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_communications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_communications_id_seq OWNED BY public.client_communications.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: compliance_documents; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: compliance_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_documents_id_seq OWNED BY public.compliance_documents.id;


--
-- Name: compliance_sent_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.compliance_sent_log (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    user_id character varying NOT NULL,
    recipient_email character varying NOT NULL,
    document_ids integer[] NOT NULL,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: compliance_sent_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.compliance_sent_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compliance_sent_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.compliance_sent_log_id_seq OWNED BY public.compliance_sent_log.id;


--
-- Name: conflict_resolutions; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: conflict_resolutions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conflict_resolutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conflict_resolutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conflict_resolutions_id_seq OWNED BY public.conflict_resolutions.id;


--
-- Name: contract_extraction_patterns; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: contract_extraction_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contract_extraction_patterns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contract_extraction_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contract_extraction_patterns_id_seq OWNED BY public.contract_extraction_patterns.id;


--
-- Name: contract_extractions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_extractions (
    id integer NOT NULL,
    imported_contract_id integer,
    extracted_data jsonb,
    extraction_time_seconds integer,
    user_id character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: contract_extractions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contract_extractions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contract_extractions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contract_extractions_id_seq OWNED BY public.contract_extractions.id;


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: event_sync_mapping; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: event_sync_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_sync_mapping_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_sync_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_sync_mapping_id_seq OWNED BY public.event_sync_mapping.id;


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

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
    CONSTRAINT feedback_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT feedback_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[]))),
    CONSTRAINT feedback_type_check CHECK (((type)::text = ANY ((ARRAY['bug'::character varying, 'feature'::character varying, 'improvement'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_id_seq OWNED BY public.feedback.id;


--
-- Name: fraud_prevention_log; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: fraud_prevention_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fraud_prevention_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fraud_prevention_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fraud_prevention_log_id_seq OWNED BY public.fraud_prevention_log.id;


--
-- Name: google_calendar_integration; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: google_calendar_integration_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.google_calendar_integration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: google_calendar_integration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.google_calendar_integration_id_seq OWNED BY public.google_calendar_integration.id;


--
-- Name: imported_contracts; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: imported_contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imported_contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imported_contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imported_contracts_id_seq OWNED BY public.imported_contracts.id;


--
-- Name: instrument_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instrument_mappings (
    id integer NOT NULL,
    instrument character varying NOT NULL,
    gig_types text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: instrument_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.instrument_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: instrument_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.instrument_mappings_id_seq OWNED BY public.instrument_mappings.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: message_notifications; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: message_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_notifications_id_seq OWNED BY public.message_notifications.id;


--
-- Name: phone_verifications; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: phone_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.phone_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: phone_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.phone_verifications_id_seq OWNED BY public.phone_verifications.id;


--
-- Name: security_monitoring; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: security_monitoring_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.security_monitoring_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: security_monitoring_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.security_monitoring_id_seq OWNED BY public.security_monitoring.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: sms_verifications; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: sms_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sms_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sms_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sms_verifications_id_seq OWNED BY public.sms_verifications.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: unparseable_messages; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: unparseable_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unparseable_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unparseable_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unparseable_messages_id_seq OWNED BY public.unparseable_messages.id;


--
-- Name: user_activity; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: user_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_activity_id_seq OWNED BY public.user_activity.id;


--
-- Name: user_audit_logs; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: user_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_audit_logs_id_seq OWNED BY public.user_audit_logs.id;


--
-- Name: user_login_history; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: user_login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_login_history_id_seq OWNED BY public.user_login_history.id;


--
-- Name: user_messages; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: user_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_messages_id_seq OWNED BY public.user_messages.id;


--
-- Name: user_security_status; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: user_security_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_security_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_security_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_security_status_id_seq OWNED BY public.user_security_status.id;


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: user_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_settings_id_seq OWNED BY public.user_settings.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

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
    settings_completed boolean DEFAULT false
);


--
-- Name: beta_invite_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_invite_codes ALTER COLUMN id SET DEFAULT nextval('public.beta_invite_codes_id_seq'::regclass);


--
-- Name: blocked_dates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_dates ALTER COLUMN id SET DEFAULT nextval('public.blocked_dates_id_seq'::regclass);


--
-- Name: booking_conflicts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_conflicts ALTER COLUMN id SET DEFAULT nextval('public.booking_conflicts_id_seq'::regclass);


--
-- Name: booking_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_documents ALTER COLUMN id SET DEFAULT nextval('public.booking_documents_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_new_id_seq'::regclass);


--
-- Name: client_communications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_communications ALTER COLUMN id SET DEFAULT nextval('public.client_communications_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: compliance_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_documents ALTER COLUMN id SET DEFAULT nextval('public.compliance_documents_id_seq'::regclass);


--
-- Name: compliance_sent_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_sent_log ALTER COLUMN id SET DEFAULT nextval('public.compliance_sent_log_id_seq'::regclass);


--
-- Name: conflict_resolutions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conflict_resolutions ALTER COLUMN id SET DEFAULT nextval('public.conflict_resolutions_id_seq'::regclass);


--
-- Name: contract_extraction_patterns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_extraction_patterns ALTER COLUMN id SET DEFAULT nextval('public.contract_extraction_patterns_id_seq'::regclass);


--
-- Name: contract_extractions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_extractions ALTER COLUMN id SET DEFAULT nextval('public.contract_extractions_id_seq'::regclass);


--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: event_sync_mapping id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_sync_mapping ALTER COLUMN id SET DEFAULT nextval('public.event_sync_mapping_id_seq'::regclass);


--
-- Name: feedback id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback ALTER COLUMN id SET DEFAULT nextval('public.feedback_id_seq'::regclass);


--
-- Name: fraud_prevention_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_prevention_log ALTER COLUMN id SET DEFAULT nextval('public.fraud_prevention_log_id_seq'::regclass);


--
-- Name: google_calendar_integration id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_integration ALTER COLUMN id SET DEFAULT nextval('public.google_calendar_integration_id_seq'::regclass);


--
-- Name: imported_contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_contracts ALTER COLUMN id SET DEFAULT nextval('public.imported_contracts_id_seq'::regclass);


--
-- Name: instrument_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_mappings ALTER COLUMN id SET DEFAULT nextval('public.instrument_mappings_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: message_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_notifications ALTER COLUMN id SET DEFAULT nextval('public.message_notifications_id_seq'::regclass);


--
-- Name: phone_verifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_verifications ALTER COLUMN id SET DEFAULT nextval('public.phone_verifications_id_seq'::regclass);


--
-- Name: security_monitoring id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_monitoring ALTER COLUMN id SET DEFAULT nextval('public.security_monitoring_id_seq'::regclass);


--
-- Name: sms_verifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_verifications ALTER COLUMN id SET DEFAULT nextval('public.sms_verifications_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);


--
-- Name: unparseable_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unparseable_messages ALTER COLUMN id SET DEFAULT nextval('public.unparseable_messages_id_seq'::regclass);


--
-- Name: user_activity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity ALTER COLUMN id SET DEFAULT nextval('public.user_activity_id_seq'::regclass);


--
-- Name: user_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.user_audit_logs_id_seq'::regclass);


--
-- Name: user_login_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_history ALTER COLUMN id SET DEFAULT nextval('public.user_login_history_id_seq'::regclass);


--
-- Name: user_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_messages ALTER COLUMN id SET DEFAULT nextval('public.user_messages_id_seq'::regclass);


--
-- Name: user_security_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_security_status ALTER COLUMN id SET DEFAULT nextval('public.user_security_status_id_seq'::regclass);


--
-- Name: user_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings ALTER COLUMN id SET DEFAULT nextval('public.user_settings_id_seq'::regclass);


--
-- Name: beta_invite_codes beta_invite_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_invite_codes
    ADD CONSTRAINT beta_invite_codes_code_key UNIQUE (code);


--
-- Name: beta_invite_codes beta_invite_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_invite_codes
    ADD CONSTRAINT beta_invite_codes_pkey PRIMARY KEY (id);


--
-- Name: beta_invites beta_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_invites
    ADD CONSTRAINT beta_invites_pkey PRIMARY KEY (email);


--
-- Name: blocked_dates blocked_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_dates
    ADD CONSTRAINT blocked_dates_pkey PRIMARY KEY (id);


--
-- Name: booking_conflicts booking_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_conflicts
    ADD CONSTRAINT booking_conflicts_pkey PRIMARY KEY (id);


--
-- Name: booking_documents booking_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_documents
    ADD CONSTRAINT booking_documents_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_collaboration_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_collaboration_token_key UNIQUE (collaboration_token);


--
-- Name: bookings bookings_email_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_email_hash_key UNIQUE (email_hash);


--
-- Name: bookings bookings_new_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_new_pkey PRIMARY KEY (id);


--
-- Name: client_communications client_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_communications
    ADD CONSTRAINT client_communications_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: compliance_documents compliance_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_documents
    ADD CONSTRAINT compliance_documents_pkey PRIMARY KEY (id);


--
-- Name: compliance_sent_log compliance_sent_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.compliance_sent_log
    ADD CONSTRAINT compliance_sent_log_pkey PRIMARY KEY (id);


--
-- Name: conflict_resolutions conflict_resolutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conflict_resolutions
    ADD CONSTRAINT conflict_resolutions_pkey PRIMARY KEY (id);


--
-- Name: contract_extraction_patterns contract_extraction_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_extraction_patterns
    ADD CONSTRAINT contract_extraction_patterns_pkey PRIMARY KEY (id);


--
-- Name: contract_extractions contract_extractions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_extractions
    ADD CONSTRAINT contract_extractions_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_contract_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_contract_number_unique UNIQUE (contract_number);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: event_sync_mapping event_sync_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_sync_mapping
    ADD CONSTRAINT event_sync_mapping_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: fraud_prevention_log fraud_prevention_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fraud_prevention_log
    ADD CONSTRAINT fraud_prevention_log_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_integration google_calendar_integration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_integration
    ADD CONSTRAINT google_calendar_integration_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_integration google_calendar_integration_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_integration
    ADD CONSTRAINT google_calendar_integration_user_id_key UNIQUE (user_id);


--
-- Name: imported_contracts imported_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_contracts
    ADD CONSTRAINT imported_contracts_pkey PRIMARY KEY (id);


--
-- Name: instrument_mappings instrument_mappings_instrument_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_mappings
    ADD CONSTRAINT instrument_mappings_instrument_unique UNIQUE (instrument);


--
-- Name: instrument_mappings instrument_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument_mappings
    ADD CONSTRAINT instrument_mappings_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: message_notifications message_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_notifications
    ADD CONSTRAINT message_notifications_pkey PRIMARY KEY (id);


--
-- Name: phone_verifications phone_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_verifications
    ADD CONSTRAINT phone_verifications_pkey PRIMARY KEY (id);


--
-- Name: security_monitoring security_monitoring_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_monitoring
    ADD CONSTRAINT security_monitoring_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: sms_verifications sms_verifications_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_verifications
    ADD CONSTRAINT sms_verifications_email_key UNIQUE (email);


--
-- Name: sms_verifications sms_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_verifications
    ADD CONSTRAINT sms_verifications_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: unparseable_messages unparseable_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unparseable_messages
    ADD CONSTRAINT unparseable_messages_pkey PRIMARY KEY (id);


--
-- Name: user_activity user_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity
    ADD CONSTRAINT user_activity_pkey PRIMARY KEY (id);


--
-- Name: user_audit_logs user_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_audit_logs
    ADD CONSTRAINT user_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: user_login_history user_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_login_history
    ADD CONSTRAINT user_login_history_pkey PRIMARY KEY (id);


--
-- Name: user_messages user_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_messages
    ADD CONSTRAINT user_messages_pkey PRIMARY KEY (id);


--
-- Name: user_security_status user_security_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_security_status
    ADD CONSTRAINT user_security_status_pkey PRIMARY KEY (id);


--
-- Name: user_security_status user_security_status_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_security_status
    ADD CONSTRAINT user_security_status_user_id_key UNIQUE (user_id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);


--
-- Name: users users_email_prefix_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_prefix_key UNIQUE (email_prefix);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_firebase_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_quick_add_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_quick_add_token_key UNIQUE (quick_add_token);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: idx_booking_documents_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_documents_booking ON public.booking_documents USING btree (booking_id);


--
-- Name: idx_booking_documents_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_documents_user ON public.booking_documents USING btree (user_id);


--
-- Name: idx_client_communications_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_booking ON public.client_communications USING btree (booking_id);


--
-- Name: idx_client_communications_client_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_client_email ON public.client_communications USING btree (client_email);


--
-- Name: idx_client_communications_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_sent_at ON public.client_communications USING btree (sent_at);


--
-- Name: idx_client_communications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_user ON public.client_communications USING btree (user_id);


--
-- Name: idx_contracts_signed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_signed_at ON public.contracts USING btree (signed_at);


--
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);


--
-- Name: idx_feedback_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_created_at ON public.feedback USING btree (created_at);


--
-- Name: idx_feedback_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_status ON public.feedback USING btree (status);


--
-- Name: idx_feedback_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_user_id ON public.feedback USING btree (user_id);


--
-- Name: idx_security_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_created_at ON public.security_monitoring USING btree (created_at);


--
-- Name: idx_security_suspicious; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_suspicious ON public.security_monitoring USING btree (suspicious);


--
-- Name: idx_security_user_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_user_service ON public.security_monitoring USING btree (user_id, api_service);


--
-- Name: contract_extractions contract_extractions_imported_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_extractions
    ADD CONSTRAINT contract_extractions_imported_contract_id_fkey FOREIGN KEY (imported_contract_id) REFERENCES public.imported_contracts(id);


--
-- Name: imported_contracts imported_contracts_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imported_contracts
    ADD CONSTRAINT imported_contracts_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: invoices invoices_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: message_notifications message_notifications_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_notifications
    ADD CONSTRAINT message_notifications_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: message_notifications message_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_notifications
    ADD CONSTRAINT message_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: security_monitoring security_monitoring_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_monitoring
    ADD CONSTRAINT security_monitoring_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_security_status user_security_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_security_status
    ADD CONSTRAINT user_security_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

