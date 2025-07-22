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

      console.log('📄 Creating professional contract with enhanced styling...');

      // Colors
      const purple = '#7C3AED';
      const blue = '#2563EB';
      const yellowBg = '#FFF7E0';
      const yellowText = '#E6B800';
      const grayRow = '#F5F5F5';
      const textMain = '#222222';
      const textSecondary = '#666666';

      // Header: Purple Bar
      doc
        .rect(0, 0, doc.page.width, 60)
        .fill(purple);

      // Title
      doc
        .fillColor('white')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('Performance Contract', 0, 18, { align: 'center' });

      // Subtitle (date + client)
      const eventDateStr = formatDate(contract.eventDate);
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(
          `(${eventDateStr} - ${contract.clientName || 'Client'})`,
          0,
          44,
          { align: 'center' }
        );

      // Status Badge - DRAFT
      doc
        .roundedRect(doc.page.width / 2 - 30, 70, 60, 22, 8)
        .fillAndStroke(yellowBg, yellowBg)
        .fillColor(yellowText)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('DRAFT', doc.page.width / 2 - 15, 75, { align: 'center', width: 30 });

      // Divider
      doc
        .moveTo(50, 105)
        .lineTo(doc.page.width - 50, 105)
        .strokeColor(purple)
        .lineWidth(2)
        .stroke();

      let currentY = 125;

      // Section: Performer Details
      doc
        .fillColor(textMain)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Performer Details', 50, currentY);

      currentY += 25;
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(textSecondary)
        .text(
          `${userSettings?.firstName || 'Tim'} ${userSettings?.lastName || 'Fulker'}\n` +
          `${userSettings?.businessName || 'Tim Fulker Music'}\n` +
          `59, Gloucester Rd Bournemouth Dorset BH7 6JA\n` +
          `Phone: 07765190034\n` +
          `Email: timfulkermusic@gmail.com`,
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

      // Table-like layout for event details
      const eventDetails = [
        ['Date', eventDateStr],
        ['Start Time', contract.eventTime || 'Time TBC'],
        ['End Time', contract.eventEndTime || 'Time TBC'],
        ['Venue', contract.venue || 'Venue TBC'],
        ['Venue Address', contract.venueAddress || 'Address not provided'],
      ];

      eventDetails.forEach(([label, value], i) => {
        // Alternate row colors
        const fillColor = i % 2 === 0 ? grayRow : '#FFFFFF';
        
        // Label column
        doc
          .rect(50, currentY, 150, 22)
          .fill(fillColor)
          .fillColor(textMain)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(label, 55, currentY + 6);

        // Value column
        doc
          .rect(200, currentY, doc.page.width - 250, 22)
          .fill(fillColor)
          .fillColor(textSecondary)
          .font('Helvetica')
          .fontSize(11)
          .text(value, 205, currentY + 6);

        currentY += 22;
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

      // Section: Terms and Conditions
      doc
        .fillColor(textMain)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Terms and Conditions', 50, currentY);

      currentY += 25;
      const terms = [
        '1. Payment is due on the date of performance unless otherwise agreed in writing.',
        '2. All equipment is provided by the performer unless specified in technical requirements.',
        '3. The venue must provide safe access to electricity and ensure adequate security.',
        '4. No recording or transmission without written consent from the performer.',
        '5. Cancellation by the client within 7 days of the event date will result in full payment being due.',
        '6. The performer reserves the right to use a suitable substitute in case of illness or emergency.'
      ];

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(textSecondary);

      terms.forEach(term => {
        doc.text(term, 50, currentY, { width: 495 });
        currentY += 25;
      });

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