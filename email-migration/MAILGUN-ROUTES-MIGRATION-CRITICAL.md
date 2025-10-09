# CRITICAL: Mailgun Routes Migration

## Current System Analysis

### How It Works Now (Mailgun):

1. **User signs up** → No email prefix yet
2. **User claims email prefix** (e.g., "tim") → `POST /api/assign-email-prefix`
3. **System creates Mailgun route**:
   - Expression: `match_recipient("tim@enquiries.musobuddy.com")`
   - Action: `forward("https://musobuddy.replit.app/api/webhook/mailgun")`
   - Stored: Route ID saved to Mailgun (you have ~10 routes currently)
4. **Email arrives** at `tim@enquiries.musobuddy.com`
5. **Mailgun matches route** → forwards to webhook
6. **Webhook receives email** → looks up user by prefix → processes

### Your Current Routes (From Screenshot):

From the screenshot, I can see you have individual routes set up for:
- `tim@enquiries.musobuddy.com`
- `jake@enquiries.musobuddy.com`
- `dev-tim@enquiries.musobuddy.com`
- Several others (10 routes total visible)

**Question**: Yes, every new user who sets up an email prefix gets a new Mailgun route created via the API.

---

## Why This Matters for Migration

### Mailgun Route Approach:
- ✅ **Explicit routing**: Each email prefix has its own route
- ✅ **Easy to see**: Routes visible in Mailgun dashboard
- ❌ **API calls required**: `createUserEmailRoute()` called on signup
- ❌ **Deletion required**: Need to call API to remove route if user changes prefix
- ❌ **1,000 route limit**: Can't scale beyond 1,000 users per domain

### SendGrid Inbound Parse Approach:
- ✅ **No route creation**: All emails go to one webhook
- ✅ **Database-driven**: Route in code based on email prefix in DB
- ✅ **Unlimited users**: No route limit
- ❌ **Can't see routes**: No visual dashboard of user emails
- ❌ **Must handle in code**: Webhook must parse "To:" field

---

## Migration Impact

### What Happens to Existing Routes?

When you switch to SendGrid, your existing Mailgun routes become **inactive** because:

1. **DNS MX record changes** from Mailgun to SendGrid
2. Emails stop going to Mailgun entirely
3. Mailgun routes no longer receive traffic
4. All emails flow through SendGrid Inbound Parse instead

### Do You Need to Delete Mailgun Routes?

**Short answer**: No, but you should keep Mailgun account active during migration.

