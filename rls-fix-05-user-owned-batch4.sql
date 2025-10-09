-- Step 5: User-owned tables (Batch 4 of 4)

-- IMPORTED_CONTRACTS TABLE
ALTER TABLE imported_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "imported_contracts_select_own" ON imported_contracts;
DROP POLICY IF EXISTS "imported_contracts_insert_own" ON imported_contracts;
DROP POLICY IF EXISTS "imported_contracts_update_own" ON imported_contracts;
DROP POLICY IF EXISTS "imported_contracts_delete_own" ON imported_contracts;

CREATE POLICY "imported_contracts_select_own" ON imported_contracts FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = imported_contracts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "imported_contracts_insert_own" ON imported_contracts FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = imported_contracts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "imported_contracts_update_own" ON imported_contracts FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = imported_contracts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "imported_contracts_delete_own" ON imported_contracts FOR DELETE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = imported_contracts.user_id) OR is_admin(auth.uid()));

-- API_USAGE_TRACKING TABLE
ALTER TABLE api_usage_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_usage_tracking_select_own" ON api_usage_tracking;
DROP POLICY IF EXISTS "api_usage_tracking_insert_own" ON api_usage_tracking;

CREATE POLICY "api_usage_tracking_select_own" ON api_usage_tracking FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = api_usage_tracking.user_id) OR is_admin(auth.uid()));

CREATE POLICY "api_usage_tracking_insert_own" ON api_usage_tracking FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = api_usage_tracking.user_id) OR is_admin(auth.uid()));

-- API_USAGE_STATS TABLE
ALTER TABLE api_usage_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_usage_stats_select_own" ON api_usage_stats;
DROP POLICY IF EXISTS "api_usage_stats_insert_own" ON api_usage_stats;
DROP POLICY IF EXISTS "api_usage_stats_update_own" ON api_usage_stats;

CREATE POLICY "api_usage_stats_select_own" ON api_usage_stats FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = api_usage_stats.user_id) OR is_admin(auth.uid()));

CREATE POLICY "api_usage_stats_insert_own" ON api_usage_stats FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = api_usage_stats.user_id) OR is_admin(auth.uid()));

CREATE POLICY "api_usage_stats_update_own" ON api_usage_stats FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = api_usage_stats.user_id) OR is_admin(auth.uid()));

-- CONTRACT_EXTRACTIONS TABLE
ALTER TABLE contract_extractions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_extractions_select_own" ON contract_extractions;
DROP POLICY IF EXISTS "contract_extractions_insert_own" ON contract_extractions;
DROP POLICY IF EXISTS "contract_extractions_update_own" ON contract_extractions;

CREATE POLICY "contract_extractions_select_own" ON contract_extractions FOR SELECT
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extractions.user_id) OR is_admin(auth.uid()));

CREATE POLICY "contract_extractions_insert_own" ON contract_extractions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extractions.user_id) OR is_admin(auth.uid()));

CREATE POLICY "contract_extractions_update_own" ON contract_extractions FOR UPDATE
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extractions.user_id) OR is_admin(auth.uid()));

SELECT 'Batch 4 completed: Final user-owned tables secured!' as status;
