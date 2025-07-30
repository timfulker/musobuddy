import PDFDocument from 'pdfkit';

// Helper for date formatting
function formatDate(date: string | number | Date) {
  if (!date) return 'Date TBC';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function generateProfessionalContract(contract: any, userSettings: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log('✅ Professional contract generated, size:', pdfBuffer.length, 'bytes');
        resolve(pdfBuffer);
      });
      doc.on('error', (error) => reject(error));

      console.log('📄 Creating beautiful professional contract format...');

      // Color palette for professional styling
      const purple = '#9333ea';
      const blue = '#2563eb';
      const textMain = '#1f2937';
      const textSecondary = '#6b7280';
      
      // Date formatting
      const eventDate = new Date(contract.eventDate);
      const eventDateStr = eventDate.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });

      // HEADER - Simple centered text like original
      doc.fillColor('#000000')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Performance Contract', 50, 80, { align: 'center' });

      // Date and client name line 
      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#000000')
        .text(`(${eventDateStr} - ${contract.clientName || 'Client'})`, 50, 110, { align: 'center' });

      // DRAFT status
      doc.fillColor('#000000')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('DRAFT', 50, 140, { align: 'center' });

      let currentY = 180;

      // Section: Performer Details
      doc
        .fillColor(textMain)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Performer Details', 50, currentY);

      currentY += 25;
      // Format performer address from user settings
      const performerAddressParts = [];
      if (userSettings?.addressLine1) performerAddressParts.push(userSettings.addressLine1);
      if (userSettings?.city) performerAddressParts.push(userSettings.city);
      if (userSettings?.county) performerAddressParts.push(userSettings.county);
      if (userSettings?.postcode) performerAddressParts.push(userSettings.postcode);
      const performerAddress = performerAddressParts.length > 0 ? performerAddressParts.join(', ') : '59, Gloucester Rd, Bournemouth, Dorset, BH7 6JA';
      
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(textSecondary)
        .text(
          `${userSettings?.firstName || 'Tim'} ${userSettings?.lastName || 'Fulker'}\n` +
          `${userSettings?.businessName || 'Tim Fulker Music'}\n` +
          `${performerAddress}\n` +
          `Phone: ${userSettings?.phone || '07765190034'}\n` +
          `Email: ${userSettings?.email || 'timfulkermusic@gmail.com'}`,
          50, currentY
        );

      currentY += 90;

      // Section: Client Details
      doc
        .fillColor(textMain)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Client Details', 50, currentY);

      currentY += 25;
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(textSecondary)
        .text(
          `${contract.clientName || 'Client name not provided'}\n` +
          `${contract.clientAddress || 'Address not provided'}\n` +
          `${contract.clientPhone || 'Phone not provided'}\n` +
          `${contract.clientEmail || 'Email not provided'}`,
          50, currentY
        );

      currentY += 80;

      // Section: Event Details Table
      doc
        .fillColor(textMain)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Event Details', 50, currentY);

      currentY += 25;

      // Event Details Table with proper borders and backgrounds
      const eventDetails = [
        ['Client Name', contract.clientName || 'Not provided'],
        ['Client Email', contract.clientEmail || 'Not provided'],
        ['Client Address', contract.clientAddress || 'Not provided'],
        ['Client Phone', contract.clientPhone || 'Not provided'],
        ['Event Date', eventDateStr],
        ['Event Time', `${contract.eventTime || 'Time TBC'}${contract.eventEndTime ? ` - ${contract.eventEndTime}` : ''}`],
        ['Venue', contract.venue || 'Venue TBC'],
        ['Performance Fee', `£${contract.fee || '0.00'}`],
      ];

      eventDetails.forEach(([label, value], i) => {
        // Alternate row colors like the reference
        const fillColor = i % 2 === 0 ? '#E5E7EB' : '#FFFFFF';
        
        // Draw the row background
        doc
          .rect(50, currentY, doc.page.width - 100, 25)
          .fill(fillColor)
          .stroke('#D1D5DB');

        // Label column
        doc
          .fillColor(textMain)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(label, 55, currentY + 8);

        // Value column  
        doc
          .fillColor(textSecondary)
          .font('Helvetica')
          .fontSize(11)
          .text(value, 200, currentY + 8);

        currentY += 25;
      });

      currentY += 20;

      // Section: Financial Terms
      doc
        .fillColor(textMain)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Financial Terms', 50, currentY);

      currentY += 25;

      // Performance Fee Highlight
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(blue)
        .text(`Performance Fee: £${contract.fee || '0.00'}`, 50, currentY);

      currentY += 20;
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(textSecondary)
        .text(`Deposit: £${contract.deposit || '0.00'}`, 50, currentY);

      currentY += 20;
      doc
        .text(`Payment Instructions: ${contract.paymentInstructions || 'Payment due on performance date'}`, 50, currentY);

      currentY += 40;

      // Section: Technical / Rider Requirements
      doc
        .fillColor(textMain)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Technical / Rider Requirements', 50, currentY);

      currentY += 25;
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(textSecondary)
        .text(`Equipment: ${contract.equipmentRequirements || 'Standard setup - microphone and suitable power supply'}`, 50, currentY);

      currentY += 20;
      doc
        .text(`Special Requirements: ${contract.specialRequirements || 'None specified'}`, 50, currentY);

      currentY += 60;

      // Section: Terms and Conditions with gray background boxes
      doc
        .fillColor(textMain)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Terms and Conditions', 50, currentY);

      currentY += 20;

      // Payment Terms & Conditions - Gray Box
      doc
        .rect(50, currentY, doc.page.width - 100, 120)
        .fill('#F3F4F6')
        .stroke('#D1D5DB');

      doc
        .fillColor(blue)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Payment Terms & Conditions', 60, currentY + 10);

      currentY += 30;
      doc
        .fillColor(textMain)
        .font('Helvetica')
        .fontSize(10)
        .text(`Payment Due Date: Full payment of £${contract.fee || '0.00'} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.`, 60, currentY, { width: 475 });

      currentY += 30;
      doc.text('Payment Methods: Cash or bank transfer to the performer\'s designated account (details provided separately).', 60, currentY, { width: 475 });

      currentY += 25;
      doc.text(`Deposit: £${contract.deposit || '0.00'} deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.`, 60, currentY, { width: 475 });

      currentY += 25;
      doc.text('Late Payment: Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.', 60, currentY, { width: 475 });

      currentY += 40;

      // Cancellation & Refund Policy - Gray Box
      doc
        .rect(50, currentY, doc.page.width - 100, 140)
        .fill('#F3F4F6')
        .stroke('#D1D5DB');

      doc
        .fillColor(blue)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Cancellation & Refund Policy', 60, currentY + 10);

      currentY += 30;
      doc
        .fillColor(textMain)
        .font('Helvetica')
        .fontSize(10)
        .text('Client Cancellation:', 60, currentY);

      currentY += 15;
      doc.text('• More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee', 70, currentY, { width: 465 });

      currentY += 15;
      doc.text('• 30 days or less before event: Full performance fee becomes due regardless of cancellation', 70, currentY, { width: 465 });

      currentY += 15;
      doc.text('• Same day cancellation: Full fee due plus any additional costs incurred', 70, currentY, { width: 465 });

      currentY += 20;
      doc.text('Performer Cancellation: In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.', 60, currentY, { width: 475 });

      currentY += 25;
      doc.text('Rescheduling: Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.', 60, currentY, { width: 475 });

      currentY += 40;

      // Force Majeure - Gray Box
      doc
        .rect(50, currentY, doc.page.width - 100, 60)
        .fill('#F3F4F6')
        .stroke('#D1D5DB');

      doc
        .fillColor(blue)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Force Majeure', 60, currentY + 10);

      currentY += 30;
      doc
        .fillColor(textMain)
        .font('Helvetica')
        .fontSize(10)
        .text('Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.', 60, currentY, { width: 475 });

      currentY += 50;

      // Performance Contingencies - Gray Box
      doc
        .rect(50, currentY, doc.page.width - 100, 80)
        .fill('#F3F4F6')
        .stroke('#D1D5DB');

      doc
        .fillColor(blue)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Performance Contingencies', 60, currentY + 10);

      currentY += 30;
      doc
        .fillColor(textMain)
        .font('Helvetica')
        .fontSize(10)
        .text('The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.', 60, currentY, { width: 475 });

      currentY += 60;

      currentY += 20;

      // Section: Signatures
      doc
        .fillColor(textMain)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Signatures', 50, currentY);

      currentY += 40;

      // Signature boxes
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(textSecondary)
        .text('Performer: ___________________________    Date: ________________', 50, currentY);

      currentY += 40;
      doc
        .text('Client:    ___________________________    Date: ________________', 50, currentY);

      // Footer
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(purple)
        .text(
          `Contract #${eventDateStr} - ${contract.clientName || 'Client'} | Generated: ${new Date().toLocaleDateString('en-GB')}`,
          0,
          doc.page.height - 40,
          { align: 'center' }
        );

      doc.end();

    } catch (error: any) {
      console.error('❌ Professional contract generation error:', error);
      reject(error);
    }
  });
}