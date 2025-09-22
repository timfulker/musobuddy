-- MusoBuddy RLS Policies - Run in Supabase SQL Editor
-- CRITICAL: Run these immediately to secure your data

-- 1. Create admin helper function
CREATE OR REPLACE FUNCTION is_admin(uid uuid) 
RETURNS boolean AS $$ 
  SELECT COALESCE((SELECT is_admin FROM users WHERE supabase_uid = uid::text), false) 
$$ LANGUAGE sql STABLE;

-- 2. Users table policies
CREATE POLICY "users_select_own" ON users FOR SELECT 
USING (supabase_uid = auth.uid()::text OR is_admin(auth.uid()));

CREATE POLICY "users_update_own" ON users FOR UPDATE 
USING (supabase_uid = auth.uid()::text OR is_admin(auth.uid()));

CREATE POLICY "users_insert_own" ON users FOR INSERT 
WITH CHECK (supabase_uid = auth.uid()::text OR is_admin(auth.uid()));

-- 3. User Settings table policies
CREATE POLICY "user_settings_select_own" ON user_settings FOR SELECT 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_settings.user_id) OR is_admin(auth.uid()));

CREATE POLICY "user_settings_insert_own" ON user_settings FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_settings.user_id) OR is_admin(auth.uid()));

CREATE POLICY "user_settings_update_own" ON user_settings FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_settings.user_id) OR is_admin(auth.uid()));

CREATE POLICY "user_settings_delete_own" ON user_settings FOR DELETE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = user_settings.user_id) OR is_admin(auth.uid()));

-- 4. Invoices table policies
CREATE POLICY "invoices_select_own" ON invoices FOR SELECT 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = invoices.user_id) OR is_admin(auth.uid()));

CREATE POLICY "invoices_insert_own" ON invoices FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = invoices.user_id) OR is_admin(auth.uid()));

CREATE POLICY "invoices_update_own" ON invoices FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = invoices.user_id) OR is_admin(auth.uid()));

CREATE POLICY "invoices_delete_own" ON invoices FOR DELETE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = invoices.user_id) OR is_admin(auth.uid()));

-- 5. Contracts table policies
CREATE POLICY "contracts_select_own" ON contracts FOR SELECT 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contracts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "contracts_insert_own" ON contracts FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contracts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "contracts_update_own" ON contracts FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contracts.user_id) OR is_admin(auth.uid()));

CREATE POLICY "contracts_delete_own" ON contracts FOR DELETE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = contracts.user_id) OR is_admin(auth.uid()));

-- 6. Booking Documents table policies
CREATE POLICY "booking_documents_select_own" ON booking_documents FOR SELECT 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_documents.user_id) OR is_admin(auth.uid()));

CREATE POLICY "booking_documents_insert_own" ON booking_documents FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_documents.user_id) OR is_admin(auth.uid()));

CREATE POLICY "booking_documents_update_own" ON booking_documents FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_documents.user_id) OR is_admin(auth.uid()));

CREATE POLICY "booking_documents_delete_own" ON booking_documents FOR DELETE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = booking_documents.user_id) OR is_admin(auth.uid()));

-- 7. Compliance Documents table policies
CREATE POLICY "compliance_documents_select_own" ON compliance_documents FOR SELECT 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = compliance_documents.user_id) OR is_admin(auth.uid()));

CREATE POLICY "compliance_documents_insert_own" ON compliance_documents FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = compliance_documents.user_id) OR is_admin(auth.uid()));

CREATE POLICY "compliance_documents_update_own" ON compliance_documents FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = compliance_documents.user_id) OR is_admin(auth.uid()));

CREATE POLICY "compliance_documents_delete_own" ON compliance_documents FOR DELETE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = compliance_documents.user_id) OR is_admin(auth.uid()));

-- 8. Bookings table policies (Priority 2)
CREATE POLICY "bookings_select_own" ON bookings FOR SELECT 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bookings.user_id) OR is_admin(auth.uid()));

CREATE POLICY "bookings_insert_own" ON bookings FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bookings.user_id) OR is_admin(auth.uid()));

CREATE POLICY "bookings_update_own" ON bookings FOR UPDATE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bookings.user_id) OR is_admin(auth.uid()));

CREATE POLICY "bookings_delete_own" ON bookings FOR DELETE 
USING (EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bookings.user_id) OR is_admin(auth.uid()));

-- Success message
SELECT 'RLS policies created successfully!' as status;