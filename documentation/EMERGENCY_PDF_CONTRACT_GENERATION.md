# EMERGENCY PDF CONTRACT GENERATION - PROFESSIONAL STYLED CONTRACTS

## CRITICAL OVERVIEW
This manual covers restoring the **professional purple/blue branded contract PDFs** with proper styling, colors, and formatting.

## SYSTEM ARCHITECTURE
1. **HTML Template Generation** → Styled HTML with CSS (purple headers, blue sections)
2. **Puppeteer PDF Conversion** → HTML-to-PDF with `printBackground: true`
3. **Cloud Storage Upload** → PDF stored on Cloudflare R2

## EMERGENCY RESTORATION PROCEDURE

### STEP 1: Verify Chromium Installation
Location: `server/core/services.ts`

```bash
# Test Chromium path
ls -la /nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium
```

### STEP 2: Complete PDF Generation Method
**File**: `server/core/services.ts`

```typescript
async generateContractPDF(contract: any, signatureDetails?: any): Promise<Buffer> {
  try {
    console.log('🔄 Generating professional contract PDF...');
    
    // STEP 1: Generate styled HTML template
    const htmlContent = this.generateContractHTML(contract, signatureDetails);
    
    // STEP 2: Launch Puppeteer with correct configuration
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    
    const page = await browser.newPage();
    
    // STEP 3: Set HTML content with proper wait conditions
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // STEP 4: Generate PDF with styling preservation
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,  // CRITICAL: Preserves purple headers and colored sections
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false
    });
    
    await browser.close();
    
    console.log(`✅ Professional contract PDF generated: ${pdfBuffer.length} bytes`);
    
    // Verify PDF size (should be > 15KB for styled content)
    if (pdfBuffer.length < 15000) {
      console.warn('⚠️ PDF suspiciously small - styling may have failed');
    }
    
    return pdfBuffer;
    
  } catch (error: any) {
    console.error('❌ PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}
```

### STEP 3: Professional HTML Template (COMPLETE)
**File**: `server/core/services.ts`

