# EMERGENCY CONTRACT SYSTEM REPAIR MANUAL

## Critical System Overview
The contract system handles: PDF generation → Cloud storage → Client signing → Email confirmations → Status updates

## IMMEDIATE DIAGNOSIS CHECKLIST

### 1. Test Contract Creation
```bash
# Test contract generation endpoint
curl -X POST http://localhost:5000/api/contracts \
  -H "Content-Type: application/json" \
  -H "Cookie: musobuddy.sid=SESSION_ID" \
  -d '{
    "clientName": "Test Client",
    "eventDate": "2025-08-15",
    "eventTime": "14:00",
    "eventEndTime": "17:00",
    "venue": "Test Venue",
    "fee": "500",
    "enquiryId": null
  }'
```

### 2. Check PDF Generation Service
Location: `server/core/services.ts` - `generateContractPDF()` method
```typescript
// CRITICAL: Must use correct Chromium path
const chromiumPath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
```

### 3. Verify Cloud Storage Integration
Location: `server/core/services.ts` - `uploadContractToCloud()` method
```typescript
// CRITICAL: Must have these environment variables
process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY  
process.env.CLOUDFLARE_R2_BUCKET_NAME
process.env.CLOUDFLARE_R2_ACCOUNT_ID
```

## COMMON FAILURE POINTS & FIXES

### Issue 1: "Contract Creation Failed" - PDF Generation
**Symptoms**: 500 errors on contract creation, no PDF generated
**Root Cause**: Puppeteer/Chromium configuration

**EMERGENCY FIX**:
```typescript
// In server/core/services.ts - generateContractPDF method
const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
});
```

### Issue 2: "View Contract" Button 404 Errors
**Symptoms**: Clicking "View Contract" returns 404
**Root Cause**: Missing public route

**EMERGENCY FIX**: Add to `server/core/routes.ts`
```typescript
app.get('/view/contracts/:id', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const contract = await storage.getContract(contractId);
    
    if (!contract) {
      return res.status(404).send('Contract not found');
    }
    
    // Redirect to cloud-hosted signed PDF
    if (contract.signedContractUrl) {
      return res.redirect(contract.signedContractUrl);
    }
    
    // Fallback: generate PDF on demand
    const { MailgunService } = await import('./mailgun-service');
    const mailgunService = new MailgunService();
    const pdfBuffer = await mailgunService.generateContractPDF(contract);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('❌ Contract view error:', error);
    res.status(500).send('Error viewing contract');
  }
});
```

### Issue 3: Client Signing Failures
**Symptoms**: Clients can't sign contracts, signing page errors
**Root Cause**: Missing signing API endpoint or incorrect URLs

**EMERGENCY FIX**: Add to `server/core/routes.ts`
```typescript
app.post('/api/contracts/sign/:id', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const { signatureName, clientIpAddress } = req.body;
    
    if (!signatureName) {
      return res.status(400).json({ error: 'Signature name required' });
    }
    
    // Update contract as signed
    await storage.updateContract(contractId, {
      signed: true,
      signedAt: new Date(),
      signatureName,
      clientIpAddress: clientIpAddress || req.ip
    });
    
    // Generate signed PDF and upload to cloud
    const contract = await storage.getContract(contractId);
    const signatureDetails = {
      signedAt: new Date(),
      signatureName,
      clientIpAddress: clientIpAddress || req.ip
    };
    
    const { uploadContractToCloud } = await import('./services');
    await uploadContractToCloud(contract, signatureDetails);
    
    // Update booking status if linked
    if (contract.enquiryId) {
      await storage.updateBookingStatus(contract.enquiryId, 'confirmed');
    }
    
    // Send confirmation emails
    const { MailgunService } = await import('./mailgun-service');
    const mailgunService = new MailgunService();
    await mailgunService.sendContractConfirmationEmails(contract);
    
    res.json({ success: true, message: 'Contract signed successfully' });
  } catch (error: any) {
    console.error('❌ Contract signing error:', error);
    res.status(500).json({ error: 'Failed to sign contract' });
  }
});
```

### Issue 4: Email Confirmation System Failures
**Symptoms**: Contracts signed but no confirmation emails sent
**Root Cause**: Missing or incorrect email method

**EMERGENCY FIX**: In `server/core/mailgun-service.ts`
```typescript
async sendContractConfirmationEmails(contract: any) {
  try {
    const user = await storage.getUserById(contract.userId);
    if (!user) throw new Error('User not found');
    
    // Client confirmation email
    const clientHtml = this.generateClientConfirmationHtml(contract, user);
    await this.sendEmail({
      to: contract.clientEmail,
      subject: `Contract Confirmed - ${contract.eventDate}`,
      html: clientHtml
    });
    
    // Performer confirmation email  
    const performerHtml = this.generatePerformerConfirmationHtml(contract, user);
    await this.sendEmail({
      to: user.email,
      subject: `Contract Signed - ${contract.clientName} (${contract.eventDate})`,
      html: performerHtml
    });
    
    console.log('✅ Contract confirmation emails sent');
  } catch (error: any) {
    console.error('❌ Email confirmation error:', error);
    throw error;
  }
}
```

## URL DETECTION SYSTEM (CRITICAL)
**Problem**: Contract signing URLs use localhost instead of production URLs

**EMERGENCY FIX**: Create `server/core/url-detection.ts`
```typescript
export function getAppServerUrl(): string {
  // Multiple fallback layers for bulletproof URL detection
  if (process.env.APP_SERVER_URL) {
    return process.env.APP_SERVER_URL;
  }
  
  if (process.env.REPLIT_DEPLOYMENT && process.env.REPLIT_DEPLOYMENT !== 'undefined') {
    return 'https://musobuddy.replit.app';
  }
  
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  if (process.env.NODE_ENV === 'production') {
    return 'https://musobuddy.replit.app';
  }
  
  return 'http://localhost:5000';
}
```

## STORAGE METHODS VERIFICATION
Ensure these methods exist in `server/core/storage.ts`:

```typescript
async getContract(contractId: number, userId?: string) { /* ... */ }
async createContract(contractData: any) { /* ... */ }
async updateContract(contractId: number, updates: any) { /* ... */ }
async deleteContract(contractId: number) { /* ... */ }
```

## EMERGENCY CONTRACT SYSTEM RESTORE PROCEDURE

1. **Verify Database Schema** (contracts table exists with required fields)
2. **Check PDF Generation** (Chromium path and services.ts)  
3. **Test Cloud Storage** (R2 credentials and upload methods)
4. **Restore Missing Routes** (view, signing, download endpoints)
5. **Fix Email System** (Mailgun service and confirmation methods)
6. **Test End-to-End** (Create → View → Sign → Email confirmations)

## DEBUGGING COMMANDS
```bash
# Check contract generation
curl -X POST http://localhost:5000/api/contracts -H "Content-Type: application/json" -d '{"clientName":"Test"}'

# Test contract viewing  
curl http://localhost:5000/view/contracts/1

# Check contract signing
curl -X POST http://localhost:5000/api/contracts/sign/1 -H "Content-Type: application/json" -d '{"signatureName":"Test Signature"}'
```

## SUCCESS INDICATORS
- ✅ Contract creation returns 200 with contract ID
- ✅ View Contract button opens PDF without 404
- ✅ Client signing page accepts signatures
- ✅ Both client and performer receive confirmation emails
- ✅ Booking status updates to "confirmed" after signing