# MusoBuddy Invoice System - Complete Technical Documentation

## Overview
This document provides a complete technical guide to restore the MusoBuddy invoice creation, viewing, and sending workflow. Every component, file, and database interaction is documented to enable full system restoration.

## Architecture Summary

### Core Components
1. **Database Layer**: PostgreSQL with Drizzle ORM
2. **Backend API**: Express.js with TypeScript
3. **PDF Generation**: Puppeteer with HTML templates
4. **Cloud Storage**: Cloudflare R2 for direct public access
5. **Frontend**: React with TypeScript

### Critical Design Decisions
- **Direct R2 Access**: Invoices served directly from Cloudflare R2 public URLs (never expire)
- **No Local PDF Serving**: Application never serves PDFs locally, only redirects to R2
- **Async PDF Generation**: PDF creation is asynchronous to prevent frontend timeouts
- **User Settings Integration**: Invoice templates respect user's custom terms and business details

---

## Database Schema

### Primary Table: `invoices`
```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  contract_id INTEGER, -- Optional link to contract
  booking_id INTEGER REFERENCES bookings(id), -- Optional link to booking
  invoice_number VARCHAR NOT NULL UNIQUE,
  client_name VARCHAR NOT NULL,
  client_email VARCHAR, -- Client's email for notifications
  cc_email VARCHAR, -- CC email (usually user's business email)
  client_address VARCHAR, -- Client's billing address
  venue_address TEXT, -- Performance venue address
  event_date TIMESTAMP, -- Performance date (renamed from performance_date)
  fee DECIMAL(10,2), -- Total performance fee
  deposit_paid DECIMAL(10,2) DEFAULT 0, -- Amount of deposit paid
  amount DECIMAL(10,2) NOT NULL, -- Amount due (fee minus deposit)
  due_date TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'draft', -- draft, sent, paid, overdue
  paid_at TIMESTAMP,
  cloud_storage_url TEXT, -- Direct Cloudflare R2 public URL
  cloud_storage_key TEXT, -- R2 storage key
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Supporting Table: `user_settings`
Contains user's business configuration including:
- `business_name`: Business name
- `address_line1`, `city`, `county`, `postcode`: Business address
- `phone`, `email`: Contact information
- `default_terms`: Custom payment terms (e.g., "All invoices to be paid on receipt")
- `default_invoice_due_days`: Default days until payment due

---

## File Structure

### Core Files
```
server/core/
├── routes.ts              # API endpoint definitions
├── storage.ts             # Database operations
├── pdf-generator.ts       # PDF creation with Puppeteer
├── cloud-storage.ts       # Cloudflare R2 operations
└── services.ts            # Business logic

client/src/pages/
└── invoices.tsx           # Frontend invoice management

shared/
└── schema.ts              # Database schema definitions
```

---

## Backend Implementation

### 1. Database Operations (`server/core/storage.ts`)

#### Create Invoice
```typescript
async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
  const [result] = await db.insert(invoices).values({
    ...invoice,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  
  return result;
}
```

#### Get Invoice with User Validation
```typescript
async getInvoiceById(id: number, userId: string): Promise<Invoice | null> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
  
  return invoice || null;
}
```

#### Update Cloud Storage URL
```typescript
async updateInvoiceCloudUrl(invoiceId: number, cloudStorageUrl: string): Promise<void> {
  await db
    .update(invoices)
    .set({ 
      cloudStorageUrl,
      updatedAt: new Date()
    })
    .where(eq(invoices.id, invoiceId));
}
```

### 2. API Routes (`server/core/routes.ts`)

#### Create Invoice Endpoint
```typescript
app.post('/api/invoices', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId as string;
    const invoiceData = req.body;
    
    // Generate sequential invoice number
    const invoiceNumber = await generateNextInvoiceNumber(userId);
    
    // Create invoice in database
    const invoice = await storage.createInvoice({
      ...invoiceData,
      userId,
      invoiceNumber,
      status: 'draft'
    });
    
    // Generate PDF asynchronously
    generateInvoicePDFAsync(invoice.id, userId);
    
    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Invoice creation error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});
