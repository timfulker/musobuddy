# DNS Configuration Fix Required

## Current Problem
Your SPF record is configured as a CNAME record pointing to mx.sendgrid.net, but this is incorrect.

## Required Changes in Namecheap DNS:

### 1. Remove the CNAME record:
- Delete: `spf.musobuddy.com` CNAME → `mx.sendgrid.net`

### 2. Add a TXT record for SPF:
- **Type**: TXT
- **Host**: @ (root domain)
- **Value**: `v=spf1 include:sendgrid.net ~all`
- **TTL**: Automatic

## Why This Matters
- SPF records must be TXT records, not CNAME records
- Email providers check the root domain for SPF authentication
- Without proper SPF, emails may be rejected or marked as spam
- This is likely why your webhook isn't receiving emails

## After Making Changes
1. Wait 5-10 minutes for DNS propagation
2. Test with: `dig TXT musobuddy.com` (should show SPF record)
3. Send another test email to leads@musobuddy.com