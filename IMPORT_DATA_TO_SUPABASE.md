# 📥 Import Data to Supabase - Step by Step

Your tables are created but empty. Here's how to import your 1,124 bookings and other data:

## Option 1: Quick Import (Recommended)

1. **In Supabase SQL Editor**, run this to temporarily disable triggers:
```sql
SET session_replication_role = 'replica';
```

2. **Upload the data file**:
   - In Supabase SQL Editor, click the **"Upload"** button
   - Select the file: `supabase-data-import.sql` (1.8MB)
   - Click **"Run"**

3. **Re-enable triggers**:
```sql
SET session_replication_role = 'origin';
```

4. **Verify the import**:
```sql
SELECT
  (SELECT COUNT(*) FROM bookings) as bookings,
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM users) as users;
```

Expected result:
- bookings: 1124
- clients: 568
- users: 5

## Option 2: Import via Command Line

If you can get the connection string working:

```bash
# From Supabase Dashboard > Settings > Database > Connection string
psql "YOUR_SUPABASE_CONNECTION_STRING" < supabase-data-import.sql
```

## Option 3: Import in Chunks

If the full file is too large, import tables one at a time:

1. **Import Users first** (only 5 records):
```sql
-- Run the INSERT statements for users table from supabase-data-import.sql
```

2. **Import Clients** (568 records):
```sql
-- Run the INSERT statements for clients table
```

3. **Import Bookings** (1,124 records):
```sql
-- Run the INSERT statements for bookings table
```

## Files Available:
- `supabase-data-import.sql` - Full data (1.8MB) - All INSERT statements
- `neon-data.sql` - Original full dump (1.8MB)
- `neon-schema.sql` - Schema only (64KB)

## After Import:

Once data is imported, we need to:
1. Link test users to Supabase Auth UIDs
2. Set up Row Level Security
3. Test authentication

## Troubleshooting:

If you get errors:
- "duplicate key" - The data might already be there, check counts first
- "foreign key violation" - Import users first, then bookings
- "permission denied" - Make sure you're using the service role connection