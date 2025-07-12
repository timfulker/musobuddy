# DMARC Setup Required for Gmail Email Delivery

## Issue Identified
Gmail requires DMARC policy configuration for email delivery. Currently missing from mg.musobuddy.com DNS records.

## Required DNS Record
Add this TXT record to your Namecheap DNS for mg.musobuddy.com:

**Record Type**: TXT  
**Host**: `_dmarc.mg.musobuddy.com`  
**Value**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@musobuddy.com; ruf=mailto:dmarc@musobuddy.com; sp=quarantine; adkim=r; aspf=r`

## Alternative Simple DMARC Policy
If you prefer a simpler setup:

**Record Type**: TXT  
**Host**: `_dmarc.mg.musobuddy.com`  
**Value**: `v=DMARC1; p=none; rua=mailto:dmarc@musobuddy.com`

## Steps to Add in Namecheap

You need TWO DMARC records:

### Record 1: Main Domain DMARC (for receiving emails)
1. **Login to Namecheap**
2. **Go to Domain List** → Select musobuddy.com
3. **Click "Manage"** → Advanced DNS
4. **Click "Add New Record"**
5. **Select "TXT Record"**
6. **Enter**:
   - **Host**: `_dmarc`
   - **Value**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@musobuddy.com; ruf=mailto:dmarc@musobuddy.com; sp=quarantine; adkim=r; aspf=r`
   - **TTL**: Automatic (or 300)
7. **Save Changes**

### Record 2: Subdomain DMARC (NEEDS FIXING)
The existing `_dmarc.mg` record is not working properly. You need to fix it:

**Current (broken)**: `_dmarc.mg` with complex value
**Should be**: `_dmarc.mg` with simple value

**Fix the existing record**:
- **Host**: `_dmarc.mg` (keep the same)
- **Value**: `v=DMARC1; p=none; rua=mailto:dmarc@musobuddy.com`
- **TTL**: Automatic (or 300)

**The Issue**: Your current `_dmarc.mg` record has a complex policy that's not being recognized by email servers. A simple policy will work better.

## Why This Fixes Gmail Delivery

- **DMARC Policy**: Tells Gmail how to handle emails from your domain
- **Quarantine Policy**: Legitimate emails get delivered, suspicious ones go to spam
- **Reporting**: You'll get reports about email authentication
- **Gmail Compliance**: Meets Gmail's requirements for bulk email acceptance

## Expected Timeline
- **DNS Propagation**: 15-30 minutes
- **Gmail Recognition**: Immediate after propagation
- **Email Delivery**: Should work immediately after DMARC is active

## Test After Setup
1. Wait 30 minutes for DNS propagation
2. Send test email to leads@musobuddy.com
3. Check if enquiry is created in dashboard
4. Verify DMARC record with online DMARC checker

## DMARC Record Explanation
- `v=DMARC1`: DMARC version
- `p=quarantine`: Policy for failed authentication
- `rua=mailto:dmarc@musobuddy.com`: Aggregate reports email
- `ruf=mailto:dmarc@musobuddy.com`: Forensic reports email
- `sp=quarantine`: Subdomain policy
- `adkim=r`: Relaxed DKIM alignment
- `aspf=r`: Relaxed SPF alignment

This should resolve the Gmail delivery issue immediately once the DNS record propagates.