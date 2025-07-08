# DNS Fix Instructions for Namecheap

## IMMEDIATE ACTIONS REQUIRED

### 1. Add MX Record (CRITICAL)
```
Type: MX
Host: @ (or leave blank)
Value: mx.sendgrid.net
Priority: 10
TTL: Automatic (or 300)
```

### 2. Add SPF Record (CRITICAL)
```
Type: TXT
Host: @ (or leave blank)  
Value: v=spf1 include:sendgrid.net ~all
TTL: Automatic (or 300)
```

### 3. Verify A Record
```
Type: A
Host: @ (or leave blank)
Value: 76.76.19.19
TTL: Automatic
```
*(This appears to be correct based on your screenshot)*

## VERIFICATION STEPS

After adding the records, verify with:

1. **MX Record Test**
   - Wait 5-10 minutes for propagation
   - Test: Send email to leads@musobuddy.com
   - Should not bounce back

2. **SPF Record Test**
   - Wait 5-10 minutes for propagation  
   - Test: Send email from authenticated domain
   - Should not be marked as spam

3. **DNS Propagation Check**
   - Use online DNS checker tools
   - Verify records are visible globally

## QUESTIONS FOR NAMECHEAP

When you contact them, ask:

1. **"Why did my MX and TXT records disappear from musobuddy.com?"**
2. **"Are there any automatic cleanup processes that might have removed them?"**
3. **"Can you see any logs showing when the records were deleted?"**
4. **"Is there a way to restore DNS records from a backup?"**
5. **"Are there any account issues that might cause DNS records to disappear?"**

## PRIORITY ORDER

1. **URGENT**: Add MX record (stops email bouncing)
2. **URGENT**: Add SPF record (stops spam issues)  
3. **MEDIUM**: Verify CNAME records are correct
4. **LOW**: Investigate why records disappeared

## EXPECTED RESULT

Once the MX and SPF records are restored:
- Emails to leads@musobuddy.com should reach SendGrid
- SendGrid should forward to our webhook
- Email forwarding should work immediately
- SendGrid support investigation should show positive results

**The missing MX record explains why SendGrid couldn't find any email routing!**