# Mailgun DNS Records Backup

**Date:** 2025-10-08
**Domain:** musobuddy.com
**Status:** REMOVED - Migrated to SendGrid

---

## MX Records (REMOVED)

| Type | Host | Value | Priority |
|------|------|-------|----------|
| MX Record | @ | mxa.eu.mailgun.org. | 10 |
| MX Record | @ | mxb.eu.mailgun.org. | 10 |
| MX Record | enquiries | mxa.eu.mailgun.org. | 10 |
| MX Record | enquiries | mxb.eu.mailgun.org. | 10 |
| MX Record | mg | mxa.eu.mailgun.org. | 10 |
| MX Record | mg | mxb.eu.mailgun.org. | 10 |

---

## Current SendGrid MX Records (ACTIVE)

| Type | Host | Value | Priority |
|------|------|-------|----------|
| MX Record | @ | mx.sendgrid.net. | 10 |
| MX Record | enquiries | mx.sendgrid.net. | 10 |
| MX Record | mg | mx.sendgrid.net. | 10 |

---

## Mailgun CNAME Records (TO BE DELETED)

| Type | Host | Value |
|------|------|-------|
| CNAME | email | eu.mailgun.org. |
| CNAME | email.enquiries | eu.mailgun.org. |
| CNAME | email.mg | eu.mailgun.org. |

## Mailgun TXT Records (TO BE DELETED)

| Type | Host | Value |
|------|------|-------|
| TXT | @ | v=spf1 include:mailgun.org ~all |
| TXT | enquiries | v=spf1 include:mailgun.org ~all |
| TXT | mg | v=spf1 include:mailgun.org ~all |
| TXT | email._domainkey.mg | k=rsa; p=MIGfMA0GCS... (DKIM key) |
| TXT | s1._domainkey.enquiries | k=rsa; p=MIGfMA0GCS... (DKIM key) |
| TXT | email._domainkey | k=rsa; p=MIGfMA0GCS... (DKIM key) |

## Mailgun DMARC Records (TO BE DELETED)

| Type | Host | Value |
|------|------|-------|
| TXT | _dmarc | v=DMARC1; p=none; pct=100; fo=1; ri=3600; rua=mailto:dcd00fb8@dmarc.mailgun.org... |
| TXT | _dmarc.enquiries | v=DMARC1; p=none; pct=100; fo=1; ri=3600; rua=mailto:dcd00fb8@dmarc.mailgun.org... |
| TXT | _dmarc.mg | v=DMARC1; p=none; pct=100; fo=1; ri=3600; rua=mailto:dcd00fb8@dmarc.mailgun.org... |

---

## SendGrid Records (KEEP - Already active)

| Type | Host | Value |
|------|------|-------|
| CNAME | em4439 | u53986634.eu.wl.sendgrid.net. |
| CNAME | eus1._domainkey | eus1.domainkey.u53986634.eu.wl.sendgrid.net. |
| CNAME | eus2._domainkey | eus2.domainkey.u53986634.eu.wl.sendgrid.net. |
| CNAME | url8088.enquiries | eu.sendgrid.net. |
| CNAME | 53986634.enquiries | eu.sendgrid.net. |
| CNAME | em6708.enquiries | u53986634.eu.wl.sendgrid.net. |
| CNAME | eus1._domainkey.enquiries | eus1.domainkey.u53986634.eu.wl.sendgrid.net. |
| CNAME | eus2._domainkey.enquiries | eus2.domainkey.u53986634.eu.wl.sendgrid.net. |
| TXT | _dmarc | v=DMARC1; p=none; rua=mailto:dmarc@sendgrid.net |

## Firebase Records (KEEP - For app.musobuddy.com)

| Type | Host | Value |
|------|------|-------|
| CNAME | firebase1._domainkey.app | mail-app-musobuddy-com.dkim1._domainkey.firebasemail.com. |
| CNAME | firebase2._domainkey.app | mail-app-musobuddy-com.dkim2._domainkey.firebasemail.com. |
| TXT | app | v=spf1 include:_spf.firebasemail.com ~all |
| TXT | app | firebase=musobuddy-601a7 |

---

## Rollback Instructions (if needed)

To revert to Mailgun:
1. Remove SendGrid MX records
2. Re-add the 6 Mailgun MX records from above
3. Change `EMAIL_PROVIDER=mailgun` in Replit secrets
4. Restart production server

---

**Created:** 2025-10-08
**Migration Status:** Phase 3 - MX records updated to SendGrid
