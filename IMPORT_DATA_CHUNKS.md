# 📦 Import Data in Small Chunks - Step by Step

I've split your data into 7 small files that can be imported one at a time in Supabase SQL Editor.

## Import Order (IMPORTANT - Do in this order!):

### Step 1: Import Users (11KB - 5 records)
1. Open `import-1-users.sql`
2. Copy ALL contents
3. Paste in Supabase SQL Editor
4. Click **Run**
5. Verify: `SELECT COUNT(*) FROM users;` should return 5

### Step 2: Import Clients (172KB - 568 records)
1. Open `import-2-clients.sql`
2. Copy ALL contents
3. Paste in Supabase SQL Editor
4. Click **Run**
5. Verify: `SELECT COUNT(*) FROM clients;` should return 568

### Step 3: Import Bookings (5 parts - 1,124 records total)

**Part 1** (592KB - ~200 bookings):
1. Open `import-3-bookings-part1.sql`
2. Copy ALL contents
3. Paste in Supabase SQL Editor
4. Click **Run**

**Part 2** (622KB - ~200 bookings):
1. Open `import-3-bookings-part2.sql`
2. Copy ALL contents
3. Paste in Supabase SQL Editor
4. Click **Run**

**Part 3** (669KB - ~200 bookings):
1. Open `import-3-bookings-part3.sql`
2. Copy ALL contents
3. Paste in Supabase SQL Editor
4. Click **Run**

**Part 4** (452KB - ~200 bookings):
1. Open `import-3-bookings-part4.sql`
2. Copy ALL contents
3. Paste in Supabase SQL Editor
4. Click **Run**

**Part 5** (311KB - ~324 bookings):
1. Open `import-3-bookings-part5.sql`
2. Copy ALL contents
3. Paste in Supabase SQL Editor
4. Click **Run**

### Step 4: Verify Everything
Run this query to check all data is imported:
```sql
SELECT
  'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT
  'Clients', COUNT(*) FROM clients
UNION ALL
SELECT
  'Bookings', COUNT(*) FROM bookings;
```

Expected results:
- Users: 5
- Clients: 568
- Bookings: 1124

## Files Created:
- `import-1-users.sql` - 11KB (smallest, start here!)
- `import-2-clients.sql` - 172KB
- `import-3-bookings-part1.sql` - 592KB
- `import-3-bookings-part2.sql` - 622KB
- `import-3-bookings-part3.sql` - 669KB
- `import-3-bookings-part4.sql` - 452KB
- `import-3-bookings-part5.sql` - 311KB

## If You Get Errors:

1. **"duplicate key"** - Data might already be imported. Check counts first.
2. **"foreign key violation"** - Make sure you import in order (users first!)
3. **File still too large** - Try copying half the file at a time

## Alternative: Use psql command line

If you can get the connection string from Supabase Dashboard:
```bash
psql YOUR_CONNECTION_STRING < import-1-users.sql
psql YOUR_CONNECTION_STRING < import-2-clients.sql
# etc...
```

Start with `import-1-users.sql` - it's only 11KB and has just 5 records!