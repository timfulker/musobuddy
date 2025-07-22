import PDFDocument from 'pdfkit';

// EXACT ANDY URQUAHART CONTRACT FORMAT - NO COLORS, PLAIN BLACK TEXT
export async function generateAndyUrquhartContract(contract: any, userSettings: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      console.log('📄 Creating Andy Urquahart format contract...');
      
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

      // Header - EXACT Andy Urquahart format
      doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold')
         .text('Performance Contract', { align: 'center' });
      doc.moveDown(1);
      
      doc.fontSize(14).font('Helvetica')
         .text(`(${new Date(contract.eventDate).toLocaleDateString('en-GB')} - ${contract.clientName})`, { align: 'center' });
      doc.moveDown(2);
      
      doc.fontSize(14).font('Helvetica-Bold')
         .text('DRAFT', { align: 'center' });
      doc.moveDown(4);

      // Performer Details Section
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
         .text('Performer Details');
      doc.moveDown(1);
      
      doc.fontSize(11).font('Helvetica').fillColor('#000000');
      doc.text('Tim Fulker');
      doc.moveDown(0.5);
      doc.text('59, Gloucester Rd Bournemouth Dorset BH7 6JA');
      doc.moveDown(0.5);
      doc.text('Phone: 07765190034');
      doc.moveDown(0.5);
      doc.text('Email: timfulkermusic@gmail.com');
      doc.moveDown(2);

      // Event Details Section
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
         .text('Event Details');
      doc.moveDown(2);
      
      // Table layout - exact spacing
      const leftCol = 50;
      const rightCol = 280;
      let currentY = doc.y;
      
      const addDetailRow = (label: string, value: string) => {
        doc.fontSize(11).font('Helvetica').fillColor('#000000')
           .text(label, leftCol, currentY);
        doc.text(value, rightCol, currentY);
        currentY += 24;
      };
      
      addDetailRow('Client Name', contract.clientName || '');
      addDetailRow('Client Email', contract.clientEmail || '');
      addDetailRow('Client Address', contract.clientAddress || '');
      addDetailRow('Client Phone', contract.clientPhone || '');
      addDetailRow('Event Date', new Date(contract.eventDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
      addDetailRow('Event Time', contract.eventTime || '');
      addDetailRow('Venue', contract.venue || '');
      addDetailRow('Performance Fee', `£${parseFloat(contract.fee || 0).toFixed(2)}`);
      
      doc.y = currentY + 20;

      // Terms and Conditions
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
         .text('Terms and Conditions');
      doc.moveDown(0.5);
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
         .text('Payment Terms & Conditions');
      doc.moveDown(0.5);
      
      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text(`Payment Due Date: Full payment of £${parseFloat(contract.fee || 0).toFixed(2)} becomes due and payable no later than the day of performance. Payment must be received before or immediately upon completion of the performance.`);
      doc.moveDown(0.5);
      
      doc.text('Payment Methods: Cash or bank transfer to the performer\'s designated account (details provided separately).');
      doc.moveDown(0.5);
      
      doc.text('Deposit: £0.00 deposit required to secure booking. Deposit is non-refundable except as outlined in the cancellation policy below.');
      doc.moveDown(0.5);
      
      doc.text('Late Payment: Any payment received after the due date may incur a late payment fee of £25 plus interest at 2% per month.');
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
         .text('Cancellation & Refund Policy');
      doc.moveDown(0.5);
      
      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text('Client Cancellation:');
      doc.moveDown(0.3);
      doc.text('         More than 30 days before event: Any deposit paid will be refunded minus a £50');
      doc.text('         administration fee');
      doc.text('         30 days or less before event: Full performance fee becomes due regardless of');
      doc.text('         cancellation');
      doc.text('         Same day cancellation: Full fee due plus any additional costs incurred');
      doc.moveDown(0.5);
      
      doc.text('Performer Cancellation: In the unlikely event the performer must cancel due to circumstances within their control, all payments will be refunded in full and reasonable assistance will be provided to find a suitable replacement.');
      doc.moveDown(0.5);
      
      doc.text('Rescheduling: Event may be rescheduled once without penalty if agreed by both parties at least 14 days in advance. Additional rescheduling requests may incur a £25 administrative fee.');
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
         .text('Force Majeure');
      doc.moveDown(0.5);
      
      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text('Neither party shall be liable for any failure to perform due to circumstances beyond their reasonable control, including but not limited to: severe weather, natural disasters, government restrictions, venue closure, or serious illness.');
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
         .text('Performance Contingencies');
      doc.moveDown(0.5);
      
      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text('The performer will provide appropriate backup equipment where reasonably possible. If performance cannot proceed due to venue-related issues (power failure, noise restrictions, etc.), the full fee remains due.');
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
         .text('Professional Performance Standards');
      doc.moveDown(0.5);
      
      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text('Payment Schedule: The agreed performance fee (including applicable VAT) becomes due and payable on the date of performance of the engagement.');
      doc.moveDown(0.5);
      
      doc.text('Equipment & Instrument Protection: The equipment and instruments of the performer are not available for use by any other person, except by specific permission of the performer. All musical instruments and equipment remain the exclusive property of the performer.');
      doc.moveDown(0.5);
      
      doc.text('Venue Safety Requirements: The client shall ensure a safe supply of electricity and the security of the performer and their property at the venue throughout the engagement.');
      doc.moveDown(0.5);
      
      doc.text('Recording & Transmission Policy: The client shall not make or permit the making of any audio and/or visual recording or transmission of the performer\'s performance without the prior written consent of the performer.');
      doc.moveDown(0.5);
      
      doc.text('Contract Modifications: This agreement may not be modified or cancelled except by mutual consent, in writing signed by both parties. Verbal modifications are not binding.');
      doc.moveDown(0.5);
      
      doc.text('Performance Rider: Any rider attached hereto and signed by both parties shall be deemed incorporated into this agreement.');
      doc.moveDown(0.5);
      
      doc.text('Safe Space Principle: The client and performer agree to a \'Safe Space\' principle to provide a working environment free from harassment and discrimination, maintaining respectful professional standards throughout the engagement.');
      doc.moveDown(0.5);
      
      doc.text('Professional Insurance: The performer maintains professional liability insurance as required for musical performance engagements.');
      doc.moveDown(3);

      // Signatures Section
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
         .text('Signatures');
      doc.moveDown(1);
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
         .text('Performer');
      doc.moveDown(3);
      
      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text('  Signed by: Tim Fulker');
      doc.moveDown(0.3);
      doc.text(`  Date: ${new Date().toLocaleDateString('en-GB')}`);
      doc.moveDown(0.3);
      doc.text('  Status: Agreed by sending contract');
      doc.moveDown(3);
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
         .text('Client');
      doc.moveDown(3);
      
      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text('  Status: Awaiting Signature');
      doc.moveDown(0.3);
      doc.text(`  This contract has been sent to ${contract.clientEmail} for digital signature.`);
      doc.moveDown(3);

      // Legal footer section
      doc.fontSize(10).font('Helvetica').fillColor('#000000')
         .text('  Legal Information & Governing Terms:');
      doc.moveDown(0.5);
      
      doc.fontSize(9).font('Helvetica').fillColor('#000000');
      doc.text(`  Contract Number: (${new Date(contract.eventDate).toLocaleDateString('en-GB')} - ${contract.clientName})`);
      doc.moveDown(0.3);
      doc.text(`  Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB', { hour12: false })}`);
      
      doc.fontSize(9).font('Helvetica').fillColor('#000000');
      doc.text('Binding Agreement: This is a legally binding agreement between the parties named above. Both parties acknowledge they have read, understood, and agree to be bound by all terms and conditions set forth herein.');
      doc.moveDown(0.5);
      
      doc.text('Governing Law & Jurisdiction: This contract shall be governed by and construed in accordance with the laws of England and Wales. Any disputes, claims, or legal proceedings arising from or relating to this agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales.');
      doc.moveDown(0.5);
      
      doc.text('Digital Signatures: Digital signatures are legally binding under the Electronic Communications Act 2000 and eIDAS Regulation. Electronic acceptance constitutes agreement to all terms.');
      doc.moveDown(0.5);
      
      doc.text('Entire Agreement: This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements. No modification shall be valid unless in writing and signed by both parties.');
      doc.moveDown(0.5);
      
      doc.text('Severability: If any provision of this contract is found to be unenforceable, the remaining provisions shall continue in full force and effect.');
      doc.moveDown(0.5);
      
      doc.text('Contract Validity: This contract remains valid and enforceable regardless of changes in circumstances, location, or contact information of either party.');
      doc.moveDown(3);

      // Footer branding
      doc.fontSize(10).font('Helvetica').fillColor('#000000')
         .text('Powered by MusoBuddy – less admin, more music.', { align: 'center' });

      doc.end();
    
    } catch (error: any) {
      console.error('❌ Contract generation error:', error);
      reject(error);
    }
  });
}