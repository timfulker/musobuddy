# Testing RLS Implementation - Checklist

## 1. Verify RLS is Enabled

Run this in Supabase SQL Editor (Development):

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

**Expected**: All 17 tables show `rowsecurity = true` ✅

---

## 2. Check Database Linter

1. Go to Supabase Dashboard (Development)
2. Navigate to: **Database > Reports > Database Linter**
3. Look for "RLS Disabled in Public" errors

**Expected**: 0 RLS errors for these 17 tables ✅

---

## 3. Verify Policies Exist

Run this to see all policies created:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename IN (
  'bands', 'booking_documents', 'bookings', 'compliance_documents',
  'contracts', 'invoices', 'security_monitoring', 'user_audit_logs',
  'user_settings', 'blocked_dates', 'client_communications', 'users',
  'front_end_errors', 'front_end_monitoring', 'network_requests',
  'performance_metrics', 'user_interactions'
)
ORDER BY tablename, policyname;
```

**Expected**: You should see 4 policies per user-owned table (select, insert, update, delete), fewer for monitoring tables ✅

---

## 4. Test Backend Operations (Service Role)

### A. Check your backend still works
Run your backend server against the development database and test:

```bash
# Test key backend operations:
- User registration
- Creating a booking
- Fetching user's bookings
- Creating contracts/invoices
- Admin operations (if any)
```

**Expected**: Everything works normally (service role bypasses RLS) ✅

### B. Check backend logs for errors
Monitor your backend logs for any "permission denied" errors.

**Expected**: No RLS-related permission errors ✅

---

## 5. Test Frontend Data Isolation

### A. Test with Regular User Account

1. Log in to your development app with a **non-admin** test user
2. Open browser Developer Console
3. Run these commands:

```javascript
// Try to fetch all bookings (should only get your own)
const { data: bookings, error } = await supabase
  .from('bookings')
  .select('*')

console.log('Bookings:', bookings.length, 'rows')
// Expected: Only shows current user's bookings

// Try to fetch all users (should only get your own user record)
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('*')

console.log('Users:', users)
// Expected: Only shows current user's record

// Try to access another user's booking by ID (if you know one)
const { data: otherBooking, error: otherError } = await supabase
  .from('bookings')
  .select('*')
  .eq('id', 'some-other-users-booking-id')

console.log('Other user booking:', otherBooking)
// Expected: Empty array or null (cannot access)

// Try to update another user's data
const { data: updated, error: updateError } = await supabase
  .from('bookings')
  .update({ client_name: 'Hacked!' })
  .eq('id', 'some-other-users-booking-id')

console.log('Update error:', updateError)
// Expected: No rows updated, or permission denied
```

**Expected Results**:
- ✅ User can see their own data
- ✅ User CANNOT see other users' data
- ✅ User CANNOT modify other users' data
- ✅ Queries work normally for their own data

### B. Test with Admin Account

1. Log in with an **admin** user (where `is_admin = true`)
2. Run similar console commands

```javascript
// Admins should see ALL data
const { data: allBookings } = await supabase
  .from('bookings')
  .select('*')

console.log('Admin sees:', allBookings.length, 'bookings')
// Expected: Shows ALL bookings from ALL users

// Admins should access monitoring tables
const { data: auditLogs } = await supabase
  .from('user_audit_logs')
  .select('*')

console.log('Audit logs:', auditLogs)
// Expected: Shows audit logs (regular users would get empty/error)
```

**Expected**: Admin can access all data ✅

---

## 6. Test Core Application Features

Go through your app's main workflows as a regular user:

### User Workflows to Test:
- ✅ User registration/login
- ✅ View bookings list (should only see their own)
- ✅ Create new booking
- ✅ Edit existing booking
- ✅ Delete booking
- ✅ Generate contract
- ✅ Generate invoice
- ✅ Upload documents
- ✅ View/edit settings
- ✅ Create/manage bands
- ✅ Block dates on calendar
- ✅ Send client communications
- ✅ Any other key features

**Expected**: All features work normally ✅

---

## 7. Test Monitoring/Telemetry

### Check error logging still works:

```javascript
// In browser console, test error logging
const { data, error } = await supabase
  .from('front_end_errors')
  .insert({
    session_id: 'test-session',
    user_id: 'test-user',
    message: 'Test error',
    error_type: 'test',
    timestamp: new Date().toISOString()
  })

