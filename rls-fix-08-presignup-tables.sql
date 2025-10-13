-- Step 8: Pre-signup tables

-- SMS_VERIFICATIONS TABLE
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sms_verifications_service_role_only" ON sms_verifications;
CREATE POLICY "sms_verifications_service_role_only" ON sms_verifications FOR ALL
USING (is_admin(auth.uid()));

-- PHONE_VERIFICATIONS TABLE
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "phone_verifications_service_role_only" ON phone_verifications;
CREATE POLICY "phone_verifications_service_role_only" ON phone_verifications FOR ALL
USING (is_admin(auth.uid()));

SELECT 'Pre-signup tables secured!' as status;
