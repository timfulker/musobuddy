# Dual-Provider DNS Configuration
## SendGrid + Mailgun Setup for Yahoo/AOL Routing

**Date Created:** 2025-10-10
**Purpose:** Configure DNS to support both SendGrid and Mailgun for optimal deliverability
**Status:** Ready to implement

---

## 🎯 Overview

This configuration allows:
- **Yahoo/AOL emails** → Mailgun (better deliverability)
- **All other emails** → SendGrid (default)

Both providers can send simultaneously without conflicts.

---

## 📋 DNS Changes Required in Namecheap

### **1. Mailgun CNAME Records (ADD THESE)**

Go to: Namecheap → Domain List → musobuddy.com → Advanced DNS

| Type | Host | Value | TTL | Action |
|------|------|-------|-----|--------|
| CNAME | `email` | `eu.mailgun.org.` | Automatic | **ADD** |
| CNAME | `email.enquiries` | `eu.mailgun.org.` | Automatic | **ADD** |
| CNAME | `email.mg` | `eu.mailgun.org.` | Automatic | **ADD** |

**Purpose:** Email tracking and domain verification for Mailgun

---

### **2. SPF Records (UPDATE EXISTING)**

**IMPORTANT:** Edit existing SPF records, don't create new ones!

| Type | Host | Old Value | **New Value** | Action |
|------|------|-----------|---------------|--------|
| TXT | `@` | `v=spf1 include:sendgrid.net ~all` | `v=spf1 include:sendgrid.net include:mailgun.org ~all` | **EDIT** |
| TXT | `enquiries` | `v=spf1 include:sendgrid.net ~all` | `v=spf1 include:sendgrid.net include:mailgun.org ~all` | **EDIT** |
| TXT | `mg` | `v=spf1 include:sendgrid.net ~all` | `v=spf1 include:sendgrid.net include:mailgun.org ~all` | **EDIT** |

**What changed:** Added `include:mailgun.org` to authorize Mailgun to send on your behalf

---

### **3. Mailgun DKIM Records (ADD THESE)**

**⚠️ IMPORTANT:** You need to get the FULL public keys from Mailgun dashboard first!

**How to get the keys:**
1. Go to: https://app.mailgun.com/app/sending/domains
2. Click on your domain (`mg.musobuddy.com`)
3. Go to "DNS Records" tab
4. Find the DKIM records (look for `._domainkey`)
5. Copy the FULL `p=` value (should be 300+ characters)

**Then add these TXT records:**

| Type | Host | Value | TTL | Action |
|------|------|-------|-----|--------|
| TXT | `email._domainkey` | `k=rsa; p=[GET FROM MAILGUN DASHBOARD]` | Automatic | **ADD** |
| TXT | `email._domainkey.mg` | `k=rsa; p=[GET FROM MAILGUN DASHBOARD]` | Automatic | **ADD** |
| TXT | `s1._domainkey.enquiries` | `k=rsa; p=[GET FROM MAILGUN DASHBOARD]` | Automatic | **ADD** |

**Example of what the full key looks like:**
```
k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC... [~300 more characters]
```

**Note:** The selector names (`email`, `s1`) might be different in your Mailgun dashboard. Use whatever selectors Mailgun shows you.

---

### **4. SendGrid Records (VERIFY - DO NOT CHANGE)**

These should already exist. Just verify they're present:

| Type | Host | Value | Status |
|------|------|-------|--------|
| CNAME | `em4439` | `u53986634.eu.wl.sendgrid.net.` | ✅ Keep |
| CNAME | `eus1._domainkey` | `eus1.domainkey.u53986634.eu.wl.sendgrid.net.` | ✅ Keep |
| CNAME | `eus2._domainkey` | `eus2.domainkey.u53986634.eu.wl.sendgrid.net.` | ✅ Keep |
| CNAME | `em6708.enquiries` | `u53986634.eu.wl.sendgrid.net.` | ✅ Keep |
| CNAME | `eus1._domainkey.enquiries` | `eus1.domainkey.u53986634.eu.wl.sendgrid.net.` | ✅ Keep |
| CNAME | `eus2._domainkey.enquiries` | `eus2.domainkey.u53986634.eu.wl.sendgrid.net.` | ✅ Keep |

**Action:** Just verify they exist. Don't modify or delete.

---

### **5. MX Records (NO CHANGES)**

These handle INBOUND email (stay with SendGrid):

