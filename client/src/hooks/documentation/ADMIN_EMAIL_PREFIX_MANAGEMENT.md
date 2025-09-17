# Admin Email Prefix Management Guide

## Overview
This guide documents how to change user email prefixes at the admin level. Email prefixes determine the personalized email addresses users receive for client communications (e.g., `leads+saxweddings@mg.musobuddy.com`).

## Current System Architecture

### Database Storage
- **Table**: `users`
- **Field**: `email_prefix` (text, unique)
- **Example**: `"saxweddings"` for user `tim@saxweddings.com`

### Email Generation
- **Format**: `leads+{prefix}@mg.musobuddy.com`
- **Example**: `leads+saxweddings@mg.musobuddy.com`

### Mailgun Integration
- Automatic route creation in Mailgun for email forwarding
- Routes are managed by `server/core/mailgun-routes.ts`

## How to Change Email Prefix

### Method 1: Direct Database Update (Quickest)

```sql
-- Step 1: Check current prefix
SELECT id, email, email_prefix FROM users WHERE email = 'user@example.com';

-- Step 2: Update email prefix
UPDATE users 
SET email_prefix = 'newprefix', updated_at = NOW() 
WHERE email = 'user@example.com';

-- Step 3: Verify change
SELECT id, email, email_prefix FROM users WHERE email = 'user@example.com';
```

### Method 2: Using Storage Method

```javascript
// In server console or admin script
const { storage } = require('./server/core/storage');

// Update user email prefix
await storage.updateUser('USER_ID', { 
  emailPrefix: 'newprefix' 
});
```

### Method 3: Admin API Endpoint (Recommended for UI)

Add this endpoint to `server/core/routes.ts`:

```typescript
// Admin-only endpoint to change email prefix
app.patch('/api/admin/users/:userId/email-prefix', async (req: any, res) => {
  try {
    // Check admin authentication
    const currentUser = await storage.getUserById(req.session?.userId);
    if (!currentUser?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { newPrefix } = req.body;

    // Validate new prefix
    const { MailgunService } = await import('./mailgun-routes');
    const mailgunService = new MailgunService();
    const validation = await mailgunService.validateEmailPrefix(newPrefix);
    
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check if prefix is already taken
    const existingUser = await storage.getUserByEmailPrefix(newPrefix);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: 'Email prefix already in use' });
    }

    // Update user
    const updatedUser = await storage.updateUser(userId, { 
      emailPrefix: newPrefix.toLowerCase() 
    });

    // Update Mailgun route (optional - could be handled automatically)
    // await mailgunService.updateUserEmailRoute(userId, newPrefix);

    res.json({ 
      success: true, 
      user: updatedUser,
      newEmailAddress: `leads+${newPrefix}@mg.musobuddy.com`
    });

  } catch (error: any) {
    console.error('❌ Email prefix change error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Validation Rules

### Email Prefix Requirements
- **Length**: 2-20 characters
- **Format**: Only `a-z`, `0-9`, and `-` allowed
- **Uniqueness**: Must be unique across all users
- **Reserved Words**: Cannot use reserved prefixes (admin, support, api, etc.)

### Validation Code Location
- **File**: `server/core/mailgun-routes.ts`
- **Method**: `validateEmailPrefix(prefix: string)`

## Impact Assessment

### What Changes When Email Prefix Updates

1. **User's Email Address**: 
   - Old: `leads+oldprefix@mg.musobuddy.com`
   - New: `leads+newprefix@mg.musobuddy.com`

2. **Mailgun Routes**: May need manual update in Mailgun dashboard

3. **Client Communications**: Clients must be informed of new email address

4. **Email History**: Previous emails to old prefix will no longer reach user

### What Doesn't Change
- User's login email (`tim@saxweddings.com`)
- User ID or other account data
- Existing bookings, contracts, invoices
- Authentication or session data

## Required Storage Methods

Add this method to `server/core/storage.ts` if not present:

```typescript
async getUserByEmailPrefix(emailPrefix: string) {
  const result = await db.select().from(users)
    .where(eq(users.emailPrefix, emailPrefix.toLowerCase()));
  return result[0] || null;
}
```

## Best Practices

### Before Changing Email Prefix
1. **Verify user identity**: Confirm you're changing the right user
2. **Check availability**: Ensure new prefix isn't taken
3. **Document reason**: Log why the change is being made
4. **Backup data**: Note old prefix for reference

### After Changing Email Prefix
1. **Test email delivery**: Send test email to new address
2. **Update user settings**: Verify user can receive emails
3. **Notify user**: Inform them of the new email address
4. **Update documentation**: Record the change in admin logs

### Communication Template
```
Subject: Your MusoBuddy Email Address Has Been Updated

Dear [User Name],

Your personalized email address for receiving client enquiries has been updated to:
leads+[newprefix]@mg.musobuddy.com

Please update any business cards, websites, or marketing materials with this new email address.

If you have any questions, please contact support.

Best regards,
MusoBuddy Admin Team
```

## Troubleshooting

### Common Issues

1. **"Email prefix already in use"**
   - Check: `SELECT email, email_prefix FROM users WHERE email_prefix = 'prefix';`
   - Solution: Choose different prefix or resolve duplicate

2. **"Invalid email prefix format"**
   - Check validation rules (2-20 chars, a-z, 0-9, - only)
   - Solution: Use compliant format

3. **Mailgun route not updating**
   - Check Mailgun dashboard manually
   - Update route expression: `match_recipient("newprefix-leads@mg.musobuddy.com")`

4. **User not receiving emails after change**
   - Verify Mailgun route is active
   - Test email delivery manually
   - Check spam folders

### Recovery Procedures

If email prefix change causes issues:

```sql
-- Rollback to previous prefix (if known)
UPDATE users 
SET email_prefix = 'oldprefix', updated_at = NOW() 
WHERE id = 'USER_ID';
```

## Security Considerations

- Only admin users should change email prefixes
- Log all email prefix changes for audit trail
- Validate all inputs to prevent injection attacks
- Consider rate limiting for email prefix changes

## File Locations Summary

- **Database Schema**: `shared/schema.ts` (line 36: `emailPrefix` field)
- **Storage Methods**: `server/core/storage.ts` (`updateUser`, `getUserByEmailPrefix`)
- **Validation Logic**: `server/core/mailgun-routes.ts` (`validateEmailPrefix`)
- **Admin Routes**: `server/core/routes.ts` (add admin endpoint)
- **Email Integration**: `server/core/email-onboarding.ts` (prefix assignment)

## Last Updated
January 28, 2025