```typescript
generateContractHTML(contract: any, signatureDetails?: any): string {
  // Helper functions
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatAddress = (addressStr: string) => {
    if (!addressStr) return '';
    return addressStr.split(',').map((part: string) => part.trim()).join('<br>');
  };

  // CRITICAL: Complete styled HTML template with purple/blue branding
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Performance Contract</title>
  <style>
    * { box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      color: #333;
      background: white;
      font-size: 14px;
    }
    
    /* PURPLE GRADIENT HEADER */
    .header {
      background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
      color: white;
      padding: 30px;
      text-align: center;
      margin: -20px -20px 30px -20px;
      border-radius: 0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      letter-spacing: -0.5px;
    }
    
    .contract-number {
      background: rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 20px;
      display: inline-block;
      margin-top: 10px;
      font-weight: 600;
      font-size: 16px;
    }
    
    /* BLUE SECTIONS */
    .section {
      margin: 25px 0;
      padding: 20px;
      border-left: 4px solid #2563eb;
      background: #f8fafc;
      border-radius: 0 8px 8px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .section h2 {
      color: #2563eb;
      margin: 0 0 15px 0;
      font-size: 20px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* DETAIL GRID LAYOUT */
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 15px 0;
    }
    
    .detail-item {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .detail-label {
      font-weight: 600;
      color: #475569;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .detail-value {
      color: #1e293b;
      font-size: 16px;
      font-weight: 500;
    }
    
    /* GREEN FEE HIGHLIGHT */
    .fee-highlight {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      font-size: 28px;
      font-weight: bold;
      text-align: center;
      padding: 25px;
      border-radius: 8px;
      margin: 25px 0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.15);
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    
    /* SIGNATURE SECTION */
    .signature-section {
      margin-top: 40px;
      padding: 25px;
      background: #f1f5f9;
      border-radius: 8px;
      border: 2px solid #e2e8f0;
    }
    
    .signature-box {
      background: white;
      border: 2px solid #9333ea;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      min-height: 80px;
      position: relative;
    }
    
    .signature-label {
      color: #9333ea;
      font-weight: 600;
      margin-bottom: 10px;
      font-size: 16px;
    }
    
    .signed-indicator {
      background: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      display: inline-block;
      margin-top: 10px;
      font-size: 14px;
    }
    
    .signature-name {
      font-size: 20px;
      color: #1e293b;
      margin: 10px 0;
      font-weight: 600;
    }
    
    /* TERMS SECTION */
    .terms {
      font-size: 13px;
      line-height: 1.8;
      color: #475569;
      margin-top: 30px;
      padding: 20px;
      background: #fafafa;
      border-radius: 8px;
      border-left: 4px solid #94a3b8;
    }
    
    .terms strong {
      color: #334155;
      font-size: 14px;
    }
    
    /* FOOTER */
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #64748b;
      font-size: 11px;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }
    
    /* SINGLE COLUMN FOR LONG CONTENT */
    .full-width {
      grid-column: 1 / -1;
    }
    
    /* RESPONSIVE GRID */
    @media (max-width: 600px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <!-- PURPLE HEADER -->
  <div class="header">
    <h1>Performance Contract</h1>
    <div class="contract-number">Contract #${contract.contractNumber || contract.id}</div>
  </div>

  <!-- EVENT DETAILS SECTION -->
  <div class="section">
    <h2>Event Details</h2>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Event Date</div>
        <div class="detail-value">${formatDate(contract.eventDate)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Event Time</div>
        <div class="detail-value">${contract.eventTime || 'TBC'} - ${contract.eventEndTime || 'TBC'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Venue</div>
        <div class="detail-value">${contract.venue || 'TBC'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Performance Duration</div>
        <div class="detail-value">${contract.performanceDuration || 'TBC'}</div>
      </div>
      ${contract.equipmentProvided ? `
      <div class="detail-item">
        <div class="detail-label">Equipment Provided</div>
        <div class="detail-value">${contract.equipmentProvided}</div>
      </div>
      ` : ''}
      ${contract.specialRequests ? `
      <div class="detail-item full-width">
        <div class="detail-label">Special Requirements</div>
        <div class="detail-value">${contract.specialRequests}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- CLIENT INFORMATION SECTION -->
  <div class="section">
    <h2>Client Information</h2>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">Client Name</div>
        <div class="detail-value">${contract.clientName}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Contact Email</div>
        <div class="detail-value">${contract.clientEmail || 'Not provided'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Contact Phone</div>
        <div class="detail-value">${contract.clientPhone || 'Not provided'}</div>
      </div>
      ${contract.clientAddress ? `
      <div class="detail-item">
        <div class="detail-label">Client Address</div>
        <div class="detail-value">${formatAddress(contract.clientAddress)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- FEE HIGHLIGHT -->
  <div class="fee-highlight">
    Performance Fee: £${contract.fee || 'TBC'}
  </div>

  <!-- SIGNATURE SECTION -->
  <div class="signature-section">
    <h2 style="color: #475569; margin-bottom: 20px; font-size: 18px;">Contract Agreement</h2>
    
    <div class="signature-box">
      <div class="signature-label">Client Signature</div>
      ${signatureDetails ? `
        <div class="signature-name">${signatureDetails.signatureName}</div>
        <div class="signed-indicator">
          ✓ Signed on ${signatureDetails.signedAt ? new Date(signatureDetails.signedAt).toLocaleDateString('en-GB') : 'N/A'}
        </div>
      ` : `
        <div style="color: #64748b; font-style: italic; margin-top: 20px;">
          Awaiting client signature
        </div>
      `}
    </div>
  </div>

  <!-- TERMS AND CONDITIONS -->
  <div class="terms">
    <strong>Terms and Conditions:</strong><br><br>
    
    <strong>Payment:</strong> Payment is due within 7 days of performance completion unless otherwise agreed in writing.<br><br>
    
    <strong>Cancellation:</strong> Cancellation within 48 hours of the event may result in a 50% cancellation fee. The performer reserves the right to cancel due to circumstances beyond their control (illness, weather, etc.).<br><br>
    
    <strong>Equipment:</strong> The performer will provide their own professional equipment unless specifically noted above. Adequate power supply and safe performance area must be provided by the client.<br><br>
    
    <strong>Liability:</strong> The performer carries public liability insurance. The client is responsible for the safety and security of guests and venue.<br><br>
    
    <strong>Agreement:</strong> This contract constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements relating to the subject matter herein.
  </div>

  <!-- FOOTER -->
  <div class="footer">
    Contract generated on ${new Date().toLocaleDateString('en-GB')} via MusoBuddy Professional Services
  </div>
</body>
</html>`;
}
```

## CRITICAL SUCCESS INDICATORS

### PDF Size Verification
- **Minimum Size**: >15KB (indicates styling preserved)
- **Typical Size**: 40-80KB for fully styled contracts
- **Maximum Size**: <200KB (reasonable for professional contracts)

### Visual Verification Checklist
- ✅ Purple gradient header with white text
- ✅ Blue section headers and left borders  
- ✅ Green fee highlight box
- ✅ White detail cards with shadows
- ✅ Professional typography and spacing
- ✅ Signature section with purple border
- ✅ Terms section with gray left border

### Common PDF Generation Failures

**Issue**: Plain black/white PDF (no colors)
**Fix**: Ensure `printBackground: true` in PDF options

**Issue**: PDF too small (<15KB) 
**Fix**: Check HTML template generation and CSS inclusion

**Issue**: Broken layout/formatting
**Fix**: Verify HTML structure and CSS grid properties

**Issue**: Chromium crashes
**Fix**: Check Chromium path and launch arguments

## DEBUGGING COMMANDS

```bash
# Test PDF generation directly
curl -X POST http://localhost:5000/api/contracts/test-pdf \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Test Client","eventDate":"2025-08-15","fee":"500"}'

# Check generated PDF size
ls -la /tmp/contract-*.pdf

# Verify Chromium installation  
/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium --version
```

## EMERGENCY RESTORATION STEPS

1. **Copy complete `generateContractPDF` method** to `server/core/services.ts`
2. **Copy complete `generateContractHTML` method** to `server/core/services.ts`  
3. **Verify Chromium path** in launch configuration
4. **Test PDF generation** with curl command
5. **Check PDF visual styling** by downloading test contract
6. **Verify file size** is >15KB for styled content