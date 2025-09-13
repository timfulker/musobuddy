# Supabase User Testing Plan 🧪
**Start Here → Build Up Gradually → Test Critical Flows**

## 🎯 Testing Strategy

Since you're in **parallel mode**, you can test safely without affecting existing users. Here's the recommended progression:

## 📱 Phase 1: Backend API Testing (Start Here)
**Risk Level:** 🟢 **SAFE** - No user impact, just API calls

### Test 1A: View Existing Data (5 minutes)
```bash
# Test what's already there
node test-supabase-integration.js
```
**What this tests:** Basic connectivity, data retrieval, counts

### Test 1B: Fix & Test Read Operations (10 minutes)
```bash
# I'll fix the column names, then you run:
node test-read-operations-fixed.js
```
**What this tests:**
- List bookings with correct date fields
- Search functionality
- Filter operations
- Client data access

---

## 🔐 Phase 2: Authentication Testing (Medium Risk)
**Risk Level:** 🟡 **CAREFUL** - Auth system integration

### Test 2A: Check Current Auth Setup
First, let me check how your current auth works:
```bash
# Check existing Firebase auth
grep -r "signIn\|createUser" server/
```

### Test 2B: Test Login Flow
**Option 1 - Existing User Test:**
1. Use your current login system (Firebase)
2. Check if user data exists in Supabase
3. Test data access with authenticated user

**Option 2 - Supabase Auth Test:**
1. Create test user in Supabase
2. Test login/logout
3. Verify data access permissions

---

## 📅 Phase 3: Booking Operations (Higher Risk)
**Risk Level:** 🟡 **CAREFUL** - Business logic

### Test 3A: Read Booking Details
1. **View existing booking:**
   - Open booking list
   - Click on existing booking
   - Verify all fields display correctly

### Test 3B: Search & Filter
1. **Search bookings:**
   - Search by client name
   - Filter by date range
   - Filter by status

---

## 🆕 Phase 4: Create Operations (High Risk)
**Risk Level:** 🔴 **CRITICAL** - Creates new data

### Test 4A: New User Registration
**Before testing:** Set up test environment
```bash
# Create test user endpoint
curl -X POST localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
```

### Test 4B: New Booking Creation
**Test steps:**
1. Login as existing user
2. Click "New Booking"
3. Fill required fields:
   - Client name
   - Event date
   - Venue
   - Basic details
4. Save booking
5. **Verify:** Check both Firebase AND Supabase have the record

---

## 💼 Phase 5: Critical Business Flows (Critical Risk)
**Risk Level:** 🔴 **CRITICAL** - Revenue affecting

### Test 5A: Invoice Generation
1. Select existing booking
2. Generate invoice
3. Verify PDF creation
4. Check invoice saved to both systems

### Test 5B: Contract Workflow
1. Create/edit contract
2. Send to client
3. Track signing status
4. Verify contract storage

---

## 🚀 Recommended Starting Point

### **START HERE** (Next 30 minutes):

1. **Fix Read Operations** (5 min)
   ```bash
   # Let me fix the column names first
   # Then you run the corrected test
   ```

2. **Test Your Login** (10 min)
   - Login to your existing system
   - Check if your user data appears in Supabase
   - Verify data access

3. **View Existing Bookings** (10 min)
   - Navigate to bookings list
   - Open a booking detail
   - Check all fields display

4. **Test Search** (5 min)
   - Search for a client name
   - Filter by recent dates

### **If All Above Works → Next Steps:**

5. **Create Test Booking** (15 min)
   - Use test data (not real client)
   - Verify it appears in both systems
   - Check data consistency

## 🛡️ Safety Measures

### During Testing:
- ✅ **Parallel mode active** - Both systems running
- ✅ **Use development environment**
- ✅ **Test data only** - No real client info
- ✅ **Database backups exist**

### Before Each Test:
1. Check current mode: `echo $SUPABASE_MIGRATION_MODE`
2. Verify development environment
3. Use test email addresses only

### If Something Breaks:
```bash
# Revert to Firebase only
export USE_SUPABASE=false
export SUPABASE_MIGRATION_MODE=legacy-only
# Restart your server
```

## 📊 Success Criteria

### Phase 1 Success =
- ✅ Can view existing data
- ✅ Search works
- ✅ No errors in logs

### Phase 2 Success =
- ✅ Can login
- ✅ User sees their data
- ✅ Permissions work correctly

### Phase 3+ Success =
- ✅ All CRUD operations work
- ✅ Data stays in sync
- ✅ No data loss

## 🔧 Testing Tools Ready

- `test-production-readiness.js` - Environment check
- `test-supabase-integration.js` - Basic connectivity
- `test-read-operations.js` - Read operations (needs fix)
- `check-schema.js` - Schema inspection
- Manual testing via your web interface

---

**🎯 My Recommendation: Start with fixing the read operations test, then manually test your existing login flow to see your data in Supabase.**