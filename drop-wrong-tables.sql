-- Drop the incorrectly created tables from production
-- Run this in Supabase Production Dashboard → SQL Editor

-- Drop tables in order to handle foreign key constraints
DROP TABLE IF EXISTS public.conflict_resolutions CASCADE;
DROP TABLE IF EXISTS public.booking_conflicts CASCADE;
DROP TABLE IF EXISTS public.sms_verifications CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.unparseable_messages CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.contracts CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

-- Drop any sequences that were created
DROP SEQUENCE IF EXISTS public.clients_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.bookings_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.contracts_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.invoices_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.unparseable_messages_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.feedback_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.email_templates_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.sms_verifications_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.booking_conflicts_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.conflict_resolutions_id_seq CASCADE;

-- Success message
SELECT 'Wrong tables dropped successfully - ready for correct schema!' as status;