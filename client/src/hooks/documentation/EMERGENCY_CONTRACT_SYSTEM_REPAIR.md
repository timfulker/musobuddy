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
**Root Cause**: Puppeteer/Chromium configuration or HTML template issues

**COMPLETE PDF GENERATION RESTORATION**:

#### Step 1: Verify Chromium Path in `server/core/services.ts`
```typescript
// CRITICAL: Exact Chromium path for Replit environment
const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-plugins',
    '--run-all-compositor-stages-before-draw',
    '--no-first-run'
  ]
});
```

#### Step 2: Complete Professional HTML Template (CRITICAL)
```typescript
// In server/core/services.ts - generateContractPDF method
const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Performance Contract</title>
    <style>
        @page {
            margin: 40px;
            size: A4;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .header {
            background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
            color: white;
            padding: 25px;
            text-align: center;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        
        .contract-details {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
        }
        
        .detail-label {
            font-weight: bold;
            color: #2563eb;
            min-width: 120px;
        }
        
        .detail-value {
            color: #1e293b;
            flex: 1;
            text-align: right;
        }
        
        .parties-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin: 25px 0;
        }
        
        .party-card {
            border: 2px solid #2563eb;
            border-radius: 8px;
            padding: 20px;
            background: white;
        }
        
        .party-title {
            background: #2563eb;
            color: white;
            padding: 10px;
            margin: -20px -20px 15px -20px;
            font-weight: bold;
            font-size: 14px;
        }
        
        .terms-section {
            background: #fef7cd;
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .terms-title {
            color: #92400e;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 15px;
        }
        
        .signature-section {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
        }
        
        .signature-boxes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 30px;
        }
        
        .signature-box {
            text-align: center;
        }
        
        .signature-line {
            border-bottom: 2px solid #374151;
            margin-bottom: 8px;
            height: 50px;
            position: relative;
        }
        
        .signed-name {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 18px;
            font-weight: bold;
            color: #059669;
        }
        
        .date-signed {
            color: #059669;
            font-weight: bold;
            margin-top: 5px;
        }
        
        @media print {
            .header {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            
            .party-card, .terms-section {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>PERFORMANCE CONTRACT</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px;">Contract #${contract.contractNumber || 'N/A'}</p>
    </div>

    <div class="contract-details">
        <div class="detail-row">
            <span class="detail-label">Event Date:</span>
            <span class="detail-value">${formatDate(contract.eventDate)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Performance Time:</span>
            <span class="detail-value">${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Venue:</span>
            <span class="detail-value">${contract.venue || 'TBC'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Performance Fee:</span>
            <span class="detail-value">£${contract.fee || 'TBC'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Performance Duration:</span>
            <span class="detail-value">${contract.performanceDuration || 'TBC'}</span>
        </div>
    </div>

    <div class="parties-section">
        <div class="party-card">
            <div class="party-title">CLIENT</div>
            <p><strong>${contract.clientName || 'TBC'}</strong></p>
            <p>${contract.clientEmail || 'TBC'}</p>
            <p>${contract.clientPhone || 'TBC'}</p>
            ${contract.clientAddress ? `<p>${formatAddress(contract.clientAddress)}</p>` : '<p>Address TBC</p>'}
        </div>
        
        <div class="party-card">
            <div class="party-title">PERFORMER</div>
            <p><strong>${user.businessName || user.email}</strong></p>
            <p>${user.email}</p>
            <p>${user.phone || 'TBC'}</p>
            ${formatPerformerAddress(user)}
        </div>
    </div>

    <div class="terms-section">
        <div class="terms-title">TERMS & CONDITIONS</div>
        <ul style="margin: 0; padding-left: 20px;">
            <li>Payment terms: ${contract.paymentTerms || 'As agreed between parties'}</li>
            <li>Cancellation policy: ${contract.cancellationPolicy || 'As agreed between parties'}</li>
            <li>Equipment requirements: ${contract.equipment || 'As specified in booking details'}</li>
            <li>Setup time required: ${contract.setupTime || 'As agreed between parties'}</li>
            <li>Additional terms: ${contract.additionalTerms || 'None specified'}</li>
        </ul>
    </div>

    <div class="signature-section">
        <p style="text-align: center; font-weight: bold; margin-bottom: 20px;">
            By signing below, both parties agree to the terms and conditions outlined in this contract.
        </p>
        
        <div class="signature-boxes">
            <div class="signature-box">
                <div class="signature-line">
                    ${contract.signed && contract.signatureName ? 
                      `<div class="signed-name">${contract.signatureName}</div>` : ''}
                </div>
                <p><strong>CLIENT SIGNATURE</strong></p>
                <p>${contract.clientName || 'TBC'}</p>
                ${contract.signed && contract.signedAt ? 
                  `<p class="date-signed">Signed: ${formatDate(contract.signedAt)}</p>` : ''}
            </div>
            
            <div class="signature-box">
                <div class="signature-line"></div>
                <p><strong>PERFORMER SIGNATURE</strong></p>
                <p>${user.businessName || user.email}</p>
                <p>Date: _________________</p>
            </div>
        </div>
    </div>
</body>
</html>`;

// Helper functions for formatting
function formatDate(date: any): string {
  if (!date) return 'TBC';
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatAddress(address: string): string {
  if (!address) return 'TBC';
  return address.split(',').map(part => part.trim()).join('<br>');
}

function formatPerformerAddress(user: any): string {
  const parts = [];
  if (user.addressLine1) parts.push(user.addressLine1);
  if (user.city) parts.push(user.city);
  if (user.county) parts.push(user.county);
  if (user.postcode) parts.push(user.postcode);
  
  return parts.length > 0 ? `<p>${parts.join('<br>')}</p>` : '<p>Address TBC</p>';
}
```

#### Step 3: PDF Generation Configuration
```typescript
// CRITICAL: Page configuration for professional output
const page = await browser.newPage();
await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

const pdfBuffer = await page.pdf({
  format: 'A4',
  printBackground: true,  // CRITICAL: Enables colored backgrounds
  margin: {
    top: '20px',
    right: '20px',
    bottom: '20px',
    left: '20px'
  },
  displayHeaderFooter: false,
  preferCSSPageSize: true
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