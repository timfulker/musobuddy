# DNS Update Instructions

## DMARC Record Update (Critical)

**Current DMARC record:**
```
Host: _dmarc
Value: v=DMARC1; p=none;
```

**Update to:**
```
Host: _dmarc
Value: v=DMARC1; p=none; pct=100; fo=1; ri=3600; rua=mailto:dcd00fb8@dmarc.mailgun.org
```

## Domain Key Record (Verify)

**Host:** `mailo._domainkey`
**Value:** `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDb+9X7LeYD7bPMPBtWV9hOI69pfCtSDeQigRop1PnUWNzvEyfxuIv0qw6fQ80DiXJ7XTqxOj9YMIkgD3L1BuIBLKA1URyKM7k2ZG+Y3WXmLZQrA99vUJa55tn8+tbe3V3Qmv+YW34omBaVSHANCYOgR7Q78HEKX6feBErzWsIUbQIDAQAB`

This should match exactly what's in your Namecheap DNS.

## After Making Changes

1. Save the DNS records
2. Wait 1-2 hours for DNS propagation
3. Test sending an email to leads@musobuddy.com
4. Check if the webhook now receives proper email data with correct subject and sender

The incomplete DMARC record is likely causing email providers to strip authentication data, resulting in "No Subject" and "unknown@email.com" in your webhook.