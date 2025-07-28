# Manual Testing Guide for MusoBuddy Authentication

## Quick Start Testing

### 1. Basic Flow Test (5 minutes)
```
1. Open http://localhost:5000
2. Click "Get Started" → Should go to signup page
3. Fill out signup form with:
   - First Name: Test
   - Last Name: User  
   - Email: your-email@example.com
   - Phone: 07123456789 (UK format)
   - Password: TestPassword123!
4. Submit form → Should show verification page
5. Check console logs for verification code
6. Enter the 6-digit code → Should show trial success page
7. Navigate to dashboard → Should show authenticated app
```

### 2. Error Testing (3 minutes)
```
1. Try signup with same email → Should show "Email already exists"
2. Try invalid phone number → Should show validation error
3. Try mismatched passwords → Should show "Passwords don't match"
4. Try login with wrong password → Should show "Invalid credentials"
```

### 3. Session Testing (2 minutes)
```
1. Login successfully
2. Refresh browser → Should stay logged in
3. Open new tab → Should stay authenticated
4. Logout → Should redirect to landing page
5. Try accessing /dashboard → Should redirect to landing
```

## Automated Testing

### Run API Test Script
```bash
node test-auth-endpoints.js
```

This will test all API endpoints automatically and show results.

### Expected Output
```
✅ PASS Health Check
✅ PASS User Signup  
✅ PASS Phone Verification
✅ PASS User Login
✅ PASS Session Check
✅ PASS User Logout
✅ PASS Error Handling

Overall: 7/7 tests passed
🎉 All tests passed! Authentication system is working correctly.
```

## Database Verification

### Check User Creation
```sql
SELECT id, email, phone_number, phone_verified, tier, created_at 
FROM users 
WHERE email = 'your-test-email@example.com';
```

### Check Phone Verification
```sql
SELECT phone_number, verification_code, verified_at 
FROM phone_verifications 
WHERE phone_number = '+447123456789' 
ORDER BY created_at DESC LIMIT 1;
```

### Check Sessions
```sql
SELECT sess->'user'->>'id' as user_id, 
       sess->'user'->>'email' as email,
       expire 
FROM sessions 
WHERE expire > NOW();
```

## Production Testing Checklist

### Before Deployment
- [ ] All manual tests pass
- [ ] API test script shows 7/7 passed
- [ ] Database shows clean test data
- [ ] Console logs show proper environment detection
- [ ] SMS integration configured for production

### After Deployment
- [ ] Landing page loads on production URL
- [ ] Signup creates real users
- [ ] SMS verification works with real phone numbers
- [ ] Session persistence works across browser restarts
- [ ] Error handling shows user-friendly messages

## Common Issues & Solutions

### Issue: "Verification code not working"
**Solution:** Check console logs in development mode for the actual code

### Issue: "SMS not sending"
**Solution:** Verify Twilio credentials and add phone number to verified list in trial mode

### Issue: "Session not persisting"  
**Solution:** Check PostgreSQL connection and sessions table

### Issue: "Environment detection wrong"
**Solution:** Check REPLIT_ENVIRONMENT and NODE_ENV variables

### Issue: "Phone number format error"
**Solution:** Use UK format (07xxxxxxxx) - system auto-converts to +44

## Cleanup After Testing

### Remove Test Users
```sql
DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example.com';
DELETE FROM phone_verifications WHERE phone_number = '+447123456789';
DELETE FROM sessions WHERE expire < NOW();
```

### Reset for Production
```sql
-- Keep only admin account
DELETE FROM users WHERE email != 'timfulker@gmail.com';
DELETE FROM phone_verifications;
DELETE FROM sessions;
```

## Success Criteria

✅ **User Experience:** Signup flow is intuitive and works without assistance  
✅ **Technical:** All API endpoints respond correctly  
✅ **Security:** Invalid inputs are properly rejected  
✅ **Performance:** Pages load quickly and forms respond immediately  
✅ **Reliability:** System works consistently across multiple test runs  
✅ **Mobile:** Responsive design works on mobile devices  
✅ **Production Ready:** Environment detection and SMS integration configured

**Status: Ready for comprehensive testing**