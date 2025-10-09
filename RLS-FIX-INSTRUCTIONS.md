# RLS Security Fix - Step-by-Step Instructions

## ✅ Run these files IN ORDER in your Supabase SQL Editor

### Before You Start
1. **Make a database backup** in Supabase Dashboard: Settings > Database > Backups
2. Open Supabase Dashboard > SQL Editor

### Steps (Run in this exact order)

#### Step 1: Helper Function
**File:** `rls-fix-01-helper-function.sql`
- Creates the `is_admin()` function used by all policies
- **Expected output:** "Helper function created successfully!"

#### Step 2: User-Owned Tables (Batch 1)
**File:** `rls-fix-02-user-owned-batch1.sql`
- Secures: clients, email_templates, feedback, event_sync_mapping, google_calendar_integration
- **Expected output:** "Batch 1 completed: 5 tables secured!"

#### Step 3: User-Owned Tables (Batch 2)
**File:** `rls-fix-03-user-owned-batch2.sql`
- Secures: message_notifications, trial_usage_tracking, unparseable_messages, support_tickets, user_login_history
- **Expected output:** "Batch 2 completed: 5 more tables secured!"

#### Step 4: User-Owned Tables (Batch 3)
**File:** `rls-fix-04-user-owned-batch3.sql`
- Secures: user_messages, user_security_status, user_activity, booking_conflicts, conflict_resolutions
- **Expected output:** "Batch 3 completed: 5 more tables secured!"

#### Step 5: User-Owned Tables (Batch 4)
**File:** `rls-fix-05-user-owned-batch4.sql`
- Secures: imported_contracts, api_usage_tracking, api_usage_stats, contract_extractions
- **Expected output:** "Batch 4 completed: Final user-owned tables secured!"

#### Step 6: Admin-Only Tables
**File:** `rls-fix-06-admin-only.sql`
- Secures: beta_invite_codes, beta_invites, beta_email_templates, fraud_prevention_log
- **Expected output:** "Admin-only tables secured!"

#### Step 7: Special Tables
**File:** `rls-fix-07-special-tables.sql`
- Secures: sessions, instrument_mappings, contract_extraction_patterns
- **Expected output:** "Special case tables secured!"

#### Step 8: Pre-Signup Tables
**File:** `rls-fix-08-presignup-tables.sql`
- Secures: sms_verifications, phone_verifications
- **Expected output:** "Pre-signup tables secured!"

#### Step 9: Verify All Tables
**File:** `rls-fix-09-verify.sql`
- Checks that all 28 tables have RLS enabled
- **Expected output:** List of 28 tables, all showing `rowsecurity = true`

---

## How to Run Each File

1. In Supabase SQL Editor, click **"New Query"**
2. Open the file in your code editor (or file browser)
3. Copy the entire contents
4. Paste into Supabase SQL Editor
5. Click **"Run"**
6. Verify you see the success message
7. Move to the next file

---

## If You Get an Error

- **"relation does not exist"**: That table might not be in your database (safe to skip)
- **"policy already exists"**: Safe to ignore, the DROP IF EXISTS should handle this
- **"permission denied"**: Make sure you're using the SQL Editor in the Supabase Dashboard (uses service role)
- **Snippet error**: Don't use saved snippets, use "New Query" each time

---

## After Completion

1. Run the verification script (Step 9)
2. Check Supabase Dashboard > Database > Reports > Database Linter
3. All 28 RLS errors should be resolved!
4. Test your application to ensure everything still works

---

## Rollback (if needed)

If something breaks, you can disable RLS on any table:

```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

---

## Total Progress
- ✅ Step 1: Helper function
- ✅ Steps 2-5: 19 user-owned tables
- ✅ Step 6: 4 admin-only tables
- ✅ Step 7: 3 special tables
- ✅ Step 8: 2 pre-signup tables
- ✅ Step 9: Verify all 28 tables

**Total: 28 tables secured** 🎉
