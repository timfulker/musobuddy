# Apply RLS Security Fix - 17 Tables

## Quick Start

### ⚠️ BEFORE YOU BEGIN
1. **Backup your database** in Supabase Dashboard: Settings > Database > Backups
2. **Test in development first** - DO NOT apply to production without testing!

### Apply the Fix

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **"New Query"**
4. Open `rls-fix-current-17-tables.sql` and copy the entire contents
5. Paste into SQL Editor
6. Click **"Run"**

Expected result: "RLS policies created successfully for all 17 tables!"

---

## What This Fixes

### 17 Tables Secured:

#### User-Owned Tables (9)
- ✅ **bands** - User's band/project organization
- ✅ **booking_documents** - Booking-related documents
- ✅ **bookings** - Main booking/gig data
- ✅ **compliance_documents** - Insurance/compliance docs
- ✅ **contracts** - User contracts
- ✅ **invoices** - User invoices
- ✅ **blocked_dates** - User calendar blocking
- ✅ **client_communications** - Communication history
- ✅ **user_settings** - User preferences

#### Admin-Only Tables (2)
- ✅ **security_monitoring** - API usage/abuse tracking
- ✅ **user_audit_logs** - Admin action audit trail

#### Monitoring/Telemetry Tables (5)
- ✅ **front_end_errors** - Error tracking
- ✅ **front_end_monitoring** - Aggregated metrics
- ✅ **network_requests** - API request logs
- ✅ **performance_metrics** - Web vitals (LCP, FID, CLS, TTFB)
- ✅ **user_interactions** - User behavior analytics

#### Core Table (1)
- ✅ **users** - User accounts

---

## Security Patterns Applied

### 1. User-Owned Data (9 tables)
```sql
-- Users can only access rows where user_id matches their ID
-- Admins can access all data
USING (
  EXISTS (SELECT 1 FROM users u
          WHERE u.supabase_uid = auth.uid()::text
          AND u.id = table_name.user_id)
  OR is_admin(auth.uid())
)
```

### 2. Admin-Only (2 tables)
```sql
-- Only admins can access
USING (is_admin(auth.uid()))
```

### 3. Telemetry (5 tables)
```sql
-- Authenticated users can INSERT their own telemetry
-- Admins can SELECT for dashboards
INSERT: auth.role() = 'authenticated'
SELECT: is_admin(auth.uid())
```

### 4. Users Table (1 table)
```sql
-- Users can view/update their own record
-- Admins can view/update all records
-- Only admins can delete
```

---

## After Applying

### Verify RLS is Enabled

Run this query in SQL Editor to verify:

```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'bands', 'booking_documents', 'bookings', 'compliance_documents',
    'contracts', 'invoices', 'security_monitoring', 'user_audit_logs',
    'user_settings', 'blocked_dates', 'client_communications', 'users',
    'front_end_errors', 'front_end_monitoring', 'network_requests',
    'performance_metrics', 'user_interactions'
  )
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

### Check Database Linter

1. Go to Supabase Dashboard > Database > Reports
2. Click on **Database Linter**
3. All 17 RLS errors should be resolved!

---

## Testing Your Application

After applying RLS, test thoroughly:

### 1. User Data Isolation
- ✅ Users can only see their own bookings/contracts/invoices
- ✅ Users cannot access other users' data
- ✅ Test with multiple user accounts

### 2. Admin Access
- ✅ Admin users can access all data
- ✅ Admin dashboard shows all users' data
- ✅ Admin can view monitoring/audit logs

### 3. Backend Operations
- ✅ Your backend code still works (service role bypasses RLS)
- ✅ API endpoints return correct data
- ✅ Background jobs can access necessary data

### 4. Frontend Telemetry
- ✅ Error logging still works
- ✅ Performance monitoring still works
- ✅ User interaction tracking still works

---

## Important Notes

### Service Role Bypasses RLS
Your backend server using the service role will **continue to work normally**. RLS only restricts direct client connections from the browser.

### No Backend Code Changes Needed
If you're using the service role for backend operations, you should NOT need to change your code.

### Performance
RLS policies add minimal overhead. All policies use efficient EXISTS queries with proper indexes on `user_id` columns.

---

## Rollback (if needed)

If you encounter issues, disable RLS on specific tables:

```sql
-- Disable RLS on a specific table
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Or disable on all tables
ALTER TABLE bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
-- ... etc
```

---

## Troubleshooting

### "permission denied" errors in logs
- Check if the user has a valid `supabase_uid` in the users table
- Verify `is_admin` flag is set correctly for admin users
- Ensure backend is using service role, not user role

### Users can't see their own data
- Verify `users.supabase_uid` matches `auth.uid()`
- Check if user_id is set correctly on the data rows
- Run: `SELECT id, supabase_uid, is_admin FROM users WHERE email = 'user@example.com';`

### Backend operations fail
- Ensure backend uses **service role** key (not anon key)
- Service role bypasses RLS automatically
- Check your connection string uses the service role

---

## Next Steps

1. ✅ Apply the SQL script in development
2. ✅ Run verification query
3. ✅ Test your application thoroughly
4. ✅ Check database linter (should show 0 RLS errors)
5. ✅ Apply to production (after successful dev testing)
6. ✅ Monitor application logs for any permission errors

---

## Summary

This RLS implementation provides:
- ✅ **Data isolation** - Users can only access their own data
- ✅ **Admin oversight** - Admins have full access for support/debugging
- ✅ **Audit trail** - Admin actions are logged
- ✅ **Monitoring** - Telemetry continues to work
- ✅ **Security** - Direct database access from clients is properly restricted
- ✅ **Zero backend changes** - Service role bypasses RLS

All 17 security errors will be resolved! 🎉
