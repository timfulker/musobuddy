# CRITICAL: DMARC DNS Record Setup Required

## External Consultant Findings
Gmail delivery is failing because the DMARC policy is missing. This is the critical blocker preventing email forwarding from working.

## Required DNS Records

### 1. Primary Domain DMARC
```
Record Type: TXT
Host: _dmarc
Name: _dmarc.musobuddy.com
Value: v=DMARC1; p=none; rua=mailto:dmarc@musobuddy.com
TTL: 300
```

### 2. Subdomain DMARC (Critical for mg.musobuddy.com)
```
Record Type: TXT
Host: _dmarc.mg
Name: _dmarc.mg.musobuddy.com
Value: v=DMARC1; p=none; rua=mailto:dmarc@musobuddy.com
TTL: 300
```

## Setup Instructions in Namecheap

1. **Login to Namecheap** → Domain List → musobuddy.com → Advanced DNS
2. **Click "Add New Record"**
3. **Add First Record:**
   - Type: TXT Record
   - Host: _dmarc
   - Value: v=DMARC1; p=none; rua=mailto:dmarc@musobuddy.com
   - TTL: 300
4. **Add Second Record:**
   - Type: TXT Record
   - Host: _dmarc.mg
   - Value: v=DMARC1; p=none; rua=mailto:dmarc@musobuddy.com
   - TTL: 300
5. **Save Changes**

## Verification Commands

After adding the records, verify propagation:

```bash
# Check primary domain DMARC
dig TXT _dmarc.musobuddy.com

# Check subdomain DMARC
dig TXT _dmarc.mg.musobuddy.com
```

## Expected Results

Once propagated, you should see:
- `_dmarc.musobuddy.com` returns: `v=DMARC1; p=none; rua=mailto:dmarc@musobuddy.com`
- `_dmarc.mg.musobuddy.com` returns: `v=DMARC1; p=none; rua=mailto:dmarc@musobuddy.com`

## Impact

This fix will:
- ✅ Enable Gmail to accept emails to leads@musobuddy.com
- ✅ Improve email deliverability for outgoing emails
- ✅ Resolve the core email forwarding issue
- ✅ Allow webhook processing to work properly

## Status: CRITICAL - REQUIRED FOR SYSTEM TO FUNCTION

Without these DMARC records, Gmail will reject emails sent to leads@musobuddy.com, preventing the entire email forwarding automation from working.