```

#### Public Invoice View Endpoint
```typescript
app.get('/view/invoices/:id', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const invoice = await storage.getInvoiceForPublicView(invoiceId);
    
    if (!invoice) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html><head><title>Invoice Not Found</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Invoice Not Found</h1>
          <p>The requested invoice could not be found.</p>
        </body></html>
      `);
    }
    
    // If no cloud URL, generate PDF and upload
    if (!invoice.cloudStorageUrl) {
      console.log(`☁️ Uploading invoice #${invoiceId} to cloud storage...`);
      const uploadResult = await uploadInvoiceToCloud(invoiceId, invoice.userId);
      
      if (uploadResult.success) {
        await storage.updateInvoiceCloudUrl(invoiceId, uploadResult.url);
        console.log(`✅ Updated invoice with signed URL, redirecting...`);
        return res.redirect(uploadResult.url);
      } else {
        return res.status(500).send(generateErrorPage(invoice.invoiceNumber));
      }
    }
    
    // Redirect to existing cloud URL
    console.log(`✅ Redirecting to Cloudflare R2 URL: ${invoice.cloudStorageUrl}`);
    res.redirect(invoice.cloudStorageUrl);
    
  } catch (error) {
    console.error('Public invoice view error:', error);
    res.status(500).send(generateErrorPage('Unknown'));
  }
});
```

### 3. PDF Generation (`server/core/pdf-generator.ts`)

#### Main PDF Generation Function
```typescript
export async function generateInvoicePDF(
  invoice: Invoice,
  userSettings: UserSettings | null
): Promise<Buffer> {
  console.log('🚀 Starting FAST invoice PDF generation for:', invoice.invoiceNumber);
  
  // Launch Puppeteer with Chromium
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    const html = generateOptimizedInvoiceHTML(invoice, userSettings);
    
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm', 
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    console.log('✅ FAST invoice PDF generated successfully:', pdf.length, 'bytes');
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
```

#### HTML Template Generation
```typescript
function generateOptimizedInvoiceHTML(invoice: Invoice, userSettings: UserSettings | null): string {
  const businessName = userSettings?.businessName || 'MusoBuddy';
  
  // Build business address from components
  const addressParts = [];
  if (userSettings?.addressLine1) addressParts.push(userSettings.addressLine1);
  if (userSettings?.city) addressParts.push(userSettings.city);
  if (userSettings?.county) addressParts.push(userSettings.county);
  if (userSettings?.postcode) addressParts.push(userSettings.postcode);
  const businessAddress = addressParts.length > 0 ? addressParts.join(', ') : '';
  
  const businessPhone = userSettings?.phone || '';
  const businessEmail = userSettings?.email || '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        /* Professional invoice styling with page break controls */
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #9333ea;
          padding-bottom: 20px;
        }
        
        .invoice-number {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        
        .invoice-date {
          color: #666;
          font-size: 14px;
        }
        
        /* Additional styles for billing, items, totals, payment info, terms */
      </style>
    </head>
    <body>
      <!-- HEADER -->
      <div class="header">
        <div class="logo">MusoBuddy</div>
        <div class="invoice-details">
          <div class="invoice-number">Invoice ${invoice.invoiceNumber}</div>
          <div class="invoice-date">Date: ${new Date(invoice.createdAt).toLocaleDateString('en-GB')}</div>
        </div>
      </div>
      
      <!-- BILLING SECTION -->
      <div class="billing-section">
        <div class="billing-info">
          <h3>FROM:</h3>
          <p><strong>${businessName}</strong></p>
          <p>Sole trader trading as ${businessName}</p>
          ${businessAddress ? `<p>${businessAddress}</p>` : ''}
          ${businessPhone ? `<p>Phone: ${businessPhone}</p>` : ''}
          ${businessEmail ? `<p>Email: ${businessEmail}</p>` : ''}
          <p>Website: www.saxdj.co.uk</p>
        </div>
        <div class="billing-info">
          <h3>BILL TO:</h3>
          <p><strong>${invoice.clientName}</strong></p>
          ${invoice.clientEmail ? `<p>${invoice.clientEmail}</p>` : ''}
          ${invoice.clientAddress ? `<p>${invoice.clientAddress}</p>` : ''}
        </div>
      </div>
      
      <!-- ITEMS TABLE -->
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Event Date</th>
            <th>Performance Fee</th>
            <th>Deposit Paid</th>
            <th>Amount Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Music Performance</strong><br>
              Venue: ${invoice.venueAddress || 'TBD'}
            </td>
            <td>${invoice.eventDate ? new Date(invoice.eventDate).toLocaleDateString('en-GB') : 'TBD'}</td>
            <td>£${invoice.fee || invoice.amount}</td>
            <td>£${invoice.depositPaid || '0.00'}</td>
            <td>£${invoice.amount}</td>
          </tr>
        </tbody>
      </table>
      
      <!-- TOTALS -->
      <div class="total-section">
        <div class="total-row">
          <div class="total-label">Performance Fee:</div>
          <div class="total-amount">£${invoice.fee || invoice.amount}</div>
        </div>
        <div class="total-row">
          <div class="total-label">Deposit Paid:</div>
          <div class="total-amount">-£${invoice.depositPaid || '0.00'}</div>
        </div>
        <div class="total-row">
          <div class="total-label">VAT Status:</div>
          <div class="total-amount">Not VAT registered</div>
        </div>
        <div class="total-row grand-total">
          <div class="total-label">Total Due:</div>
          <div class="total-amount">£${invoice.amount}</div>
        </div>
      </div>
      
      <!-- PAYMENT INFO -->
      <div class="payment-info">
        <h3>Payment Information</h3>
        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</p>
        <p><strong>Bank Details:</strong></p>
        <p>Acc - Mr T Fulker<br>
           No - 09851259<br>
           Sort - 54 21 30<br>
           Ref - Please use Name/Date</p>
      </div>
      
      <!-- TERMS & CONDITIONS -->
      <div class="terms-section">
        <h3>Terms & Conditions</h3>
        <p>${userSettings?.defaultTerms || 'All invoices to be paid within seven days of receipt'}</p>
        <p><strong>VAT Status:</strong> I am not VAT registered and therefore no VAT is charged.</p>
      </div>
      
      <!-- FOOTER -->
      <div class="footer">
        <p>Powered by <strong>MusoBuddy</strong> – less admin, more music.</p>
      </div>
    </body>
    </html>
  `;
}
```

### 4. Cloud Storage (`server/core/cloud-storage.ts`)

#### R2 Client Configuration
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://446248abf8164fb99bee2fc3dc3c513c.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});
```

#### Upload Invoice to R2
```typescript
export async function uploadInvoiceToCloud(
  invoiceId: number, 
  userId: string
): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
  try {
    // Get invoice and user settings
    const invoice = await storage.getInvoiceById(invoiceId, userId);
    const userSettings = await storage.getUserSettings(userId);
    
    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }
    
    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice, userSettings);
    
    // Create storage key with date structure
    const date = new Date(invoice.createdAt);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `invoices/${dateStr}/${invoice.invoiceNumber}.pdf`;
    
    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'musobuddy-documents',
      Key: storageKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        invoiceId: invoiceId.toString(),
        userId: userId,
        invoiceNumber: invoice.invoiceNumber,
      },
    });
    
    await r2Client.send(uploadCommand);
    
    // Generate direct public URL (never expires)
    const publicUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${storageKey}`;
    
    console.log(`🔗 Direct R2 public URL: ${publicUrl}`);
    
    return {
      success: true,
      url: publicUrl,
      key: storageKey
    };
    
  } catch (error) {
    console.error('❌ Failed to upload invoice to cloud storage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
```