**Long answer**:
- If you switch back to Mailgun, the routes are still there
- If you fully migrate to SendGrid, you can delete Mailgun routes later
- No harm in leaving them (Mailgun doesn't charge per route)

---

## Code Changes Required

### Current Code (Mailgun):

**File**: `server/routes/settings-routes.ts` (line 160-167)

```typescript
// Create Mailgun route for this email
const routeResult = await mailgunRoutes.createUserEmailRoute(normalizedPrefix, userId);
if (!routeResult.success) {
  console.error('❌ Failed to create Mailgun route:', routeResult.error);
  return res.status(500).json({
    error: 'Failed to set up email forwarding. Please try again.'
  });
}
```

### Updated Code (SendGrid - No Route Creation Needed):

**Option A**: Remove route creation entirely (simple)

```typescript
// SendGrid: No route creation needed - all routing done in webhook
console.log(`✅ Email prefix "${normalizedPrefix}" assigned to user ${userId}`);
console.log(`📧 User will receive emails at: ${normalizedPrefix}@enquiries.musobuddy.com`);
// Route will be handled automatically by Inbound Parse webhook
```

**Option B**: Keep abstraction for backward compatibility (recommended)

```typescript
// Create email route (Mailgun) or just log (SendGrid)
const emailProvider = process.env.EMAIL_PROVIDER || 'mailgun';

if (emailProvider === 'mailgun') {
  const routeResult = await mailgunRoutes.createUserEmailRoute(normalizedPrefix, userId);
  if (!routeResult.success) {
    console.error('❌ Failed to create Mailgun route:', routeResult.error);
    return res.status(500).json({
      error: 'Failed to set up email forwarding. Please try again.'
    });
  }
  console.log(`✅ Mailgun route created for ${normalizedPrefix}@enquiries.musobuddy.com`);
} else {
  // SendGrid: No route creation needed
  console.log(`✅ Email prefix "${normalizedPrefix}" will be routed via Inbound Parse`);
  console.log(`📧 User will receive emails at: ${normalizedPrefix}@enquiries.musobuddy.com`);
}
```

---

## Webhook Changes Required

### Current Mailgun Webhook (server/index.ts):

The webhook already extracts the email prefix from the recipient:

```typescript
app.post('/api/webhook/mailgun', upload.any(), async (req, res) => {
  const webhookData = req.body;
  const recipientEmail = webhookData.recipient || webhookData.To || '';

  // Extract prefix: tim@enquiries.musobuddy.com → "tim"
  const recipientMatch = recipientEmail.match(/^([^@]+)@enquiries\.musobuddy\.com/);
  const emailPrefix = recipientMatch ? recipientMatch[1] : '';
  const normalizedPrefix = normalizeEmailPrefix(emailPrefix);

  // Look up user by prefix
  const userResults = await db.select().from(users).where(eq(users.emailPrefix, normalizedPrefix));
  // ... rest of processing
});
```

**This already works for database-driven routing!** ✅

### SendGrid Webhook (NEW):

The SendGrid webhook will work **exactly the same way**:

```typescript
app.post('/api/webhook/sendgrid', upload.any(), async (req, res) => {
  const webhookData = req.body;

  // SendGrid uses different field names
  const recipientEmail = webhookData.to || ''; // "to" instead of "recipient"

  // Extract prefix: tim@enquiries.musobuddy.com → "tim"
  const recipientMatch = recipientEmail.match(/^([^@]+)@enquiries\.musobuddy\.com/);
  const emailPrefix = recipientMatch ? recipientMatch[1] : '';
  const normalizedPrefix = normalizeEmailPrefix(emailPrefix);

  // Look up user by prefix (SAME AS MAILGUN)
  const userResults = await db.select().from(users).where(eq(users.emailPrefix, normalizedPrefix));
  // ... rest of processing (identical to Mailgun)
});
```

**Key insight**: Your system already uses database-driven routing, so the migration is simpler than expected!

---

## Migration Checklist - Routes Specific

### Pre-Migration:

- [ ] **Count existing routes**: How many users have email prefixes?
  ```sql
  SELECT COUNT(*) FROM users WHERE email_prefix IS NOT NULL;
  ```

- [ ] **Verify database has all prefixes**: Ensure every Mailgun route has corresponding DB entry
  ```sql
  SELECT email_prefix FROM users WHERE email_prefix IS NOT NULL ORDER BY email_prefix;
  ```

- [ ] **Export Mailgun routes** (for backup):
  - Go to Mailgun Dashboard → Routes
  - Take screenshot or export list
  - Keep for reference during migration

### During Migration:

- [ ] **Update settings-routes.ts**: Add provider check before creating route
- [ ] **Create SendGrid webhook**: Add new endpoint with same logic as Mailgun
- [ ] **Set up SendGrid Inbound Parse**: Point to new webhook URL
- [ ] **Update DNS MX record**: Switch from Mailgun to SendGrid
- [ ] **Test with existing user**: Send email to existing prefix, verify routing works

### Post-Migration:

- [ ] **Monitor webhook logs**: Check that user lookup by prefix works
- [ ] **Test new user signup**: Ensure email prefix assignment works without route creation
- [ ] **Verify all existing users**: Test a few existing email prefixes
- [ ] **Keep Mailgun routes**: Don't delete for 30 days (rollback safety)

---

## User Impact Assessment

### Existing Users (Already Have Email Prefix):

**Impact**: **None** (if migration done correctly)

- Their email prefix is in database: ✅
- SendGrid webhook will look up by prefix: ✅
- Emails will route correctly: ✅
- No action required from users: ✅

### New Users (Sign Up After Migration):

**Impact**: **None** (if code updated correctly)

- They choose email prefix: ✅
- Prefix saved to database: ✅
- No Mailgun route created (not needed with SendGrid): ✅
- SendGrid webhook routes by database lookup: ✅
- Works exactly the same from user perspective: ✅

---

## Testing Plan - Routes Specific

### Test 1: Existing User Email Routing

**Setup**:
- User: tim (existing email prefix)
- Email: `tim@enquiries.musobuddy.com`

**Test**:
1. Send email to `tim@enquiries.musobuddy.com`
2. Check SendGrid Inbound Parse receives it
3. Verify webhook extracts prefix "tim"
4. Verify database lookup finds user
5. Verify email processed correctly (booking created or review queue)

**Expected Result**: ✅ Email routes to correct user, processed normally

### Test 2: New User Email Prefix Assignment

**Setup**:
- New user signs up
- Chooses email prefix "sarah"

**Test**:
1. User claims prefix via `/api/assign-email-prefix`
2. Verify database updated with `email_prefix = 'sarah'`
3. Verify no Mailgun API call made (if using SendGrid)
4. Send test email to `sarah@enquiries.musobuddy.com`
5. Verify webhook routes correctly

**Expected Result**: ✅ Prefix assigned, email routing works without route creation

### Test 3: Edge Cases

**Test 3a**: Email to non-existent prefix
- Send to `nonexistent@enquiries.musobuddy.com`
- Expected: Webhook logs "No user found", returns 200 OK

**Test 3b**: Email to dev-prefixed address
- Send to `dev-tim@enquiries.musobuddy.com`
- Expected: `normalizeEmailPrefix()` strips "dev-" → finds user "tim"

**Test 3c**: Case sensitivity
- Send to `TIM@enquiries.musobuddy.com` (uppercase)
- Expected: Routes to user "tim" (case-insensitive lookup)

---

## Route Management Comparison

### Mailgun Approach (Current):

```
User signup → Choose prefix → API call to Mailgun → Route created → Prefix in DB
                                     ↓
                              (External dependency)
```

**Pros**:
- Visual confirmation in Mailgun dashboard
- Explicit route per user

**Cons**:
- API call can fail → user can't complete signup
- External dependency (Mailgun must be available)
- Requires cleanup if user changes prefix
- 1,000 route limit per domain

### SendGrid Approach (Proposed):

```
User signup → Choose prefix → Prefix in DB
                                     ↓
                              (No external API call)
```

**Pros**:
- Faster signup (no API call)
- No external dependency
- Unlimited users
- Simpler code

**Cons**:
- No visual dashboard of routes
- Must trust database as source of truth

---

## Database Schema Check

Ensure your `users` table has the `email_prefix` column:

```sql
-- Check if column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_prefix';
```

If you don't have this column, add it:

```sql
ALTER TABLE users ADD COLUMN email_prefix VARCHAR(50) UNIQUE;
CREATE INDEX idx_users_email_prefix ON users(email_prefix);
```

---

## Rollback Considerations - Routes

### If You Need to Switch Back to Mailgun:

**Scenario 1**: Within 30 days of migration
- **DNS**: Change MX record back to Mailgun
- **Routes**: Still exist in Mailgun (not deleted)
- **Impact**: Emails immediately route through Mailgun again
- **Time**: 1-2 hours (DNS propagation)

**Scenario 2**: After 30+ days, routes deleted
- **Problem**: Mailgun routes were deleted, need to recreate
- **Solution**: Bulk create routes from database

```typescript
// Bulk recreate Mailgun routes from database
const usersWithPrefixes = await db.select().from(users).where(isNotNull(users.emailPrefix));

for (const user of usersWithPrefixes) {
  await mailgunRoutes.createUserEmailRoute(user.emailPrefix, user.id);
  console.log(`✅ Recreated route for ${user.emailPrefix}`);
}
```

**Recommendation**: Keep Mailgun routes for 60-90 days before deleting.

---

## Updated Migration Timeline

### Week 1: Preparation
- [ ] Count existing email prefixes/routes
- [ ] Export Mailgun routes for backup
- [ ] Update settings-routes.ts with provider check
- [ ] Add SendGrid webhook handler
- [ ] Test in development

### Week 2: SendGrid Setup
- [ ] Set up SendGrid Inbound Parse
- [ ] Configure webhook URL
- [ ] Test with existing user prefix
- [ ] Test new user signup
- [ ] Verify all routing works

### Week 3: DNS Migration
- [ ] Update MX record to SendGrid
- [ ] Monitor webhook logs closely
- [ ] Test existing user emails
- [ ] Test new user signups
- [ ] Fix any issues

### Week 4-12: Stability Period
- [ ] Monitor for 30-60 days
- [ ] Keep Mailgun routes active (don't delete)
- [ ] Keep Mailgun account active
- [ ] Verify deliverability stable

### After 90 Days: Cleanup
- [ ] If all good: Delete Mailgun routes
- [ ] If all good: Cancel Mailgun account
- [ ] Document SendGrid as primary provider

---

## Code Update Required

### File: `server/routes/settings-routes.ts`

Replace lines 160-167 with:

```typescript
// Create email route (provider-dependent)
const emailProvider = process.env.EMAIL_PROVIDER || 'mailgun';

if (emailProvider === 'mailgun') {
  // Mailgun: Create route via API
  const routeResult = await mailgunRoutes.createUserEmailRoute(normalizedPrefix, userId);
  if (!routeResult.success) {
    console.error('❌ Failed to create Mailgun route:', routeResult.error);
    return res.status(500).json({
      error: 'Failed to set up email forwarding. Please try again.'
    });
  }
  console.log(`✅ Mailgun route created: ${normalizedPrefix}@enquiries.musobuddy.com → ${routeResult.routeId}`);
} else if (emailProvider === 'sendgrid') {
  // SendGrid: No route creation needed, routing handled in webhook
  console.log(`✅ Email prefix assigned: ${normalizedPrefix}@enquiries.musobuddy.com`);
  console.log(`📧 Routing will be handled by Inbound Parse webhook`);
  // No API call needed - webhook will look up user by prefix from database
} else {
  console.warn(`⚠️ Unknown email provider: ${emailProvider}, skipping route creation`);
}
```

---

## Summary - Routes Impact

### Key Takeaways:

1. **Yes**, a new Mailgun route is created for each user email prefix ✅
2. **Your system already uses database-driven routing** (looks up user by prefix) ✅
3. **SendGrid migration is simpler** because you don't need route creation ✅
4. **Existing users**: Zero impact (prefix in DB, webhook routes correctly) ✅
5. **New users**: Same experience, just no Mailgun API call ✅
6. **Rollback safety**: Keep Mailgun routes for 60-90 days ✅

### What Changes:

| Aspect | Mailgun | SendGrid |
|--------|---------|----------|
| **Route creation** | API call on user signup | No API call needed |
| **Route storage** | Mailgun dashboard | Database only |
| **Route limit** | 1,000 per domain | Unlimited |
| **Routing logic** | Match expression in Mailgun → webhook | All emails → webhook → database lookup |
| **User impact** | None | None |
| **Code complexity** | More (API calls, error handling) | Less (just database) |

### Recommendation:

The route system is actually a **benefit** for migrating to SendGrid, not a complication. Your code already does database-driven routing, so SendGrid's "all emails to one webhook" approach is actually **simpler** than managing individual Mailgun routes.

**Action**: Update `settings-routes.ts` to skip route creation when using SendGrid, and you're good to go.
