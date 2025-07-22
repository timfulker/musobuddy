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

      // Header - Exactly like Andy's template
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

      // DRAFT label centered - matching Andy template 
      console.log('🟠 Adding DRAFT label...');
      doc.fillColor('#000000')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('DRAFT', 50, 190, { align: 'center' });

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

      // Event Details - Simple text layout like Andy Urquahart template
      console.log('📋 Drawing event details table...');
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('Event Details', 50, 385);

      // Simple text layout with proper spacing - exactly like Andy's template
      let eventY = 420;
      const lineHeight = 25;

      doc.fontSize(12)
         .font('Helvetica');

      // Client Name
      doc.text('Client Name', 60, eventY)
         .text(contract.clientName || '', 250, eventY);
      eventY += lineHeight;

      // Client Email  
      doc.text('Client Email', 60, eventY)
         .text(contract.clientEmail || '', 250, eventY);
      eventY += lineHeight;

      // Client Address
      doc.text('Client Address', 60, eventY)
         .text(contract.clientAddress || '', 250, eventY);
      eventY += lineHeight;

      // Client Phone
      doc.text('Client Phone', 60, eventY)
         .text(contract.clientPhone || '', 250, eventY);
      eventY += lineHeight;

      // Event Date
      doc.text('Event Date', 60, eventY)
         .text(eventDate.toLocaleDateString('en-GB', { 
           weekday: 'long', 
           day: 'numeric', 
           month: 'long', 
           year: 'numeric' 
         }), 250, eventY);
      eventY += lineHeight;

      // Event Time
      doc.text('Event Time', 60, eventY)
         .text(contract.eventTime || '', 250, eventY);
      eventY += lineHeight;

      // Venue
      doc.text('Venue', 60, eventY)
         .text(contract.venue || '', 250, eventY);
      eventY += lineHeight;

      // Performance Fee
      doc.text('Performance Fee', 60, eventY)
         .text(`£${parseFloat(contract.fee || 0).toFixed(2)}`, 250, eventY);
      eventY += lineHeight;

      // Terms and Conditions
      const termsY = eventY + 40;

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

      // Continue with Cancellation Policy
      let sectionY = termsY + 165;
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Cancellation & Refund Policy', 50, sectionY);
      
      sectionY += 30;
      doc.fontSize(10)
         .font('Helvetica')
         .text('Client Cancellation:', 50, sectionY);
      
      sectionY += 20;
      doc.text('        More than 30 days before event: Any deposit paid will be refunded minus a £50', 50, sectionY)
         .text('        administration fee', 50, sectionY + 15)
         .text('        30 days or less before event: Full performance fee becomes due regardless of cancellation', 50, sectionY + 30)
         .text('        Same day cancellation: Full fee due plus any additional costs incurred', 50, sectionY + 45);

      sectionY += 75;
      doc.text('Performer Cancellation: In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.', 50, sectionY, { width: 495 });

      sectionY += 45;
      doc.text('Rescheduling: Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.', 50, sectionY, { width: 495 });

      // Force Majeure Section
      sectionY += 60;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Force Majeure', 50, sectionY);

      sectionY += 25;
      doc.fontSize(10)
         .font('Helvetica')
         .text('Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.', 50, sectionY, { width: 495 });

      // Performance Contingencies Section
      sectionY += 60;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Performance Contingencies', 50, sectionY);

      sectionY += 25;
      doc.fontSize(10)
         .font('Helvetica')
         .text('The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.', 50, sectionY, { width: 495 });

      // Professional Performance Standards Section
      sectionY += 60;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Professional Performance Standards', 50, sectionY);

      sectionY += 25;
      doc.fontSize(10)
         .font('Helvetica')
         .text('Payment Schedule: The agreed performance fee (including applicable VAT) becomes due and payable on the date of performance of the engagement.', 50, sectionY, { width: 495 });

      sectionY += 30;
      doc.text('Equipment & Instrument Protection: The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.', 50, sectionY, { width: 495 });

      sectionY += 45;
      doc.text('Venue Safety Requirements: The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.', 50, sectionY, { width: 495 });

      // Check if we need a new page
      if (sectionY > 650) {
        doc.addPage();
        sectionY = 50;
      } else {
        sectionY += 30;
      }

      doc.text('Recording & Transmission Policy: The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer\'s performance without the prior written consent of the performer.', 50, sectionY, { width: 495 });

      sectionY += 40;
      doc.text('Contract Modifications: This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.', 50, sectionY, { width: 495 });

      sectionY += 30;
      doc.text('Performance Rider: Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.', 50, sectionY, { width: 495 });

      sectionY += 30;
      doc.text('Safe Space Principle: The client and performer agree to a \'Safe Space\' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.', 50, sectionY, { width: 495 });

      sectionY += 40;
      doc.text('Professional Insurance: The performer maintains professional liability insurance as required for musical performance engagements.', 50, sectionY, { width: 495 });

      // Signatures section
      sectionY += 80;
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Signatures', 50, sectionY);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Performer', 50, sectionY + 30);

      doc.fontSize(10)
         .font('Helvetica')
         .text('Signed by: Tim Fulker', 50, sectionY + 50)
         .text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 50, sectionY + 70)
         .text('Status: Agreed by sending contract', 50, sectionY + 90);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Client', 50, sectionY + 130);

      doc.fontSize(10)
         .font('Helvetica')
         .text('Status: Awaiting Signature', 50, sectionY + 150)
         .text(`This contract has been sent to ${contract.clientEmail || 'client email'} for digital signature.`, 50, sectionY + 170);

      // Legal Information & Governing Terms - exactly like Andy's template
      sectionY += 220;
      if (sectionY > 650) {
        doc.addPage();
        sectionY = 50;
      }

      doc.fontSize(10)
         .font('Helvetica')
         .text('Legal Information & Governing Terms:', 50, sectionY);

      doc.text(`Contract Number: ${dateStr} - ${contract.clientName || 'Client'}`, 50, sectionY + 20);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, 50, sectionY + 35);

      sectionY += 55;
      doc.text('Binding Agreement: This is a legally binding agreement between the parties named above. Both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth herein.', 50, sectionY, { width: 495 });

      sectionY += 30;
      doc.text('Governing Law & Jurisdiction: This contract shall be governed by and construed in accordance with the laws of England and Wales. Any disputes, claims, or legal proceedings arising from or relating to this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.', 50, sectionY, { width: 495 });

      sectionY += 45;
      doc.text('Digital Signatures: Digital signatures are legally binding under the Electronic Communications Act 2000 and eIDAS Regulation. Electronic acceptance constitutes agreement to all terms.', 50, sectionY, { width: 495 });

      sectionY += 30;
      doc.text('Entire Agreement: This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. No modification shall be valid unless in writing and signed by both parties.', 50, sectionY, { width: 495 });

      sectionY += 30;
      doc.text('Severability: If any provision of this contract is found to be unenforceable, the remaining provisions shall continue in full force and effect.', 50, sectionY, { width: 495 });

      sectionY += 25;
      doc.text('Contract Validity: This contract remains valid and enforceable regardless of changes in circumstances, location, or contact information of either party.', 50, sectionY, { width: 495 });

      // Footer
      doc.fontSize(10)
         .font('Helvetica')
         .text('Powered by MusoBuddy – less admin, more music.', 50, 750, { align: 'center' });

      console.log('✅ Contract generation complete, ending document...');
      doc.end();

    } catch (error: any) {
      console.error('❌ Contract generation error:', error);
      console.error('❌ Error stack:', error.stack);
      reject(error);
    }
  });
}