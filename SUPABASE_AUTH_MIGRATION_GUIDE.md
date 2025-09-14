# Supabase Authentication Migration Guide

## Problem Solved

The application was experiencing "Invalid login credentials" errors for users like `timfulkermusic@gmail.com` because:

1. **Users existed in the custom `users` table** (imported from the original database)
2. **But did NOT exist in Supabase's `auth.users` table**
3. **Supabase authentication requires both**:
   - An entry in `auth.users` (managed by Supabase Auth)
   - A corresponding entry in your custom `users` table
   - The `supabase_uid` field linking them together

## Architecture Overview

### Dual Table System
- **`auth.users`** (Supabase-managed): Handles authentication, sessions, passwords
- **`public.users`** (Your custom table): Stores business data, preferences, settings
- **Link**: `users.supabase_uid` → `auth.users.id`

### Authentication Flow
1. User enters email/password
2. Supabase Auth validates against `auth.users`
3. If valid, gets user data from `public.users` using `supabase_uid`
4. Row Level Security policies use `auth.uid()` to match `users.supabase_uid`

## Migration Process

### Step 1: Run the Migration Script
```bash
node scripts/migrate-users-to-supabase-auth.js
```

This script:
- ✅ Creates Supabase Auth users for existing custom users
- ✅ Links them with `supabase_uid` in your custom users table
- ✅ Sets temporary password: `TempPass123!`
- ✅ Auto-confirms email to skip verification

### Step 2: Verify Migration
```bash
node test-supabase-auth.js
```

### Step 3: Test Problematic User
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'timfulkermusic@gmail.com',
  password: 'TempPass123!'
});
```

## Files Modified/Created

### Created
- `scripts/migrate-users-to-supabase-auth.js` - Migration script
- `SUPABASE_AUTH_MIGRATION_GUIDE.md` - This guide

### Existing Architecture
- `shared/schema.ts` - Already has `supabaseUid` field
- `scripts/setup-rls-policies.sql` - Row Level Security setup
- `scripts/link-test-users.sql` - Test user linking
- `server/middleware/supabase-auth.ts` - Auth middleware
- `lib/supabase/auth.ts` - Auth service functions

## User Password Reset

All migrated users have temporary password: `TempPass123!`

### Option 1: Force Password Reset on Login
```javascript
// In your login component
if (user.user_metadata?.migrated) {
  // Redirect to password reset flow
  router.push('/reset-password');
}
```

### Option 2: Send Password Reset Emails
```javascript
for (const email of migratedUserEmails) {
  await supabase.auth.resetPasswordForEmail(email);
}
```

## Row Level Security

The RLS policies in `scripts/setup-rls-policies.sql` use:
```sql
SELECT id::text FROM users WHERE supabase_uid = auth.uid()
```

This ensures users can only access their own data.

## Testing Commands

```bash
# Test auth flow
node test-supabase-auth.js

# Test specific user login
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL_DEV, process.env.SUPABASE_ANON_KEY_DEV);
const result = await supabase.auth.signInWithPassword({
  email: 'timfulkermusic@gmail.com',
  password: 'TempPass123!'
});
console.log(result.error ? 'Failed' : 'Success');
"

# List all auth users
node -e "
import { createClient } from '@supabase/supabase-js';
const admin = createClient(process.env.SUPABASE_URL_DEV, process.env.SUPABASE_SERVICE_KEY_DEV);
const { data } = await admin.auth.admin.listUsers();
data.users.forEach(u => console.log(u.email, u.id));
"
```

## Troubleshooting

### User Still Can't Login
1. Check if user exists in both tables:
   ```sql
   SELECT email FROM auth.users WHERE email = 'user@example.com';
   SELECT email, supabase_uid FROM public.users WHERE email = 'user@example.com';
   ```

2. Verify the link:
   ```sql
   SELECT u.email, u.supabase_uid, au.id
   FROM public.users u
   LEFT JOIN auth.users au ON u.supabase_uid = au.id
   WHERE u.email = 'user@example.com';
   ```

### RLS Blocking Queries
1. Check if user has `supabase_uid` populated
2. Verify RLS policies are correct
3. Test with RLS disabled temporarily:
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ```

## Next Steps

1. **✅ Completed**: Basic migration
2. **📧 TODO**: Send password reset emails to migrated users
3. **🔧 TODO**: Add migration status tracking
4. **🛡️ TODO**: Implement forced password reset on first login
5. **📊 TODO**: Add migration analytics/logging

## Summary

The "Invalid login credentials" issue has been resolved by:
1. Creating Supabase Auth users for all existing custom users
2. Linking them via the `supabase_uid` field
3. Providing temporary passwords for immediate access
4. Maintaining the existing business logic and data structure

Users can now authenticate successfully, and Row Level Security policies work correctly.