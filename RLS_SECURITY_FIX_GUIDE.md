# RLS Security Fix Implementation Guide

## Overview

This guide addresses the 28 security errors identified by Supabase's database linter. All errors are related to Row Level Security (RLS) not being enabled on public tables, which poses a serious security risk.

## Security Risk

Without RLS enabled, any client with access to your Supabase API can potentially read, insert, update, or delete data in these tables, bypassing your application's authorization logic.

## Affected Tables (28 total)

### User-Owned Tables (19)
These tables have a `user_id` column and users should only access their own data:

1. `clients` - Client contact information
2. `email_templates` - User's custom email templates
3. `feedback` - User feedback submissions
4. `event_sync_mapping` - Calendar sync mappings
5. `google_calendar_integration` - Google Calendar settings
6. `message_notifications` - Booking message notifications
7. `trial_usage_tracking` - Trial feature usage
8. `unparseable_messages` - Messages AI couldn't parse
9. `support_tickets` - User support requests
10. `user_login_history` - Login audit trail
11. `user_messages` - User-to-user messages
12. `user_security_status` - User security flags
13. `user_activity` - User activity logs
14. `booking_conflicts` - Booking conflict detection
15. `conflict_resolutions` - Resolved conflicts
16. `imported_contracts` - Imported contract files
17. `api_usage_tracking` - API usage logs
18. `api_usage_stats` - API usage statistics
19. `contract_extractions` - Contract extraction data

### Admin-Only Tables (4)
Only admin users should access these:

20. `beta_invite_codes` - Beta invitation codes
21. `beta_invites` - Beta email invitations
22. `beta_email_templates` - Beta invitation templates
23. `fraud_prevention_log` - Fraud detection logs

### Special Access Pattern Tables (3)

24. `sessions` - Express session storage (authenticated users only)
25. `instrument_mappings` - Instrument-to-gig-type mappings (read-only for all authenticated users)
26. `contract_extraction_patterns` - Contract parsing patterns (own + global)

### Pre-Signup Tables (2)
Data before user accounts exist:

27. `sms_verifications` - SMS verification codes
28. `phone_verifications` - Phone verification tracking

## Implementation Steps

### Step 1: Backup Your Database

**CRITICAL:** Before applying any changes, create a backup:

```bash
# Via Supabase Dashboard:
# Settings > Database > Backups > Create backup
```

### Step 2: Test in Development First

**DO NOT** run this on production first! Test thoroughly in a development or staging environment.

### Step 3: Apply the SQL Script

1. Open your Supabase Dashboard
2. Navigate to SQL Editor
3. Open the file: `fix-rls-security-errors.sql`
4. Review the policies carefully
5. Execute the script

Expected result: "RLS policies created successfully for all 28 tables!"

### Step 4: Verify RLS is Enabled

Run this verification query in the SQL Editor:

```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'beta_invite_codes', 'beta_invites', 'clients', 'contract_extractions',
    'email_templates', 'contract_extraction_patterns', 'feedback',
    'fraud_prevention_log', 'event_sync_mapping', 'google_calendar_integration',
    'instrument_mappings', 'phone_verifications', 'sessions',
    'message_notifications', 'sms_verifications', 'trial_usage_tracking',
    'unparseable_messages', 'support_tickets', 'user_login_history',
    'user_messages', 'user_security_status', 'user_activity',
    'booking_conflicts', 'conflict_resolutions', 'imported_contracts',
    'beta_email_templates', 'api_usage_tracking', 'api_usage_stats'
  )
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

### Step 5: Test Your Application

After applying RLS policies, thoroughly test:

1. **User Data Access**: Users can only see their own data
2. **Admin Access**: Admin users can access all data
3. **Public Features**: Any public-facing features still work
4. **Backend Operations**: Service role operations aren't blocked

### Step 6: Monitor for Issues

Watch for:
- Permission denied errors in logs
- Users unable to access their data
- Backend operations failing

## Policy Patterns Used

### Standard User-Owned Pattern

```sql
-- Users can only access rows where user_id matches their ID
CREATE POLICY "table_select_own" ON table_name FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.supabase_uid = auth.uid()::text
    AND u.id = table_name.user_id
  )
  OR is_admin(auth.uid())
);
```

### Admin-Only Pattern

```sql
-- Only admin users can access
CREATE POLICY "table_admin_all" ON table_name FOR ALL
USING (is_admin(auth.uid()));
```

### Shared Data Pattern (instrument_mappings)

```sql
-- All authenticated users can read, only admins can write
CREATE POLICY "table_select_all" ON table_name FOR SELECT
USING (auth.role() = 'authenticated');
```

## Important Notes

### Service Role Bypass

The service role (used by your backend server) **bypasses RLS policies**. This means:
- Your backend code will continue to work normally
- Backend can still access all data as needed
- Only direct Supabase client connections are restricted

### Backend Code Changes

**You should NOT need to change your backend code** if you're using the service role for database operations. However, if you're using user-level authentication for database access, you may need to review your queries.

### Performance Considerations

RLS policies add overhead to queries. For tables with complex policies or high traffic:
- Monitor query performance
- Add indexes on user_id columns if needed
- Consider using the service role for backend operations

## Rollback Plan

If you need to rollback, you can disable RLS on affected tables:

```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

## Additional Security Recommendations

1. **Regular Audits**: Periodically review RLS policies
2. **Monitoring**: Set up alerts for permission denied errors
3. **Testing**: Include RLS tests in your test suite
4. **Documentation**: Keep policies documented for your team

## Support

If you encounter issues:
1. Check Supabase logs for permission errors
2. Verify the `is_admin()` function works correctly
3. Ensure users have proper `supabase_uid` values
4. Test with service role vs user role separately

## Verification Checklist

- [ ] Database backup created
- [ ] SQL script reviewed
- [ ] Applied to development environment
- [ ] Tested user data isolation
- [ ] Tested admin access
- [ ] Tested backend operations
- [ ] Verified all 28 tables have RLS enabled
- [ ] Monitored application logs
- [ ] Applied to production
- [ ] Confirmed security errors resolved in Supabase dashboard

## Next Steps

After successfully applying this fix:
1. Run the database linter again in Supabase Dashboard
2. Verify all 28 security errors are resolved
3. Document any custom policies you add in the future
4. Set up monitoring for permission denied errors
