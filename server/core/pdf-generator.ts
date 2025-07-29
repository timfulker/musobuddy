import PDFDocument from 'pdfkit';
import type { Contract, Invoice, UserSettings } from '@shared/schema';

export async function generateContractPDF(contract: any, userSettings: any): Promise<Buffer> {
  console.log('📄 Generating PDF...');
  console.log('🚀 STARTING HTML-TO-PDF CONTRACT GENERATION (RESTORED SYSTEM)...');
  console.log('📊 Contract data:', JSON.stringify({
    id: contract.id,
    clientName: contract.clientName,
    eventDate: contract.eventDate,
    fee: contract.fee
  }, null, 2));
  
  console.log('🎨 Using RESTORED HTML-to-PDF system for beautiful contracts...');

  try {
    // Import puppeteer dynamically
    const puppeteer = await import('puppeteer');
    console.log('🚀 STARTING HTML-TO-PDF CONTRACT GENERATION...');
    console.log('🎨 Generating professional HTML contract template...');
    
    // Generate HTML content using the MailgunService professional template
    const servicesModule = await import('./services');
    const mailgunService = new servicesModule.MailgunService();
    const htmlContent = mailgunService.generateProfessionalContractHTML(contract, userSettings);
    
    console.log('🚀 Launching Puppeteer browser with enhanced compatibility...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--virtual-time-budget=5000',
        '--disable-extensions',
        '--disable-default-apps'
      ],
      timeout: 30000
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    console.log('📄 Converting HTML to PDF with professional formatting...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();
    
    console.log('✅ BEAUTIFUL HTML-to-PDF contract completed successfully!');
    console.log('📊 Professional contract size:', pdfBuffer.length, 'bytes (Expected: 25,000+ bytes)');
    return Buffer.from(pdfBuffer);
    
  } catch (error: any) {
    console.log('❌ HTML contract generation failed:', error.message);
    console.log('🔄 Falling back to enhanced PDFKit template...');
    
    // Fallback to enhanced PDFKit with professional layout
    return generateEnhancedPDFKitContract(contract, userSettings);
  }
}

// Enhanced PDFKit fallback with professional styling
async function generateEnhancedPDFKitContract(contract: any, userSettings: any): Promise<Buffer> {
  console.log('📄 Creating beautiful professional contract format...');
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        console.log('✅ Professional contract generated, size:', pdfBuffer.length, 'bytes');
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // ENHANCED HEADER with purple styling
      doc.fillColor('#9333ea')
         .rect(50, 50, 495, 60)
         .fill();
      
      doc.fillColor('white')
         .fontSize(22)
         .text('PERFORMANCE CONTRACT', 60, 70, { align: 'center' });
      
      doc.fillColor('#2563eb')
         .fontSize(14)
         .text(`Contract: ${contract.contractNumber || 'N/A'}`, 60, 95, { align: 'center' });
      
      let yPosition = 140;
      
      // Contract details in professional grid
      doc.fillColor('#1e293b')
         .fontSize(16)
         .text('CONTRACT DETAILS', 50, yPosition);
      
      yPosition += 30;
      
      // Two-column layout
      const leftCol = 50;
      const rightCol = 300;
      
      // Client section
      doc.fillColor('#9333ea')
         .fontSize(14)
         .text('CLIENT INFORMATION', leftCol, yPosition);
      
      yPosition += 20;
      doc.fillColor('#1e293b')
         .fontSize(11);
      
      doc.text(`Name: ${contract.clientName || 'N/A'}`, leftCol, yPosition);
      yPosition += 15;
      doc.text(`Email: ${contract.clientEmail || 'N/A'}`, leftCol, yPosition);
      yPosition += 15;
      
      if (contract.clientPhone) {
        doc.text(`Phone: ${contract.clientPhone}`, leftCol, yPosition);
        yPosition += 15;
      }
      if (contract.clientAddress) {
        doc.text(`Address: ${contract.clientAddress}`, leftCol, yPosition, { width: 200 });
        yPosition += 20;
      }
      
      // Event details (right column)
      let rightYPos = 190;
      doc.fillColor('#2563eb')
         .fontSize(14)
         .text('EVENT DETAILS', rightCol, rightYPos);
      
      rightYPos += 20;
      doc.fillColor('#1e293b')
         .fontSize(11);
      
      doc.text(`Date: ${contract.eventDate ? new Date(contract.eventDate).toLocaleDateString('en-GB') : 'N/A'}`, rightCol, rightYPos);
      rightYPos += 15;
      
      if (contract.eventTime) {
        doc.text(`Time: ${contract.eventTime}`, rightCol, rightYPos);
        rightYPos += 15;
      }
      
      if (contract.venue) {
        doc.text(`Venue: ${contract.venue}`, rightCol, rightYPos);
        rightYPos += 15;
      }
      
      // Fee highlight box
      yPosition = Math.max(yPosition, rightYPos) + 30;
      
      doc.fillColor('#f3f4f6')
         .rect(50, yPosition, 495, 40)
         .fill();
      
      doc.fillColor('#059669')
         .fontSize(16)
         .text(`Performance Fee: £${contract.fee || 'TBC'}`, 60, yPosition + 12, { align: 'center' });
      
      yPosition += 60;
      
      // Terms section
      doc.fillColor('#2563eb')
         .fontSize(14)
         .text('TERMS & CONDITIONS', 50, yPosition);
      
      yPosition += 25;
      
      doc.fillColor('#374151')
         .fontSize(10);
      
      const terms = [
        'The fee listed above is payable on the date of performance.',
        'The Hirer and Musician agree that equipment and instruments are not available for use by others without specific permission.',
        'The Hirer shall ensure safe electricity supply and security of the Musician and property at the venue.',
        'No audio/visual recording or transmission permitted without prior written consent.',
        'This agreement may only be modified or cancelled by mutual written consent.'
      ];
      
      terms.forEach(term => {
        doc.text(`• ${term}`, 60, yPosition, { width: 480 });
        yPosition += 20;
      });
      
      // Signature section
      yPosition += 40;
      
      doc.fillColor('#9333ea')
         .fontSize(14)
         .text('SIGNATURES', 50, yPosition, { align: 'center' });
      
      yPosition += 40;
      
      // Signature boxes
      doc.fillColor('#1e293b')
         .fontSize(11);
      
      doc.text('CLIENT SIGNATURE', leftCol, yPosition);
      doc.text('PERFORMER SIGNATURE', rightCol, yPosition);
      
      yPosition += 20;
      
      // Signature lines
      doc.moveTo(leftCol, yPosition).lineTo(leftCol + 200, yPosition).stroke();
      doc.moveTo(rightCol, yPosition).lineTo(rightCol + 200, yPosition).stroke();
      
      yPosition += 20;
      doc.text('Date: _______________', leftCol, yPosition);
      doc.text('Date: _______________', rightCol, yPosition);
      
      yPosition += 20;
      doc.text(contract.clientName || 'Client Name', leftCol, yPosition);
      doc.text(userSettings?.businessName || 'Tim Fulker', rightCol, yPosition);
      
      // Footer
      yPosition += 40;
      doc.fillColor('#9333ea')
         .fontSize(8)
         .text('Powered by MusoBuddy - Professional Music Business Management', 50, yPosition, 
               { align: 'center', width: 495 });
      
      doc.end();
      
    } catch (error) {
      console.error('❌ Enhanced PDF generation error:', error);
      reject(error);
    }
  });
}

