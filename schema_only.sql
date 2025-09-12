--
-- PostgreSQL database dump
--
-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9
--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--
COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';
--
-- Name: beta_invite_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.beta_invite_codes (
ALTER TABLE public.beta_invite_codes OWNER TO neondb_owner;
--
-- Name: beta_invite_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.beta_invite_codes_id_seq
ALTER SEQUENCE public.beta_invite_codes_id_seq OWNER TO neondb_owner;
--
-- Name: beta_invite_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.beta_invite_codes_id_seq OWNED BY public.beta_invite_codes.id;
--
-- Name: beta_invites; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.beta_invites (
ALTER TABLE public.beta_invites OWNER TO neondb_owner;
--
-- Name: blocked_dates; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.blocked_dates (
ALTER TABLE public.blocked_dates OWNER TO neondb_owner;
--
-- Name: blocked_dates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.blocked_dates_id_seq
ALTER SEQUENCE public.blocked_dates_id_seq OWNER TO neondb_owner;
--
-- Name: blocked_dates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.blocked_dates_id_seq OWNED BY public.blocked_dates.id;
--
-- Name: booking_conflicts; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.booking_conflicts (
ALTER TABLE public.booking_conflicts OWNER TO neondb_owner;
--
-- Name: booking_conflicts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.booking_conflicts_id_seq
ALTER SEQUENCE public.booking_conflicts_id_seq OWNER TO neondb_owner;
--
-- Name: booking_conflicts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.booking_conflicts_id_seq OWNED BY public.booking_conflicts.id;
--
-- Name: booking_documents; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.booking_documents (
ALTER TABLE public.booking_documents OWNER TO neondb_owner;
--
-- Name: booking_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.booking_documents_id_seq
ALTER SEQUENCE public.booking_documents_id_seq OWNER TO neondb_owner;
--
-- Name: booking_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.booking_documents_id_seq OWNED BY public.booking_documents.id;
--
-- Name: bookings; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.bookings (
ALTER TABLE public.bookings OWNER TO neondb_owner;
--
-- Name: bookings_new_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.bookings_new_id_seq
ALTER SEQUENCE public.bookings_new_id_seq OWNER TO neondb_owner;
--
-- Name: bookings_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.bookings_new_id_seq OWNED BY public.bookings.id;
--
-- Name: client_communications; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.client_communications (
ALTER TABLE public.client_communications OWNER TO neondb_owner;
--
-- Name: client_communications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.client_communications_id_seq
ALTER SEQUENCE public.client_communications_id_seq OWNER TO neondb_owner;
--
-- Name: client_communications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.client_communications_id_seq OWNED BY public.client_communications.id;
--
-- Name: clients; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.clients (
ALTER TABLE public.clients OWNER TO neondb_owner;
--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.clients_id_seq
ALTER SEQUENCE public.clients_id_seq OWNER TO neondb_owner;
--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;
--
-- Name: compliance_documents; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.compliance_documents (
ALTER TABLE public.compliance_documents OWNER TO neondb_owner;
--
-- Name: compliance_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.compliance_documents_id_seq
ALTER SEQUENCE public.compliance_documents_id_seq OWNER TO neondb_owner;
--
-- Name: compliance_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.compliance_documents_id_seq OWNED BY public.compliance_documents.id;
--
-- Name: compliance_sent_log; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.compliance_sent_log (
ALTER TABLE public.compliance_sent_log OWNER TO neondb_owner;
--
-- Name: compliance_sent_log_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.compliance_sent_log_id_seq
ALTER SEQUENCE public.compliance_sent_log_id_seq OWNER TO neondb_owner;
--
-- Name: compliance_sent_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.compliance_sent_log_id_seq OWNED BY public.compliance_sent_log.id;
--
-- Name: conflict_resolutions; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.conflict_resolutions (
ALTER TABLE public.conflict_resolutions OWNER TO neondb_owner;
--
-- Name: conflict_resolutions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.conflict_resolutions_id_seq
ALTER SEQUENCE public.conflict_resolutions_id_seq OWNER TO neondb_owner;
--
-- Name: conflict_resolutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.conflict_resolutions_id_seq OWNED BY public.conflict_resolutions.id;
--
-- Name: contract_extraction_patterns; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.contract_extraction_patterns (
ALTER TABLE public.contract_extraction_patterns OWNER TO neondb_owner;
--
-- Name: contract_extraction_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.contract_extraction_patterns_id_seq
ALTER SEQUENCE public.contract_extraction_patterns_id_seq OWNER TO neondb_owner;
--
-- Name: contract_extraction_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.contract_extraction_patterns_id_seq OWNED BY public.contract_extraction_patterns.id;
--
-- Name: contract_extractions; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.contract_extractions (
ALTER TABLE public.contract_extractions OWNER TO neondb_owner;
--
-- Name: contract_extractions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.contract_extractions_id_seq
ALTER SEQUENCE public.contract_extractions_id_seq OWNER TO neondb_owner;
--
-- Name: contract_extractions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.contract_extractions_id_seq OWNED BY public.contract_extractions.id;
--
-- Name: contracts; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.contracts (
ALTER TABLE public.contracts OWNER TO neondb_owner;
--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.contracts_id_seq
ALTER SEQUENCE public.contracts_id_seq OWNER TO neondb_owner;
--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;
--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.email_templates (
ALTER TABLE public.email_templates OWNER TO neondb_owner;
--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.email_templates_id_seq
ALTER SEQUENCE public.email_templates_id_seq OWNER TO neondb_owner;
--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;
--
-- Name: event_sync_mapping; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.event_sync_mapping (
ALTER TABLE public.event_sync_mapping OWNER TO neondb_owner;
--
-- Name: event_sync_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.event_sync_mapping_id_seq
ALTER SEQUENCE public.event_sync_mapping_id_seq OWNER TO neondb_owner;
--
-- Name: event_sync_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.event_sync_mapping_id_seq OWNED BY public.event_sync_mapping.id;
--
-- Name: feedback; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.feedback (
ALTER TABLE public.feedback OWNER TO neondb_owner;
--
-- Name: feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.feedback_id_seq
ALTER SEQUENCE public.feedback_id_seq OWNER TO neondb_owner;
--
-- Name: feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.feedback_id_seq OWNED BY public.feedback.id;
--
-- Name: fraud_prevention_log; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.fraud_prevention_log (
ALTER TABLE public.fraud_prevention_log OWNER TO neondb_owner;
--
-- Name: fraud_prevention_log_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.fraud_prevention_log_id_seq
ALTER SEQUENCE public.fraud_prevention_log_id_seq OWNER TO neondb_owner;
--
-- Name: fraud_prevention_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.fraud_prevention_log_id_seq OWNED BY public.fraud_prevention_log.id;
--
-- Name: google_calendar_integration; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.google_calendar_integration (
ALTER TABLE public.google_calendar_integration OWNER TO neondb_owner;
--
-- Name: google_calendar_integration_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.google_calendar_integration_id_seq
ALTER SEQUENCE public.google_calendar_integration_id_seq OWNER TO neondb_owner;
--
-- Name: google_calendar_integration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.google_calendar_integration_id_seq OWNED BY public.google_calendar_integration.id;
--
-- Name: imported_contracts; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.imported_contracts (
ALTER TABLE public.imported_contracts OWNER TO neondb_owner;
--
-- Name: imported_contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.imported_contracts_id_seq
ALTER SEQUENCE public.imported_contracts_id_seq OWNER TO neondb_owner;
--
-- Name: imported_contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.imported_contracts_id_seq OWNED BY public.imported_contracts.id;
--
-- Name: instrument_mappings; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.instrument_mappings (
ALTER TABLE public.instrument_mappings OWNER TO neondb_owner;
--
-- Name: instrument_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.instrument_mappings_id_seq
ALTER SEQUENCE public.instrument_mappings_id_seq OWNER TO neondb_owner;
--
-- Name: instrument_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.instrument_mappings_id_seq OWNED BY public.instrument_mappings.id;
--
-- Name: invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.invoices (
ALTER TABLE public.invoices OWNER TO neondb_owner;
--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.invoices_id_seq
ALTER SEQUENCE public.invoices_id_seq OWNER TO neondb_owner;
--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;
--
-- Name: message_notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.message_notifications (
ALTER TABLE public.message_notifications OWNER TO neondb_owner;
--
-- Name: message_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.message_notifications_id_seq
ALTER SEQUENCE public.message_notifications_id_seq OWNER TO neondb_owner;
--
-- Name: message_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.message_notifications_id_seq OWNED BY public.message_notifications.id;
--
-- Name: phone_verifications; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.phone_verifications (
ALTER TABLE public.phone_verifications OWNER TO neondb_owner;
--
-- Name: phone_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.phone_verifications_id_seq
ALTER SEQUENCE public.phone_verifications_id_seq OWNER TO neondb_owner;
--
-- Name: phone_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.phone_verifications_id_seq OWNED BY public.phone_verifications.id;
--
-- Name: security_monitoring; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.security_monitoring (
ALTER TABLE public.security_monitoring OWNER TO neondb_owner;
--
-- Name: security_monitoring_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.security_monitoring_id_seq
ALTER SEQUENCE public.security_monitoring_id_seq OWNER TO neondb_owner;
--
-- Name: security_monitoring_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.security_monitoring_id_seq OWNED BY public.security_monitoring.id;
--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.session (
ALTER TABLE public.session OWNER TO neondb_owner;
--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.sessions (
ALTER TABLE public.sessions OWNER TO neondb_owner;
--
-- Name: sms_verifications; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.sms_verifications (
ALTER TABLE public.sms_verifications OWNER TO neondb_owner;
--
-- Name: sms_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.sms_verifications_id_seq
ALTER SEQUENCE public.sms_verifications_id_seq OWNER TO neondb_owner;
--
-- Name: sms_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.sms_verifications_id_seq OWNED BY public.sms_verifications.id;
--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.support_tickets (
ALTER TABLE public.support_tickets OWNER TO neondb_owner;
--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.support_tickets_id_seq
ALTER SEQUENCE public.support_tickets_id_seq OWNER TO neondb_owner;
--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;
--
-- Name: unparseable_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.unparseable_messages (
ALTER TABLE public.unparseable_messages OWNER TO neondb_owner;
--
-- Name: unparseable_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.unparseable_messages_id_seq
ALTER SEQUENCE public.unparseable_messages_id_seq OWNER TO neondb_owner;
--
-- Name: unparseable_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.unparseable_messages_id_seq OWNED BY public.unparseable_messages.id;
--
-- Name: user_activity; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.user_activity (
ALTER TABLE public.user_activity OWNER TO neondb_owner;
--
-- Name: user_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.user_activity_id_seq
ALTER SEQUENCE public.user_activity_id_seq OWNER TO neondb_owner;
--
-- Name: user_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.user_activity_id_seq OWNED BY public.user_activity.id;
--
-- Name: user_audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.user_audit_logs (
ALTER TABLE public.user_audit_logs OWNER TO neondb_owner;
--
-- Name: user_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.user_audit_logs_id_seq
ALTER SEQUENCE public.user_audit_logs_id_seq OWNER TO neondb_owner;
--
-- Name: user_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.user_audit_logs_id_seq OWNED BY public.user_audit_logs.id;
--
-- Name: user_login_history; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.user_login_history (
ALTER TABLE public.user_login_history OWNER TO neondb_owner;
--
-- Name: user_login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.user_login_history_id_seq
ALTER SEQUENCE public.user_login_history_id_seq OWNER TO neondb_owner;
--
-- Name: user_login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.user_login_history_id_seq OWNED BY public.user_login_history.id;
--
-- Name: user_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.user_messages (
ALTER TABLE public.user_messages OWNER TO neondb_owner;
--
-- Name: user_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.user_messages_id_seq
ALTER SEQUENCE public.user_messages_id_seq OWNER TO neondb_owner;
--
-- Name: user_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.user_messages_id_seq OWNED BY public.user_messages.id;
--
-- Name: user_security_status; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.user_security_status (
ALTER TABLE public.user_security_status OWNER TO neondb_owner;
--
-- Name: user_security_status_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.user_security_status_id_seq
ALTER SEQUENCE public.user_security_status_id_seq OWNER TO neondb_owner;
--
-- Name: user_security_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.user_security_status_id_seq OWNED BY public.user_security_status.id;
--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.user_settings (
ALTER TABLE public.user_settings OWNER TO neondb_owner;
--
-- Name: user_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--
CREATE SEQUENCE public.user_settings_id_seq
ALTER SEQUENCE public.user_settings_id_seq OWNER TO neondb_owner;
--
-- Name: user_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--
ALTER SEQUENCE public.user_settings_id_seq OWNED BY public.user_settings.id;
--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--
CREATE TABLE public.users (
ALTER TABLE public.users OWNER TO neondb_owner;
--
-- Name: beta_invite_codes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.beta_invite_codes ALTER COLUMN id SET DEFAULT nextval('public.beta_invite_codes_id_seq'::regclass);
--
-- Name: blocked_dates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.blocked_dates ALTER COLUMN id SET DEFAULT nextval('public.blocked_dates_id_seq'::regclass);
--
-- Name: booking_conflicts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.booking_conflicts ALTER COLUMN id SET DEFAULT nextval('public.booking_conflicts_id_seq'::regclass);
--
-- Name: booking_documents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.booking_documents ALTER COLUMN id SET DEFAULT nextval('public.booking_documents_id_seq'::regclass);
--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_new_id_seq'::regclass);
--
-- Name: client_communications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.client_communications ALTER COLUMN id SET DEFAULT nextval('public.client_communications_id_seq'::regclass);
--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);
--
-- Name: compliance_documents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.compliance_documents ALTER COLUMN id SET DEFAULT nextval('public.compliance_documents_id_seq'::regclass);
--
-- Name: compliance_sent_log id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.compliance_sent_log ALTER COLUMN id SET DEFAULT nextval('public.compliance_sent_log_id_seq'::regclass);
--
-- Name: conflict_resolutions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.conflict_resolutions ALTER COLUMN id SET DEFAULT nextval('public.conflict_resolutions_id_seq'::regclass);
--
-- Name: contract_extraction_patterns id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.contract_extraction_patterns ALTER COLUMN id SET DEFAULT nextval('public.contract_extraction_patterns_id_seq'::regclass);
--
-- Name: contract_extractions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.contract_extractions ALTER COLUMN id SET DEFAULT nextval('public.contract_extractions_id_seq'::regclass);
--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);
--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);
--
-- Name: event_sync_mapping id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.event_sync_mapping ALTER COLUMN id SET DEFAULT nextval('public.event_sync_mapping_id_seq'::regclass);
--
-- Name: feedback id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.feedback ALTER COLUMN id SET DEFAULT nextval('public.feedback_id_seq'::regclass);
--
-- Name: fraud_prevention_log id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.fraud_prevention_log ALTER COLUMN id SET DEFAULT nextval('public.fraud_prevention_log_id_seq'::regclass);
--
-- Name: google_calendar_integration id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.google_calendar_integration ALTER COLUMN id SET DEFAULT nextval('public.google_calendar_integration_id_seq'::regclass);
--
-- Name: imported_contracts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.imported_contracts ALTER COLUMN id SET DEFAULT nextval('public.imported_contracts_id_seq'::regclass);
--
-- Name: instrument_mappings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.instrument_mappings ALTER COLUMN id SET DEFAULT nextval('public.instrument_mappings_id_seq'::regclass);
--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);
--
-- Name: message_notifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.message_notifications ALTER COLUMN id SET DEFAULT nextval('public.message_notifications_id_seq'::regclass);
--
-- Name: phone_verifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.phone_verifications ALTER COLUMN id SET DEFAULT nextval('public.phone_verifications_id_seq'::regclass);
--
-- Name: security_monitoring id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.security_monitoring ALTER COLUMN id SET DEFAULT nextval('public.security_monitoring_id_seq'::regclass);
--
-- Name: sms_verifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.sms_verifications ALTER COLUMN id SET DEFAULT nextval('public.sms_verifications_id_seq'::regclass);
--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);
--
-- Name: unparseable_messages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.unparseable_messages ALTER COLUMN id SET DEFAULT nextval('public.unparseable_messages_id_seq'::regclass);
--
-- Name: user_activity id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_activity ALTER COLUMN id SET DEFAULT nextval('public.user_activity_id_seq'::regclass);
--
-- Name: user_audit_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.user_audit_logs_id_seq'::regclass);
--
-- Name: user_login_history id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_login_history ALTER COLUMN id SET DEFAULT nextval('public.user_login_history_id_seq'::regclass);
--
-- Name: user_messages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_messages ALTER COLUMN id SET DEFAULT nextval('public.user_messages_id_seq'::regclass);
--
-- Name: user_security_status id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_security_status ALTER COLUMN id SET DEFAULT nextval('public.user_security_status_id_seq'::regclass);
--
-- Name: user_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_settings ALTER COLUMN id SET DEFAULT nextval('public.user_settings_id_seq'::regclass);
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
--
-- Name: beta_invite_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: blocked_dates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: booking_conflicts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: booking_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: bookings_new_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: client_communications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: compliance_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: compliance_sent_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: conflict_resolutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: contract_extraction_patterns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: contract_extractions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: event_sync_mapping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: fraud_prevention_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: google_calendar_integration_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: imported_contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: instrument_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: message_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: phone_verifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: security_monitoring_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: sms_verifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: support_tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: unparseable_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: user_activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: user_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: user_login_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: user_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: user_security_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: user_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--
--
-- Name: beta_invite_codes beta_invite_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.beta_invite_codes
--
-- Name: beta_invite_codes beta_invite_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.beta_invite_codes
--
-- Name: beta_invites beta_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.beta_invites
--
-- Name: blocked_dates blocked_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.blocked_dates
--
-- Name: booking_conflicts booking_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.booking_conflicts
--
-- Name: booking_documents booking_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.booking_documents
--
-- Name: bookings bookings_collaboration_token_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.bookings
--
-- Name: bookings bookings_email_hash_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.bookings
--
-- Name: bookings bookings_new_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.bookings
--
-- Name: client_communications client_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.client_communications
--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.clients
--
-- Name: compliance_documents compliance_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.compliance_documents
--
-- Name: compliance_sent_log compliance_sent_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.compliance_sent_log
--
-- Name: conflict_resolutions conflict_resolutions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.conflict_resolutions
--
-- Name: contract_extraction_patterns contract_extraction_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.contract_extraction_patterns
--
-- Name: contract_extractions contract_extractions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.contract_extractions
--
-- Name: contracts contracts_contract_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.contracts
--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.contracts
--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.email_templates
--
-- Name: event_sync_mapping event_sync_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.event_sync_mapping
--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.feedback
--
-- Name: fraud_prevention_log fraud_prevention_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.fraud_prevention_log
--
-- Name: google_calendar_integration google_calendar_integration_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.google_calendar_integration
--
-- Name: google_calendar_integration google_calendar_integration_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.google_calendar_integration
--
-- Name: imported_contracts imported_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.imported_contracts
--
-- Name: instrument_mappings instrument_mappings_instrument_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.instrument_mappings
--
-- Name: instrument_mappings instrument_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.instrument_mappings
--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.invoices
--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.invoices
--
-- Name: message_notifications message_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.message_notifications
--
-- Name: phone_verifications phone_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.phone_verifications
--
-- Name: security_monitoring security_monitoring_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.security_monitoring
--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.session
--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.sessions
--
-- Name: sms_verifications sms_verifications_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.sms_verifications
--
-- Name: sms_verifications sms_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.sms_verifications
--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.support_tickets
--
-- Name: unparseable_messages unparseable_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.unparseable_messages
--
-- Name: user_activity user_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_activity
--
-- Name: user_audit_logs user_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_audit_logs
--
-- Name: user_login_history user_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_login_history
--
-- Name: user_messages user_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_messages
--
-- Name: user_security_status user_security_status_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_security_status
--
-- Name: user_security_status user_security_status_user_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_security_status
--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_settings
--
-- Name: user_settings user_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_settings
--
-- Name: users users_email_prefix_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.users
--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.users
--
-- Name: users users_firebase_uid_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.users
--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.users
--
-- Name: users users_quick_add_token_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.users
--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);
--
-- Name: idx_booking_documents_booking; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_booking_documents_booking ON public.booking_documents USING btree (booking_id);
--
-- Name: idx_booking_documents_user; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_booking_documents_user ON public.booking_documents USING btree (user_id);
--
-- Name: idx_client_communications_booking; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_client_communications_booking ON public.client_communications USING btree (booking_id);
--
-- Name: idx_client_communications_client_email; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_client_communications_client_email ON public.client_communications USING btree (client_email);
--
-- Name: idx_client_communications_sent_at; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_client_communications_sent_at ON public.client_communications USING btree (sent_at);
--
-- Name: idx_client_communications_user; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_client_communications_user ON public.client_communications USING btree (user_id);
--
-- Name: idx_contracts_signed_at; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_contracts_signed_at ON public.contracts USING btree (signed_at);
--
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);
--
-- Name: idx_feedback_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_feedback_created_at ON public.feedback USING btree (created_at);
--
-- Name: idx_feedback_status; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_feedback_status ON public.feedback USING btree (status);
--
-- Name: idx_feedback_user_id; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_feedback_user_id ON public.feedback USING btree (user_id);
--
-- Name: idx_security_created_at; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_security_created_at ON public.security_monitoring USING btree (created_at);
--
-- Name: idx_security_suspicious; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_security_suspicious ON public.security_monitoring USING btree (suspicious);
--
-- Name: idx_security_user_service; Type: INDEX; Schema: public; Owner: neondb_owner
--
CREATE INDEX idx_security_user_service ON public.security_monitoring USING btree (user_id, api_service);
--
-- Name: contract_extractions contract_extractions_imported_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.contract_extractions
--
-- Name: imported_contracts imported_contracts_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.imported_contracts
--
-- Name: invoices invoices_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.invoices
--
-- Name: message_notifications message_notifications_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.message_notifications
--
-- Name: message_notifications message_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.message_notifications
--
-- Name: security_monitoring security_monitoring_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.security_monitoring
--
-- Name: user_security_status user_security_status_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--
ALTER TABLE ONLY public.user_security_status
--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--
ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;
--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--
ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;
--
-- PostgreSQL database dump complete
--
