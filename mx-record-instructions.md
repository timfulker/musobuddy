# MX Record Setup Instructions for Namecheap

## What to Look For in Namecheap

The MX record might be in one of these locations:

### Option 1: Host Records Section (same as screenshot)
- Look for a record with **Type: MX**
- Should show: `@ MX 10 mx.sendgrid.net`

### Option 2: Mail Settings Section
- Look for a separate "Mail Settings" or "Email" tab
- MX records are sometimes managed separately from other DNS records

### Option 3: Advanced DNS Settings
- Some registrars have MX records in an "Advanced" section

## What the MX Record Should Look Like

```
Type: MX
Host: @ (or blank)
Value: mx.sendgrid.net  
Priority: 10
TTL: Automatic
```

## If MX Record is Missing

Add it in the Host Records section:
1. Click "Add New Record"
2. Select "MX Record" from dropdown
3. Host: @ (or leave blank)
4. Value: mx.sendgrid.net
5. Priority: 10
6. TTL: Automatic
7. Save

## Why This Matters

- **Without MX Record**: Emails bounce back or go nowhere
- **With MX Record**: Emails route to SendGrid → webhook → enquiry creation
- **Current Issue**: This is likely why SendGrid support can't see email routing

## Next Steps

1. Find or add the MX record in Namecheap
2. Wait 5-10 minutes for DNS propagation
3. Test by sending email to leads@musobuddy.com
4. Should see webhook activity immediately

**This is the missing piece that will fix the email forwarding!**