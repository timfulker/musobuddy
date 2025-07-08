# Contract Signing System Deployment Test

## Fixed Issues for Deployment
✅ **Puppeteer Configuration**: Updated to work without hardcoded Chromium paths
✅ **Schema Fix**: Made enquiry_id optional in contracts table
✅ **Email Links**: Use REPLIT_DOMAINS environment variable for signing links

## Pre-Deployment Test Plan

### 1. Environment Variables Check
```bash
# In production, verify these exist:
echo $SENDGRID_API_KEY     # Should show SendGrid API key
echo $DATABASE_URL         # Should show Neon PostgreSQL URL  
echo $REPLIT_DOMAINS       # Should show your deployment domain
```

### 2. Contract Creation Test
- Create a new contract via UI
- Verify contract number generation
- Check database insertion

### 3. Email Sending Test
- Send contract via "Send" button
- Verify email received with correct signing link
- Check signing link format: `https://[YOUR-DOMAIN]/sign-contract/[ID]`

### 4. Digital Signing Test
- Open signing link in incognito browser
- Complete signing process
- Verify status update to "signed"
- Check confirmation emails sent

### 5. PDF Generation Test
- Download signed contract PDF
- Verify signature details appear
- Check PDF formatting and branding

## Expected Deployment Differences

### Development vs Production
- **Chromium**: Uses system Chromium instead of Nix store path
- **Domain Links**: Uses REPLIT_DOMAINS instead of localhost
- **Email**: Same SendGrid configuration should work
- **Database**: Same Neon PostgreSQL connection

## Potential Issues & Solutions

### Issue: PDF Generation Fails
**Cause**: Chromium not available in deployment
**Solution**: Puppeteer automatically downloads Chromium if not found

### Issue: Signing Links Broken  
**Cause**: REPLIT_DOMAINS not set properly
**Solution**: Set environment variable in deployment settings

### Issue: Email Sending Fails
**Cause**: SendGrid API key missing in production
**Solution**: Copy SENDGRID_API_KEY to deployment environment

## Success Criteria
✅ Contract creation works
✅ Email sending with correct links
✅ Public signing page accessible
✅ PDF generation successful
✅ Status updates correctly
✅ Confirmation emails delivered

## Rollback Plan
If deployment fails:
1. Use git rollback to last working commit
2. Return to documented stable state in replit.md
3. Debug specific deployment issue
4. Re-test in development before re-deploying