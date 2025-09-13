# Supabase Testing Guide & Current Status

## 🔍 Current Status

### Development Environment: ✅ READY
- **Data migrated:** 1,726 total records
- **Tables created:** All 7 core tables
- **API access:** Working with service key
- **RLS status:** Enabled (blocking anon access - needs policies)

### Production Environment: ⚠️ NOT READY
- **Tables:** Created but empty
- **Data:** Needs migration from current production
- **RLS:** Not configured

### Configuration: ✅ PARALLEL MODE ACTIVE
```
USE_SUPABASE=true
SUPABASE_MIGRATION_MODE=parallel
```
Both Firebase and Supabase running simultaneously - safe for testing!

## 🧪 What You Should Test First

### 1. 🟢 **Read Operations** (Test Now - Low Risk)
Since RLS is blocking anonymous access, test with service key first:

```javascript
// Use this for testing (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

// Test these operations:
- List bookings (use 'event_date' not 'date')
- View client details
- Search functionality
- Count operations
```

### 2. 🟡 **Authentication Setup** (Next Priority)
Before testing auth, you need to:
1. Configure RLS policies for authenticated users
2. Set up Supabase Auth users (migrate from Firebase)
3. Test login/logout flows

### 3. 🟢 **Search & Filter** (Can Test Now)
Already working with service key:
- Filter by event_date
- Search by client_name
- Status filtering

## ⚠️ Important Discoveries

### Column Name Differences
The bookings table uses different column names than expected:
- Use `event_date` instead of `date`
- Use `event_time` and `event_end_time` for times
- Client info is embedded in bookings (client_name, client_email, client_phone)

### RLS Is Active
- Anonymous access returns 0 records (expected)
- Service key bypasses RLS (working)
- Need to create policies before client-side testing

## 📝 Test Scripts Available

1. **`test-production-readiness.js`** - Check both environments
2. **`test-supabase-integration.js`** - Basic connectivity test
3. **`test-read-operations.js`** - Test read operations (needs column name fixes)
4. **`check-schema.js`** - Inspect table structures

## 🚨 Before Production

### Must Complete:
1. [ ] Migrate production data to Supabase PROD
2. [ ] Configure RLS policies
3. [ ] Set up Supabase Auth users
4. [ ] Test all critical paths
5. [ ] Implement proper error handling
6. [ ] Set up monitoring

### Critical Operations to Test:
- [ ] User registration/login
- [ ] Booking creation
- [ ] Invoice generation
- [ ] Contract signing
- [ ] Payment processing

## 🎯 Recommended Next Steps

### Immediate (Today):
1. Fix column names in read operations test
2. Create RLS policies for basic read access
3. Test with corrected column names

### Short Term (This Week):
1. Set up auth user migration
2. Create RLS policies for all operations
3. Test create/update/delete operations

### Before Go-Live:
1. Migrate production data
2. Full integration testing
3. Performance testing
4. Rollback plan

## 💡 Testing Tips

### Safe Testing Pattern:
```javascript
// Check migration mode first
if (process.env.SUPABASE_MIGRATION_MODE === 'parallel') {
  // Test Supabase
  const { data: supabaseData } = await supabase.from('bookings').select();

  // Compare with Firebase
  const firebaseData = await getFirebaseBookings();

  // Log differences for debugging
  console.log('Data comparison:', { supabase: supabaseData?.length, firebase: firebaseData?.length });
}
```

### RLS Testing:
- Use service key for admin operations
- Use anon key for public operations
- Test with authenticated user tokens for user operations

## 🔒 Security Notes

- **Service key:** Server-side only, never expose to client
- **Anon key:** Safe for client-side, protected by RLS
- **User tokens:** Generate via Supabase Auth for authenticated operations

---

**Current Mode:** PARALLEL - Both systems active, no user impact
**Safe to test:** YES - Using development environment
**Production ready:** NO - Needs data migration and RLS configuration