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

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


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
