import PDFDocument from 'pdfkit';
import type { Contract, Invoice, UserSettings } from '@shared/schema';

export async function generateContractPDF(contract: any, userSettings: any): Promise<Buffer> {
  console.log('📄 Generating contract PDF...');
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        console.log('✅ PDF generated successfully, size:', pdfBuffer.length);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('PERFORMANCE CONTRACT', 50, 50);
      doc.moveTo(50, 80).lineTo(550, 80).stroke();
      
      // Contract details
      let yPosition = 120;
      
      doc.fontSize(12);
      doc.text(`Contract Number: ${contract.contractNumber || 'N/A'}`, 50, yPosition);
      yPosition += 20;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, yPosition);
      yPosition += 40;
      
      // Client information
      doc.fontSize(14).text('CLIENT INFORMATION', 50, yPosition);
      yPosition += 20;
      doc.fontSize(12);
      doc.text(`Name: ${contract.clientName || 'N/A'}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Email: ${contract.clientEmail || 'N/A'}`, 50, yPosition);
      yPosition += 15;
      if (contract.clientPhone) {
        doc.text(`Phone: ${contract.clientPhone}`, 50, yPosition);
        yPosition += 15;
      }
      if (contract.clientAddress) {
        doc.text(`Address: ${contract.clientAddress}`, 50, yPosition);
        yPosition += 15;
      }
      yPosition += 20;
      
      // Event details
      doc.fontSize(14).text('EVENT DETAILS', 50, yPosition);
      yPosition += 20;
      doc.fontSize(12);
      doc.text(`Date: ${contract.eventDate ? new Date(contract.eventDate).toLocaleDateString() : 'N/A'}`, 50, yPosition);
      yPosition += 15;
      if (contract.eventStartTime && contract.eventFinishTime) {
        doc.text(`Time: ${contract.eventStartTime} - ${contract.eventFinishTime}`, 50, yPosition);
        yPosition += 15;
      }
      if (contract.venue) {
        doc.text(`Venue: ${contract.venue}`, 50, yPosition);
        yPosition += 15;
      }
      if (contract.venueAddress) {
        doc.text(`Venue Address: ${contract.venueAddress}`, 50, yPosition);
        yPosition += 15;
      }
      yPosition += 20;
      
      // Financial terms
      doc.fontSize(14).text('FINANCIAL TERMS', 50, yPosition);
      yPosition += 20;
      doc.fontSize(12);
      doc.text(`Performance Fee: £${contract.fee || 'TBC'}`, 50, yPosition);
      yPosition += 15;
      if (contract.deposit) {
        doc.text(`Deposit: £${contract.deposit}`, 50, yPosition);
        yPosition += 15;
      }
      
      // Payment instructions
      if (contract.paymentInstructions) {
        yPosition += 20;
        doc.fontSize(14).text('PAYMENT INSTRUCTIONS', 50, yPosition);
        yPosition += 20;
        doc.fontSize(12);
        doc.text(contract.paymentInstructions, 50, yPosition, { width: 500 });
        yPosition += 40;
      }
      
      // Equipment requirements
      if (contract.equipmentRequirements) {
        yPosition += 20;
        doc.fontSize(14).text('EQUIPMENT REQUIREMENTS', 50, yPosition);
        yPosition += 20;
        doc.fontSize(12);
        doc.text(contract.equipmentRequirements, 50, yPosition, { width: 500 });
        yPosition += 40;
      }
      
      // Special requirements
      if (contract.specialRequirements) {
        yPosition += 20;
        doc.fontSize(14).text('SPECIAL REQUIREMENTS', 50, yPosition);
        yPosition += 20;
        doc.fontSize(12);
        doc.text(contract.specialRequirements, 50, yPosition, { width: 500 });
        yPosition += 40;
      }
      
      // Performer details
      if (userSettings) {
        yPosition += 20;
        doc.fontSize(14).text('PERFORMER DETAILS', 50, yPosition);
        yPosition += 20;
        doc.fontSize(12);
        if (userSettings.businessName) {
          doc.text(`Business: ${userSettings.businessName}`, 50, yPosition);
          yPosition += 15;
        }
        if (userSettings.email) {
          doc.text(`Email: ${userSettings.email}`, 50, yPosition);
          yPosition += 15;
        }
        if (userSettings.phone) {
          doc.text(`Phone: ${userSettings.phone}`, 50, yPosition);
          yPosition += 15;
        }
      }
      
      // Signature section
      yPosition += 40;
      doc.text('Client Signature: _________________________ Date: _________', 50, yPosition);
      yPosition += 30;
      doc.text('Performer Signature: ______________________ Date: _________', 50, yPosition);
      
      doc.end();
      
    } catch (error) {
      console.error('❌ PDF generation error:', error);
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