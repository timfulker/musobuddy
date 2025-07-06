// Latest Contract Signing Route - server/routes.ts (lines 640-820)
// Updated with PDF generation fallback for deployment compatibility

app.post('/api/contracts/sign/:id', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const { signatureName } = req.body;
    
    console.log(`=== CONTRACT SIGNING PROCESS STARTED ===`);
    console.log(`Contract ID: ${contractId}`);
    console.log(`Signature Name: ${signatureName}`);
    
    if (!signatureName || signatureName.trim() === '') {
      return res.status(400).json({ error: 'Signature name is required' });
    }
    
    // Get contract details
    const contract = await storage.getContract(contractId);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    if (contract.status !== 'sent') {
      return res.status(400).json({ 
        message: 'Contract is not available for signing. Current status: ' + contract.status 
      });
    }
    
    // Update contract status to signed
    await storage.updateContract(contractId, {
      status: 'signed',
      signatureName: signatureName.trim()
    });
    
    console.log(`✓ Contract ${contractId} status updated to 'signed'`);
    
    // Send immediate response to prevent browser timeout
    res.json({ 
      message: 'Contract signed successfully',
      contractId,
      status: 'processing_emails'
    });
    
    // Process emails in background using deployment-compatible approach
    setTimeout(async () => {
      console.log('=== DEPLOYMENT EMAIL PROCESSING STARTED ===');
      
      try {
        // Get fresh contract data and user settings
        const updatedContract = await storage.getContract(contractId);
        const userSettings = await storage.getUserSettings(updatedContract.userId);
        
        console.log('Contract data:', {
          id: updatedContract.id,
          contractNumber: updatedContract.contractNumber,
          clientName: updatedContract.clientName,
          clientEmail: updatedContract.clientEmail,
          status: updatedContract.status
        });
        
        // Generate PDF with fallback handling
        let pdfBase64 = null;
        try {
          console.log('=== ATTEMPTING PDF GENERATION ===');
          pdfBase64 = await generateContractPDF(updatedContract);
          console.log('✓ PDF generated successfully');
        } catch (pdfError) {
          console.error('⚠ PDF generation failed:', pdfError.message);
          console.log('→ Continuing with email delivery without PDF attachment');
        }
        
        // Email sending logic with conditional attachments
        const signedDate = new Date().toLocaleDateString('en-GB');
        const signedTime = new Date().toLocaleTimeString('en-GB');
        
        // CLIENT EMAIL
        const clientEmailParams = {
          to: updatedContract.clientEmail,
          from: userSettings?.businessEmail 
            ? `${userSettings.businessName || 'MusoBuddy'} <business@musobuddy.com>`
            : 'MusoBuddy <business@musobuddy.com>',
          replyTo: userSettings?.businessEmail,
          subject: `Contract ${updatedContract.contractNumber} - Signed & Confirmed`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Contract Signed Successfully! 🎵</h2>
              
              <p>Dear ${updatedContract.clientName},</p>
              
              <p>Fantastic news! Your contract has been signed and confirmed.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Event Details:</h3>
                <p><strong>Date:</strong> ${new Date(updatedContract.eventDate).toLocaleDateString('en-GB')}</p>
                <p><strong>Time:</strong> ${updatedContract.eventTime}</p>
                <p><strong>Venue:</strong> ${updatedContract.venue}</p>
                <p><strong>Performance Fee:</strong> £${updatedContract.fee}</p>
                <p><strong>Deposit:</strong> £${updatedContract.deposit}</p>
              </div>
              
              <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196F3;">
                <p style="margin: 0;"><strong>Signature Details:</strong></p>
                <p style="margin: 5px 0;">Signed by: ${signatureName.trim()}</p>
                <p style="margin: 5px 0;">Date & Time: ${signedDate} at ${signedTime}</p>
              </div>
              
              <p style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
                ${pdfBase64 ? '📎 <strong>Signed contract PDF is attached for your records.</strong>' : '📄 <strong>Your signed contract copy will be provided separately.</strong>'}
              </p>
              
              <p>Looking forward to performing for you!</p>
            </div>
          `,
          text: `Contract ${updatedContract.contractNumber} signed successfully! Event: ${new Date(updatedContract.eventDate).toLocaleDateString('en-GB')} at ${updatedContract.venue}. Fee: £${updatedContract.fee}. Signed by ${signatureName.trim()} on ${signedDate} at ${signedTime}.${pdfBase64 ? ' Signed contract PDF is attached.' : ' Contract copy will be provided separately.'}`
        };
        
        // Add PDF attachment if generation was successful
        if (pdfBase64) {
          clientEmailParams.attachments = [{
            content: pdfBase64,
            filename: `Contract-${updatedContract.contractNumber}-Signed.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }];
        }
        
        console.log('=== SENDING CLIENT EMAIL ===');
        const clientEmailResult = await sendEmail(clientEmailParams);
        console.log('Client email result:', clientEmailResult);
        
        // PERFORMER EMAIL
        if (userSettings?.businessEmail) {
          const performerEmailParams = {
            to: userSettings.businessEmail,
            from: 'MusoBuddy <business@musobuddy.com>',
            subject: `Contract ${updatedContract.contractNumber} Signed by ${updatedContract.clientName} - Copy Attached`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Contract Signed - Copy for Your Records</h2>
                
                <p>Your contract has been signed by the client!</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #374151;">Booking Details:</h3>
                  <p><strong>Client:</strong> ${updatedContract.clientName}</p>
                  <p><strong>Date:</strong> ${new Date(updatedContract.eventDate).toLocaleDateString('en-GB')}</p>
                  <p><strong>Venue:</strong> ${updatedContract.venue}</p>
                  <p><strong>Fee:</strong> £${updatedContract.fee}</p>
                </div>
                
                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196F3;">
                  <p style="margin: 0;"><strong>Signature Details:</strong></p>
                  <p style="margin: 5px 0;">Signed by: ${signatureName.trim()}</p>
                  <p style="margin: 5px 0;">Date & Time: ${signedDate} at ${signedTime}</p>
                </div>
                
                <p style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
                  ${pdfBase64 ? '📎 <strong>Signed contract PDF is attached for your records.</strong>' : '📄 <strong>PDF copy will be provided separately.</strong>'}
                </p>
                
                <p>Time to prepare for the performance!</p>
              </div>
            `,
            text: `Contract ${updatedContract.contractNumber} signed by ${updatedContract.clientName} on ${signedDate} at ${signedTime}. Event: ${new Date(updatedContract.eventDate).toLocaleDateString('en-GB')} at ${updatedContract.venue}. Fee: £${updatedContract.fee}.${pdfBase64 ? ' Signed contract PDF is attached.' : ' PDF copy will be provided separately.'}`
          };
          
          // Add PDF attachment if generation was successful
          if (pdfBase64) {
            performerEmailParams.attachments = [{
              content: pdfBase64,
              filename: `Contract-${updatedContract.contractNumber}-Signed.pdf`,
              type: 'application/pdf',
              disposition: 'attachment'
            }];
          }
          
          console.log('=== SENDING PERFORMER EMAIL ===');
          const performerEmailResult = await sendEmail(performerEmailParams);
          console.log('Performer email result:', performerEmailResult);
        }
        
        console.log('=== DEPLOYMENT EMAIL PROCESSING COMPLETED ===');
        
      } catch (emailError) {
        console.error('Email processing error:', emailError);
      }
    }, 100); // Small delay to ensure response is sent first
    
  } catch (error) {
    console.error('Contract signing error:', error);
    res.status(500).json({ error: 'Failed to sign contract' });
  }
});