| Type | Host | Value | Priority | Status |
|------|------|-------|----------|--------|
| MX | `@` | `mx.sendgrid.net.` | 10 | ✅ Keep |
| MX | `enquiries` | `mx.sendgrid.net.` | 10 | ✅ Keep |
| MX | `mg` | `mx.sendgrid.net.` | 10 | ✅ Keep |

**Do NOT change these!** Inbound email routing stays with SendGrid.

---

### **6. DMARC Record (OPTIONAL)**

Current record (if exists):

| Type | Host | Value | Action |
|------|------|-------|--------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@sendgrid.net` | Keep as-is |

**Recommendation:** Leave unchanged. DMARC is for reporting, not critical for dual-provider setup.

---

## ✅ Implementation Checklist

### **Before DNS Changes:**
- [ ] Log into Mailgun dashboard
- [ ] Navigate to DNS Records for your domain
- [ ] Copy the FULL DKIM public keys (all 3 of them)
- [ ] Save the keys in a text file for reference

### **DNS Changes in Namecheap:**
- [ ] Add 3 Mailgun CNAME records
- [ ] Update 3 SPF TXT records (add `include:mailgun.org`)
- [ ] Add 3 Mailgun DKIM TXT records (with full keys from dashboard)
- [ ] Verify SendGrid CNAMEs still present
- [ ] Verify MX records unchanged

### **After DNS Changes:**
- [ ] Wait 15-30 minutes for initial propagation
- [ ] Check DNS propagation: https://dnschecker.org
- [ ] Full propagation: 1-4 hours

### **Code Deployment:**
- [ ] Change `EMAIL_PROVIDER=sendgrid` in Replit Secrets
- [ ] Deploy updated code
- [ ] Watch for startup logs: "Dual-provider routing enabled"
- [ ] Verify both providers configured

### **Testing:**
- [ ] Send email to Yahoo address → Check logs for Mailgun routing
- [ ] Send email to Gmail address → Check logs for SendGrid routing
- [ ] Send email to AOL address → Check logs for Mailgun routing
- [ ] Verify all emails deliver successfully

---

## 📊 Expected Startup Logs

After deployment, you should see:

```
🔧 Dual-provider routing enabled
📧 Default provider: sendgrid
📧 SendGrid configured: true
📧 Mailgun configured: true
```

---

## 🔀 Routing Behavior

When sending emails, watch for these log messages:

**Yahoo/AOL emails:**
```
🔀 [ROUTING] Yahoo/AOL detected → Mailgun for: client@yahoo.com
📧 [MAILGUN] Sending email: Re: wedding...
✅ [MAILGUN] Email sent successfully
```

**Other domains:**
```
🔀 [ROUTING] Default provider (sendgrid) for: client@gmail.com
📧 [SENDGRID] Sending email: Contract...
✅ [SENDGRID] Email sent successfully
```

---

## ⚠️ Troubleshooting

### **"SendGrid not configured" warning**
- Check `SENDGRID_API_KEY` exists in Replit Secrets
- Verify key is valid in SendGrid dashboard

### **"Mailgun not configured" warning**
- Check `MAILGUN_API_KEY` exists in Replit Secrets
- Check `MAILGUN_DOMAIN` exists (should be `mg.musobuddy.com`)
- Verify keys are valid in Mailgun dashboard

### **Emails going to spam**
- Wait 1-4 hours for DNS to fully propagate
- Verify DKIM records are correct (full keys, not truncated)
- Check SPF includes both providers

### **Routing not working**
- Check logs for `🔀 [ROUTING]` messages
- Verify `EMAIL_PROVIDER=sendgrid` is set
- Confirm both providers initialized on startup

---

## 🔙 Rollback Procedure

If you need to revert to SendGrid-only:

1. **Keep DNS as-is** (doesn't hurt to have both)
2. **No code changes needed** - routing is automatic
3. **To disable Mailgun:** Remove `MAILGUN_API_KEY` from Secrets

Or to go back to single-provider code:
1. Revert to previous Replit checkpoint
2. Redeploy

---

## 📝 Notes

- **DNS propagation:** 1-4 hours for global propagation
- **No downtime:** Can deploy before DNS fully propagates
- **Cost:** SendGrid $19.95/mo + Mailgun $35/mo = ~$55/month total
- **Temporary:** Plan to migrate to dedicated IP at launch (100+ users)

---

**Created:** 2025-10-10
**Last Updated:** 2025-10-10
**Status:** Ready for implementation
