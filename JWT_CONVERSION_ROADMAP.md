# JWT Authentication Conversion Roadmap

## Overview
Complete the JWT authentication conversion for all remaining frontend components that still use session-based authentication (`credentials: 'include'`).

## Progress Status
- ✅ **COMPLETED**: Admin dashboard components (kanban-board, contract-notifications, etc.)
- ✅ **COMPLETED**: Settings page main functionality
- ⏳ **IN PROGRESS**: Core business function components
- ❌ **PENDING**: Utility and secondary components

---

## PHASE 1: Critical Business Functions (PRIORITY 1)
**Impact**: These directly affect core business operations

### 1.1 Settings Integration Hook
**File**: `client/src/hooks/useGigTypes.tsx`
**Issue**: Booking forms can't load custom gig types
**Fix**: Replace session auth with JWT Bearer tokens
**Test**: Create new booking → gig type dropdown should populate

### 1.2 Contract Viewing System
**Files**: 
- `client/src/pages/view-contract.tsx`
- `client/src/pages/sign-contract.tsx`
**Issue**: Contract pages can't load business details
**Fix**: Add JWT auth headers to settings API calls
**Test**: View any contract → business details should display

### 1.3 Invoice Generation
**File**: `client/src/pages/invoices.tsx`
**Issue**: Invoice creation fails to load templates/settings
**Fix**: Convert settings API call to JWT
**Test**: Generate invoice → templates and business details load

### 1.4 Templates Management
**File**: `client/src/pages/templates.tsx`
**Issue**: Template page can't load settings
**Fix**: Convert settings fetch to JWT
**Test**: Navigate to templates → page loads without errors

---

## PHASE 2: Core Application Components (PRIORITY 2)
**Impact**: Essential functionality for daily operations

### 2.1 Contract Management
**File**: `client/src/pages/contracts.tsx`
**Issue**: Contract list can't access settings for display
**Fix**: Convert settings query to JWT
**Test**: Contracts page → loads properly with user settings

### 2.2 Compliance System
**File**: `client/src/pages/compliance.tsx`
**Issue**: Compliance tracking can't verify authentication
**Fix**: Replace credentials with JWT header
**Test**: Compliance page → loads and functions normally

### 2.3 Trial Success Flow
**File**: `client/src/pages/trial-success.tsx`
**Issue**: Post-signup flow authentication issues
**Fix**: Update API calls to use JWT
**Test**: Complete signup → trial success page works

---

## PHASE 3: Admin & Analytics (PRIORITY 3)
**Impact**: Administrative functions and monitoring

### 3.1 Admin Analytics
**File**: `client/src/components/admin-analytics.tsx`
**Issue**: Admin dashboard analytics fail
**Fix**: Convert to JWT auth pattern
**Test**: Admin page → analytics display correctly

### 3.2 Health Monitoring
**File**: `client/src/components/health-check.tsx`
**Issue**: System health checks fail auth
**Fix**: Add JWT headers to health API calls
**Test**: Health indicators show green status

### 3.3 Notifications System
**File**: `client/src/components/notifications-dropdown.tsx`
**Issue**: Notifications can't authenticate
**Fix**: Convert notification API calls to JWT
**Test**: Notification dropdown populates and updates

---

## IMPLEMENTATION PATTERN

For each file, follow this exact pattern:

### Step 1: Add Auth Helper Function
```typescript
// Helper function to get the correct auth token
const getAuthToken = () => {
  const hostname = window.location.hostname;
  
  // Development: Check for admin token first, then regular dev token
  if (hostname.includes('janeway.replit.dev') || hostname.includes('localhost')) {
    return localStorage.getItem('authToken_dev_admin') || localStorage.getItem('authToken_dev');
  }
  
  // Production: Use domain-specific token
  return localStorage.getItem(`authToken_${hostname}`) || localStorage.getItem('authToken_prod');
};
```

### Step 2: Replace Session Auth Pattern
**OLD:**
```typescript
const response = await fetch('/api/endpoint', {
  credentials: 'include'
});
```

**NEW:**
```typescript
const token = getAuthToken();
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Step 3: Test Each Component
1. Navigate to the component/page
2. Check browser console for 401 errors
3. Verify functionality works as expected
4. Mark as ✅ COMPLETED in this roadmap

---

## TESTING CHECKLIST

After each phase completion:

### Phase 1 Tests:
- [ ] Create new booking with custom gig types
- [ ] View existing contract with business details
- [ ] Generate new invoice with templates
- [ ] Access templates page without errors

### Phase 2 Tests:
- [ ] Browse contracts list 
- [ ] Access compliance page
- [ ] Complete trial signup flow

### Phase 3 Tests:
- [ ] View admin analytics
- [ ] Check system health status
- [ ] View notifications dropdown

---

## COMPLETION CRITERIA

✅ **SUCCESS INDICATORS:**
1. Zero 401 authentication errors in browser console
2. All business functions (bookings, contracts, invoices) work end-to-end
3. Settings data loads correctly across all components
4. Admin functions operational

❌ **FAILURE INDICATORS:**
1. 401 errors persist after conversion
2. Settings data not loading in any component
3. Core business functions broken

---

## ROLLBACK PLAN
If any phase fails critically:
1. Document the specific failure
2. Revert only the failed component (not entire system)
3. Analyze root cause before proceeding
4. Consider alternate approach for that component

---

## ESTIMATED TIMELINE
- **Phase 1**: 45-60 minutes (critical path)
- **Phase 2**: 30-45 minutes (core functions)
- **Phase 3**: 30 minutes (admin/utilities)
- **Total**: 2-2.5 hours concentrated work

**Recommendation**: Complete Phase 1 first and test thoroughly before proceeding. Phase 1 fixes will immediately restore core business functionality.