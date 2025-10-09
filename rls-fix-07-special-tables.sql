-- Step 7: Special case tables

-- SESSIONS TABLE
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_all_authenticated" ON sessions;
CREATE POLICY "sessions_all_authenticated" ON sessions FOR ALL
USING (auth.role() = 'authenticated' OR is_admin(auth.uid()));

-- INSTRUMENT_MAPPINGS TABLE
ALTER TABLE instrument_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "instrument_mappings_select_all" ON instrument_mappings;
DROP POLICY IF EXISTS "instrument_mappings_insert_admin" ON instrument_mappings;
DROP POLICY IF EXISTS "instrument_mappings_update_admin" ON instrument_mappings;

CREATE POLICY "instrument_mappings_select_all" ON instrument_mappings FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "instrument_mappings_insert_admin" ON instrument_mappings FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "instrument_mappings_update_admin" ON instrument_mappings FOR UPDATE
USING (is_admin(auth.uid()));

-- CONTRACT_EXTRACTION_PATTERNS TABLE
ALTER TABLE contract_extraction_patterns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contract_extraction_patterns_select_own_or_global" ON contract_extraction_patterns;
DROP POLICY IF EXISTS "contract_extraction_patterns_insert_own" ON contract_extraction_patterns;
DROP POLICY IF EXISTS "contract_extraction_patterns_update_own" ON contract_extraction_patterns;

CREATE POLICY "contract_extraction_patterns_select_own_or_global" ON contract_extraction_patterns FOR SELECT
USING (
  contract_extraction_patterns.is_global = true
  OR EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extraction_patterns.created_by)
  OR is_admin(auth.uid())
);

CREATE POLICY "contract_extraction_patterns_insert_own" ON contract_extraction_patterns FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extraction_patterns.created_by)
  OR is_admin(auth.uid())
);

CREATE POLICY "contract_extraction_patterns_update_own" ON contract_extraction_patterns FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contract_extraction_patterns.created_by)
  OR is_admin(auth.uid())
);

SELECT 'Special case tables secured!' as status;