### 5. Async PDF Generation
```typescript
async function generateInvoicePDFAsync(invoiceId: number, userId: string): Promise<void> {
  try {
    console.log(`🚀 FAST: Generating optimized PDF for invoice # ${invoiceId}`);
    
    const uploadResult = await uploadInvoiceToCloud(invoiceId, userId);
    
    if (uploadResult.success && uploadResult.url) {
      await storage.updateInvoiceCloudUrl(invoiceId, uploadResult.url);
      console.log(`✅ FAST: Invoice #${invoiceId} updated with direct R2 URL: ${uploadResult.url}`);
    } else {
      console.error(`❌ FAST: Failed to upload invoice #${invoiceId}:`, uploadResult.error);
    }
  } catch (error) {
    console.error(`❌ FAST: Async PDF generation failed for invoice #${invoiceId}:`, error);
  }
}
```

---

## Frontend Implementation

### Invoice Management Component (`client/src/pages/invoices.tsx`)

#### Key Features
1. **Invoice List**: Display all user invoices with status indicators
2. **Create Invoice Form**: Form with validation using React Hook Form + Zod  
3. **View/Download**: Links that open invoices in new tab (direct R2 URLs)
4. **Delete Functionality**: Soft delete with confirmation

#### Invoice Creation Form
```typescript
const InvoiceForm = () => {
  const form = useForm<CreateInvoiceData>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      amount: '',
      dueDate: '',
      // ... other fields
    }
  });
  
  const createInvoiceMutation = useMutation({
    mutationFn: (data: CreateInvoiceData) => 
      apiRequest('/api/invoices', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      form.reset();
    }
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(createInvoiceMutation.mutate)}>
        {/* Form fields */}
      </form>
    </Form>
  );
};
```

#### Invoice Display
```typescript
const InvoiceList = () => {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['/api/invoices'],
  });
  
  if (isLoading) return <InvoicesSkeleton />;
  
  return (
    <div className="space-y-4">
      {invoices.map(invoice => (
        <div key={invoice.id} className="invoice-card">
          <div className="invoice-details">
            <h3>{invoice.invoiceNumber}</h3>
            <p>{invoice.clientName}</p>
            <p>£{invoice.amount}</p>
          </div>
          <div className="invoice-actions">
            <Button
              onClick={() => window.open(`/view/invoices/${invoice.id}`, '_blank')}
            >
              View PDF
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Cloudflare R2
R2_ENDPOINT="https://446248abf8164fb99bee2fc3dc3c513c.r2.cloudflarestorage.com"
R2_BUCKET_NAME="musobuddy-documents"
R2_ACCESS_KEY_ID="your_access_key"
R2_SECRET_ACCESS_KEY="your_secret_key"

# Session Management
SESSION_SECRET="your-session-secret"
```

### R2 Bucket Configuration
- **Bucket Name**: `musobuddy-documents`
- **Public Access**: Enabled for direct PDF access
- **CORS Policy**: Configured for cross-origin requests
- **Storage Structure**: `invoices/YYYY-MM-DD/INV-XXX.pdf`

---

## Complete Workflow Process

### 1. Invoice Creation Flow
```
User submits form → Validate data → Generate invoice number → Save to database → 
Trigger async PDF generation → Upload to R2 → Update database with R2 URL → 
Return success to frontend
```

### 2. Public Invoice Viewing Flow  
```
User visits /view/invoices/:id → Check if invoice exists → 
If no R2 URL: Generate PDF + Upload to R2 + Update database → 
Redirect to direct R2 public URL (never expires)
```

### 3. PDF Generation Details
- **Engine**: Puppeteer with Chromium
- **Template**: HTML/CSS with business branding
- **Size**: ~300KB typical invoice
- **Features**: Professional layout, custom terms, bank details, VAT info
- **Performance**: <5 seconds generation time

### 4. Database Operations Sequence
1. **Create**: Insert invoice record with basic data
2. **Generate**: Create PDF with comprehensive business template
3. **Upload**: Store PDF in R2 with organized folder structure  
4. **Update**: Add R2 public URL to database record
5. **Serve**: Redirect users to direct R2 URL

---

## Error Handling & Edge Cases

### Common Issues & Solutions

1. **"Invalid Date" in PDF**: 
   - Cause: Using non-existent `invoice.invoiceDate` field
   - Fix: Use `invoice.createdAt` for invoice date display

2. **PDF Generation Timeout**:
   - Cause: Synchronous PDF generation blocking requests
   - Fix: Async PDF generation with immediate response

3. **R2 Access Issues**:
   - Cause: Incorrect bucket permissions or credentials
   - Fix: Verify R2 configuration and public access settings

4. **Missing Business Details**:
   - Cause: User settings not loaded or null values
   - Fix: Implement fallback values and null checking

### Error Response Templates
```typescript
const generateErrorPage = (invoiceNumber: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Invoice ${invoiceNumber} - Error</title>
      <meta http-equiv="refresh" content="5">
    </head>
    <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
      <h1>Invoice ${invoiceNumber}</h1>
      <p>There was an issue accessing your invoice. Retrying...</p>
      <p>This page will refresh automatically.</p>
    </body>
  </html>
`;
```

---

## Testing & Validation

### Manual Testing Checklist
- [ ] Create invoice with all fields populated
- [ ] Verify PDF generation with correct business details
- [ ] Test direct R2 URL access (no authentication required)
- [ ] Validate custom terms from user settings appear in PDF
- [ ] Confirm invoice displays proper creation date
- [ ] Test invoice deletion and error handling

### Database Queries for Verification
```sql
-- Check invoice creation
SELECT id, invoice_number, client_name, amount, cloud_storage_url, created_at 
FROM invoices WHERE user_id = 'USER_ID' ORDER BY created_at DESC;

-- Verify user settings integration
SELECT business_name, default_terms, phone, email 
FROM user_settings WHERE user_id = 'USER_ID';

-- Test R2 URL format
SELECT invoice_number, cloud_storage_url 
FROM invoices 
WHERE cloud_storage_url LIKE 'https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/%';
```

---

## Deployment Considerations

### Production Requirements
1. **Environment Variables**: All R2 and database credentials configured
2. **Chromium Binary**: Ensure Puppeteer can access Chromium executable
3. **Memory Allocation**: Sufficient memory for PDF generation (min 1GB)
4. **Network Access**: Outbound access to Cloudflare R2
5. **Session Security**: Secure session configuration for production

### Performance Optimizations
- **Async Processing**: PDF generation doesn't block user requests
- **Direct R2 Serving**: No application resources used for PDF delivery
- **Efficient Templates**: Optimized HTML/CSS for fast rendering
- **Database Indexing**: Proper indexes on frequently queried fields

---

## Restoration Instructions

To completely restore the invoice system:

1. **Database Setup**: Create tables using schema definitions
2. **Install Dependencies**: puppeteer, @aws-sdk/client-s3, drizzle-orm
3. **Configure Environment**: Set all required environment variables
4. **Deploy Files**: Copy all documented files to correct locations
5. **Test R2 Access**: Verify bucket permissions and connectivity
6. **Validate Workflow**: Run through complete creation → viewing → access flow

This documentation provides everything needed to restore the complete invoice workflow from scratch, including all technical details, code implementations, and configuration requirements.