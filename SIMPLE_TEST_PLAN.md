# Simple Test Plan - What YOU Need to Test

## Quick Fixes Just Made
✅ **Fixed booking form gig types** - Custom gig types should now load  
✅ **Fixed templates page** - Should load without 404 errors  

## Your Testing Steps (1-2 minutes each)

### TEST 1: Booking Form
1. Click "New Booking" 
2. Look at the "Gig Type" dropdown
3. **Expected**: Should see options like "Wedding", "Corporate Event", etc.
4. **If broken**: Tell me "Booking gig types still not loading"

### TEST 2: Templates Page  
1. Click "Templates" in sidebar
2. **Expected**: Page loads normally, no 404 errors
3. **If broken**: Tell me "Templates page still has errors"

### TEST 3: Contracts Page
1. Click "Contracts" in sidebar  
2. **Expected**: Contract list loads
3. **If broken**: Tell me "Contracts page has errors" + copy any error messages

### TEST 4: Dashboard Enquiries
1. Go to Dashboard
2. Look at the enquiries section
3. **Expected**: Should show enquiry data
4. **If broken**: Tell me "Dashboard enquiries not loading"

---

## After Each Test

Just tell me:
- ✅ "Test 1 works" 
- ❌ "Test 2 broken - [describe what you see]"

I'll fix each broken item immediately, then you test the next one.

**Goal**: Fix the 3-4 major errors first, then move to smaller issues.

---

## Next Priority List (after the 4 tests above)
- Invoice creation
- Contract creation  
- Settings page functions
- Admin features

**One test at a time - I fix it immediately, you confirm, we move on.**