import PDFDocument from 'pdfkit';

export async function generateAndyUrquhartContract(contract: any, userSettings: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', (error) => reject(error));

      // HEADER SECTION
      doc.fillColor('#000000')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Performance Contract', 50, 80, { align: 'center' });

      const eventDate = new Date(contract.eventDate);
      const dateStr = eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#333333')
        .text(`(${dateStr} - ${contract.clientName || 'Client'})`, 50, 115, { align: 'center' });

      doc.fillColor('#666666')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('DRAFT', 50, 140, { align: 'center' });

      let currentY = 180;

      // PERFORMER DETAILS
      doc.fillColor('#000000')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Performer Details', 50, currentY);

      currentY += 30;
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('Tim Fulker', 50, currentY);

      currentY += 20;
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#333333')
        .text('59, Gloucester Rd Bournemouth Dorset BH7 6JA', 50, currentY);

      currentY += 16;
      doc.text('Phone: 07765190034', 50, currentY);

      currentY += 16;
      doc.text('Email: timfulkermusic@gmail.com', 50, currentY);

      currentY += 40;

      // EVENT DETAILS
      doc.fillColor('#000000')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Event Details', 50, currentY);

      currentY += 30;

      const leftCol = 50;
      const rightCol = 200;
      const lineHeight = 22;

      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#333333');

      doc.font('Helvetica-Bold').text('Client Name', leftCol, currentY);
      doc.font('Helvetica').text(contract.clientName || '', rightCol, currentY);
      currentY += lineHeight;

      doc.font('Helvetica-Bold').text('Client Email', leftCol, currentY);
      doc.font('Helvetica').text(contract.clientEmail || '', rightCol, currentY);
      currentY += lineHeight;

      doc.font('Helvetica-Bold').text('Client Address', leftCol, currentY);
      doc.font('Helvetica').text(contract.clientAddress || '', rightCol, currentY);
      currentY += lineHeight;

      doc.font('Helvetica-Bold').text('Client Phone', leftCol, currentY);
      doc.font('Helvetica').text(contract.clientPhone || '', rightCol, currentY);
      currentY += lineHeight;

      doc.font('Helvetica-Bold').text('Event Date', leftCol, currentY);
      const formattedDate = eventDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      doc.font('Helvetica').text(formattedDate, rightCol, currentY);
      currentY += lineHeight;

      doc.font('Helvetica-Bold').text('Event Time', leftCol, currentY);
      doc.font('Helvetica').text(contract.eventTime || '20:00', rightCol, currentY);
      currentY += lineHeight;

      doc.font('Helvetica-Bold').text('Venue', leftCol, currentY);
      doc.font('Helvetica').text(contract.venue || '', rightCol, currentY);
      currentY += lineHeight;

      doc.font('Helvetica-Bold').text('Performance Fee', leftCol, currentY);
      doc.font('Helvetica').text(`£${parseFloat(contract.fee || 0).toFixed(2)}`, rightCol, currentY);
      currentY += 40;

      // TERMS AND CONDITIONS
      doc.fillColor('#000000')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Terms and Conditions', 50, currentY);

      currentY += 30;

      doc.fontSize(13)
        .font('Helvetica-Bold')
        .text('Payment Terms & Conditions', 50, currentY);

      currentY += 20;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#333333');

      const paymentText = `Payment Due Date: Full payment of £${parseFloat(contract.fee || 0).toFixed(2)} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.`;
      doc.text(paymentText, 50, currentY, { width: 495, lineGap: 2 });
      currentY += 25;

      doc.text('Payment Methods: Cash or bank transfer to the performer\'s designated account (details provided separately).', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 20;

      doc.text('Deposit: £0.00 deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 20;

      doc.text('Late Payment: Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 30;

      doc.fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Cancellation & Refund Policy', 50, currentY);

      currentY += 20;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text('Client Cancellation:', 50, currentY);

      currentY += 15;
      doc.text('    More than 30 days before event: Any deposit paid will be refunded minus a £50', 60, currentY);
      currentY += 12;
      doc.text('    administration fee', 60, currentY);
      currentY += 12;
      doc.text('    30 days or less before event: Full performance fee becomes due regardless of cancellation', 60, currentY);
      currentY += 12;
      doc.text('    Same day cancellation: Full fee due plus any additional costs incurred', 60, currentY);
      currentY += 20;

      doc.text('Performer Cancellation: In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 30;

      doc.text('Rescheduling: Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 35;

      if (currentY > 650) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Force Majeure', 50, currentY);

      currentY += 20;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text('Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 35;

      doc.fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Performance Contingencies', 50, currentY);

      currentY += 20;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text('The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 35;

      doc.fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Professional Performance Standards', 50, currentY);

      currentY += 20;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#333333');

      doc.text('Payment Schedule: The agreed performance fee (including applicable VAT) becomes due and payable on the date of performance of the engagement.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 25;

      doc.text('Equipment & Instrument Protection: The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 30;

      doc.text('Venue Safety Requirements: The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 25;

      doc.text('Recording & Transmission Policy: The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer\'s performance without the prior written consent of the performer.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 30;

      doc.text('Contract Modifications: This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 25;

      doc.text('Performance Rider: Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 25;

      doc.text('Safe Space Principle: The client and performer agree to a \'Safe Space\' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 30;

      doc.text('Professional Insurance: The performer maintains professional liability insurance as required for musical performance engagements.', 50, currentY, { width: 495, lineGap: 2 });
      currentY += 50;

      if (currentY > 600) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Signatures', 50, currentY);

      currentY += 30;
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('Performer', 50, currentY);

      currentY += 20;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text('Signed by: Tim Fulker', 50, currentY);

      currentY += 15;
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 50, currentY);

      currentY += 15;
      doc.text('Status: Agreed by sending contract', 50, currentY);

      currentY += 40;
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Client', 50, currentY);

      currentY += 20;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text('Status: Awaiting Signature', 50, currentY);

      currentY += 15;
      doc.text(`This contract has been sent to ${contract.clientEmail || 'client email'} for digital signature.`, 50, currentY);

      currentY += 50;

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text('Legal Information & Governing Terms:', 50, currentY);

      currentY += 15;
      doc.text(`Contract Number: ${dateStr} - ${contract.clientName || 'Client'}`, 50, currentY);

      currentY += 12;
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, 50, currentY);

      currentY += 20;
      doc.text('Binding Agreement: This is a legally binding agreement between the parties named above. Both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth herein.', 50, currentY, { width: 495, lineGap: 2 });

      currentY += 25;
      doc.text('Governing Law & Jurisdiction: This contract shall be governed by and construed in accordance with the laws of England and Wales. Any disputes, claims, or legal proceedings arising from or relating to this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.', 50, currentY, { width: 495, lineGap: 2 });

      currentY += 30;
      doc.text('Digital Signatures: Digital signatures are legally binding under the Electronic Communications Act 2000 and eIDAS Regulation. Electronic acceptance constitutes agreement to all terms.', 50, currentY, { width: 495, lineGap: 2 });

      currentY += 25;
      doc.text('Entire Agreement: This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. No modification shall be valid unless in writing and signed by both parties.', 50, currentY, { width: 495, lineGap: 2 });

      currentY += 25;
      doc.text('Severability: If any provision of this contract is found to be unenforceable, the remaining provisions shall continue in full force and effect.', 50, currentY, { width: 495, lineGap: 2 });

      currentY += 20;
      doc.text('Contract Validity: This contract remains valid and enforceable regardless of changes in circumstances, location, or contact information of either party.', 50, currentY, { width: 495, lineGap: 2 });

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Powered by MusoBuddy – less admin, more music.', 50, 750, { align: 'center' });

      doc.end();
    } catch (error: any) {
      reject(error);
    }
  });
}