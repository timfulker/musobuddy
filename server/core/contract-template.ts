import PDFDocument from 'pdfkit';

export async function generateAndyUrquhartContract(contract: any, userSettings: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      console.log('📄 Creating Andy Urquahart format contract...');
      console.log('📄 Contract data:', { clientName: contract.clientName, fee: contract.fee, eventDate: contract.eventDate });

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log('✅ Andy Urquahart contract generated, size:', pdfBuffer.length, 'bytes');
        resolve(pdfBuffer);
      });
      doc.on('error', (error) => {
        console.error('❌ PDF generation error:', error);
        reject(error);
      });

      // MusoBuddy Logo - Purple rectangle in top right
      console.log('🎨 Drawing MusoBuddy logo...');
      doc.fillColor('#8B5CF6')
         .rect(450, 50, 80, 30)
         .fill();

      doc.fillColor('#FFFFFF')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('MusoBuddy', 465, 62);

      // Header
      console.log('📝 Adding header...');
      doc.fillColor('#000000')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('Performance Contract', 50, 120, { align: 'center' });

      // Date and client line
      const eventDate = new Date(contract.eventDate);
      const dateStr = eventDate.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });

      doc.fontSize(16)
         .font('Helvetica')
         .text(`(${dateStr} - ${contract.clientName || 'Client'})`, 50, 160, { align: 'center' });

      // DRAFT in orange
      console.log('🟠 Adding DRAFT label...');
      doc.fillColor('#FF8C00')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('DRAFT', 50, 190, { align: 'center' });

      // Purple separator line
      console.log('💜 Drawing separator line...');
      doc.strokeColor('#8B5CF6')
         .lineWidth(4)
         .moveTo(50, 220)
         .lineTo(545, 220)
         .stroke();

      // Performer Details
      console.log('👤 Adding performer details...');
      doc.fillColor('#000000')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('Performer Details', 50, 250);

      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Tim Fulker', 50, 280);

      doc.fontSize(12)
         .font('Helvetica')
         .text('59, Gloucester Rd Bournemouth Dorset BH7 6JA', 50, 305)
         .text('Phone: 07765190034', 50, 325)
         .text('Email: timfulkermusic@gmail.com', 50, 345);

      // Event Details with simple table
      console.log('📋 Drawing event details table...');
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('Event Details', 50, 385);

      // Table data
      const tableData = [
        ['Client Name', contract.clientName || ''],
        ['Client Email', contract.clientEmail || ''],
        ['Client Address', contract.clientAddress || ''],
        ['Client Phone', contract.clientPhone || ''],
        ['Event Date', eventDate.toLocaleDateString('en-GB', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })],
        ['Event Time', contract.eventTime || ''],
        ['Venue', contract.venue || ''],
        ['Performance Fee', `£${parseFloat(contract.fee || 0).toFixed(2)}`]
      ];

      // Draw table rows
      let startY = 420;
      const rowHeight = 25;
      const leftColWidth = 120;
      const rightColWidth = 300;

      tableData.forEach((row, index) => {
        const y = startY + (index * rowHeight);

        // Alternating row background
        if (index % 2 === 0) {
          doc.fillColor('#F8F9FA')
             .rect(50, y - 2, leftColWidth + rightColWidth, rowHeight)
             .fill();
        }

        // Draw borders
        doc.strokeColor('#DDDDDD')
           .lineWidth(0.5)
           .rect(50, y - 2, leftColWidth, rowHeight)
           .stroke()
           .rect(50 + leftColWidth, y - 2, rightColWidth, rowHeight)
           .stroke();

        // Add text
        doc.fillColor('#000000')
           .fontSize(11)
           .font('Helvetica')
           .text(row[0], 55, y + 5, { width: leftColWidth - 10 })
           .text(row[1], 55 + leftColWidth, y + 5, { width: rightColWidth - 10 });
      });

      // Terms and Conditions
      const termsY = startY + (tableData.length * rowHeight) + 30;

      console.log('📄 Adding terms and conditions...');
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('Terms and Conditions', 50, termsY);

      // Payment Terms
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Payment Terms & Conditions', 50, termsY + 40);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Payment Due Date: Full payment of £${parseFloat(contract.fee || 0).toFixed(2)} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.`, 50, termsY + 65, { width: 495 });

      doc.text('Payment Methods: Cash or bank transfer to the performer\'s designated account (details provided separately).', 50, termsY + 95, { width: 495 });

      doc.text('Deposit: £0.00 deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.', 50, termsY + 115, { width: 495 });

      doc.text('Late Payment: Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.', 50, termsY + 135, { width: 495 });

      // Add new page if needed
      if (termsY > 600) {
        doc.addPage();
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Cancellation & Refund Policy', 50, 50);

        doc.fontSize(10)
           .font('Helvetica')
           .text('Client Cancellation:', 50, 80)
           .text('    • More than 30 days before event: Any deposit paid will be refunded minus a £50 administration fee', 50, 100)
           .text('    • 30 days or less before event: Full performance fee becomes due regardless of cancellation', 50, 120)
           .text('    • Same day cancellation: Full fee due plus any additional costs incurred', 50, 140);

        // Signatures
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Signatures', 50, 200);

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Performer', 50, 230);

        doc.fontSize(10)
           .font('Helvetica')
           .text('Signed by: Tim Fulker', 50, 250)
           .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 50, 270)
           .text('Status: Agreed by sending contract', 50, 290);

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Client', 50, 330);

        doc.fontSize(10)
           .font('Helvetica')
           .text('Status: Awaiting Signature', 50, 350)
           .text(`This contract has been sent to ${contract.clientEmail || 'client email'} for digital signature.`, 50, 370);

        // Footer
        doc.fontSize(10)
           .font('Helvetica')
           .text('Powered by MusoBuddy – less admin, more music.', 50, 750, { align: 'center' });

      } else {
        // Continue on same page
        let currentY = termsY + 160;

        // Signatures on same page
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Signatures', 50, currentY);

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Performer', 50, currentY + 30);

        doc.fontSize(10)
           .font('Helvetica')
           .text('Signed by: Tim Fulker', 50, currentY + 50)
           .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 50, currentY + 70)
           .text('Status: Agreed by sending contract', 50, currentY + 90);

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Client', 50, currentY + 130);

        doc.fontSize(10)
           .font('Helvetica')
           .text('Status: Awaiting Signature', 50, currentY + 150)
           .text(`This contract has been sent to ${contract.clientEmail || 'client email'} for digital signature.`, 50, currentY + 170);

        // Footer
        doc.fontSize(10)
           .font('Helvetica')
           .text('Powered by MusoBuddy – less admin, more music.', 50, 750, { align: 'center' });
      }

      console.log('✅ Contract generation complete, ending document...');
      doc.end();

    } catch (error: any) {
      console.error('❌ Contract generation error:', error);
      console.error('❌ Error stack:', error.stack);
      reject(error);
    }
  });
}