console.log('Error logged:', data, error)
// Expected: Should insert successfully
```

**Expected**: Telemetry/monitoring tables accept inserts ✅

---

## 8. Check for Permission Errors

### In Supabase Dashboard:

1. Go to **Database > Logs**
2. Look for any "permission denied" errors
3. Filter by recent time (since you applied RLS)

**Expected**: No unexpected permission denied errors ✅

---

## 9. Performance Check

Run a few queries and check response times:

```javascript
console.time('bookings_query')
const { data } = await supabase.from('bookings').select('*')
console.timeEnd('bookings_query')
// Expected: Similar performance to before RLS (maybe 5-20ms slower)
```

**Expected**: Minimal performance impact ✅

---

## 10. Test Multi-User Scenario (Best Practice)

If possible, create 2 test users:

**User A**:
1. Create a booking as User A
2. Note the booking ID

**User B**:
1. Log in as User B
2. Try to access User A's booking by ID
3. Try to modify User A's booking

**Expected**: User B cannot see or modify User A's data ✅

---

## Quick Test Script

Run this comprehensive test in your browser console (as a regular user):

```javascript
async function testRLS() {
  console.log('=== RLS Testing ===')

  // Test 1: Can read own data
  const { data: myBookings, error: e1 } = await supabase
    .from('bookings')
    .select('*')
  console.log('✅ My bookings:', myBookings?.length || 0)

  // Test 2: Can read own user record
  const { data: myUser, error: e2 } = await supabase
    .from('users')
    .select('*')
  console.log('✅ My user record:', myUser?.length === 1 ? 'OK' : 'FAIL')

  // Test 3: Can create booking
  const { data: newBooking, error: e3 } = await supabase
    .from('bookings')
    .insert({
      user_id: myUser[0].id,
      client_name: 'Test Client RLS',
      event_date: '2025-12-01'
    })
    .select()
  console.log('✅ Create booking:', newBooking ? 'OK' : 'FAIL', e3)

  // Test 4: Can update own booking
  if (newBooking?.[0]) {
    const { error: e4 } = await supabase
      .from('bookings')
      .update({ client_name: 'Updated Client' })
      .eq('id', newBooking[0].id)
    console.log('✅ Update booking:', e4 ? 'FAIL' : 'OK')

    // Cleanup
    await supabase.from('bookings').delete().eq('id', newBooking[0].id)
  }

  // Test 5: Cannot access monitoring (unless admin)
  const { data: monitoring, error: e5 } = await supabase
    .from('security_monitoring')
    .select('*')
  console.log('✅ Monitoring access:', monitoring?.length > 0 ? 'ADMIN' : 'BLOCKED')

  console.log('=== Tests Complete ===')
}

// Run the test
testRLS()
```

---

## Final Checklist

Before applying to production, confirm:

- [ ] All 17 tables have `rowsecurity = true`
- [ ] Database linter shows 0 RLS errors
- [ ] Backend operations work normally (service role)
- [ ] Frontend CRUD operations work for own data
- [ ] Users CANNOT see other users' data
- [ ] Admin users CAN see all data
- [ ] No unexpected "permission denied" errors in logs
- [ ] Monitoring/telemetry still works
- [ ] Performance is acceptable
- [ ] All critical application workflows tested

---

## If Everything Passes ✅

You're ready to apply to production! Follow the same steps:

1. **Backup production database first**
2. Open production Supabase Dashboard > SQL Editor
3. Run `rls-fix-current-17-tables.sql`
4. Verify with the queries above
5. Monitor production logs closely for 24-48 hours

---

## If You Find Issues ❌

### Rollback Development Database:

```sql
-- Disable RLS on problematic table(s)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### Common Issues:

1. **"Cannot read own data"** → Check `users.supabase_uid` matches `auth.uid()`
2. **"Backend permission denied"** → Verify backend uses service role key
3. **"Admin cannot see all data"** → Check `is_admin` flag is set correctly
4. **"Performance issues"** → Add indexes on `user_id` columns if needed

---

## Need Help?

Check the logs and policies:

```sql
-- See exact policy definitions
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'your_table_name';

-- Check is_admin function
SELECT is_admin('your-supabase-uid'::uuid);
```
