-- Step 6: Admin-only tables

-- BETA_INVITE_CODES TABLE
ALTER TABLE beta_invite_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "beta_invite_codes_admin_all" ON beta_invite_codes;
CREATE POLICY "beta_invite_codes_admin_all" ON beta_invite_codes FOR ALL
USING (is_admin(auth.uid()));

-- BETA_INVITES TABLE
ALTER TABLE beta_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "beta_invites_admin_all" ON beta_invites;
CREATE POLICY "beta_invites_admin_all" ON beta_invites FOR ALL
USING (is_admin(auth.uid()));

-- BETA_EMAIL_TEMPLATES TABLE
ALTER TABLE beta_email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "beta_email_templates_admin_all" ON beta_email_templates;
CREATE POLICY "beta_email_templates_admin_all" ON beta_email_templates FOR ALL
USING (is_admin(auth.uid()));

-- FRAUD_PREVENTION_LOG TABLE
ALTER TABLE fraud_prevention_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fraud_prevention_log_admin_all" ON fraud_prevention_log;
CREATE POLICY "fraud_prevention_log_admin_all" ON fraud_prevention_log FOR ALL
USING (is_admin(auth.uid()));

SELECT 'Admin-only tables secured!' as status;