export async function generateInvoicePDF(invoice: any, userSettings: any): Promise<Buffer> {
  console.log('📄 Generating invoice PDF...');
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        console.log('✅ Invoice PDF generated successfully, size:', pdfBuffer.length);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('INVOICE', 50, 50);
      doc.moveTo(50, 80).lineTo(550, 80).stroke();
      
      // Invoice details
      let yPosition = 120;
      
      doc.fontSize(12);
      doc.text(`Invoice Number: ${invoice.invoiceNumber || 'N/A'}`, 50, yPosition);
      yPosition += 20;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, yPosition);
      yPosition += 20;
      doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'}`, 50, yPosition);
      yPosition += 40;
      
      // Client information
      doc.fontSize(14).text('BILL TO:', 50, yPosition);
      yPosition += 20;
      doc.fontSize(12);
      doc.text(invoice.clientName || 'N/A', 50, yPosition);
      yPosition += 15;
      if (invoice.clientEmail) {
        doc.text(invoice.clientEmail, 50, yPosition);
        yPosition += 15;
      }
      yPosition += 30;
      
      // Service details
      doc.fontSize(14).text('SERVICES PROVIDED:', 50, yPosition);
      yPosition += 20;
      doc.fontSize(12);
      doc.text(`Description: ${invoice.description || 'Musical Performance'}`, 50, yPosition);
      yPosition += 15;
      if (invoice.eventDate) {
        doc.text(`Event Date: ${new Date(invoice.eventDate).toLocaleDateString()}`, 50, yPosition);
        yPosition += 15;
      }
      yPosition += 30;
      
      // Amount
      doc.fontSize(16).text(`TOTAL AMOUNT: £${invoice.amount || '0.00'}`, 50, yPosition);
      yPosition += 40;
      
      // Payment instructions
      if (userSettings?.bankDetails) {
        doc.fontSize(14).text('PAYMENT DETAILS:', 50, yPosition);
        yPosition += 20;
        doc.fontSize(12);
        doc.text(userSettings.bankDetails, 50, yPosition, { width: 500 });
      }
      
      doc.end();
      
    } catch (error) {
      console.error('❌ Invoice PDF generation error:', error);
      reject(error);
    }
  });
}