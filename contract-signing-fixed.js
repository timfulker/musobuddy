// WORKING CONTRACT SIGNING FUNCTION
// This completely replaces the broken section in routes.ts

const contractSigningFunction = `
  // Contract signing endpoint - FIXED VERSION
  app.post('/api/contracts/sign/:id', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const { signatureName } = req.body;
      
      console.log('=== CONTRACT SIGNING ATTEMPT ===');
      console.log('Contract ID:', contractId);
      console.log('Signature name:', signatureName);
      
      if (!signatureName || !signatureName.trim()) {
        console.log('ERROR: Missing signature name');
        return res.status(400).json({ message: "Signature name is required" });
      }
      
      // Get contract
      const contract = await storage.getContractById(contractId);
      console.log('Contract found:', contract ? 'YES' : 'NO');
      console.log('Contract status:', contract?.status);
      
      if (!contract) {
        console.log('ERROR: Contract not found');
        return res.status(404).json({ message: "Contract not found" });
      }
      
      if (contract.status !== 'sent') {
        console.log('ERROR: Contract not in sent status. Current status:', contract.status);
        return res.status(400).json({ message: 'Contract is not available for signing. Current status: ' + contract.status });
      }
      
      // Get client IP for audit trail
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Update contract with signature
      const signedContract = await storage.signContract(contractId, {
        signatureName: signatureName.trim(),
        clientIP,
        signedAt: new Date()
      });
      
      if (!signedContract) {
        return res.status(500).json({ message: "Failed to sign contract" });
      }
      
      // Send confirmation emails immediately (no background process)
      try {
        console.log('=== SENDING CONFIRMATION EMAILS ===');
        
        const userSettings = await storage.getUserSettings(contract.userId);
        const { sendEmail } = await import('./sendgrid');
        const { generateContractPDF } = await import('./pdf-generator');
        
        const userBusinessEmail = userSettings?.businessEmail;
        const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy';
        const fromEmail = 'noreply@musobuddy.com';
        const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
        
        console.log('Client email:', contract.clientEmail);
        console.log('Performer email:', userBusinessEmail);
        
        // Generate PDF with signature details
        const signatureDetails = {
          signedAt: new Date(),
          signatureName: signatureName.trim(),
          clientIpAddress: clientIP
        };
        
        const pdfBuffer = await generateContractPDF(signedContract, userSettings || null, signatureDetails);
        const pdfBase64 = pdfBuffer.toString('base64');
        console.log('PDF generated, size:', pdfBuffer.length);
        
        // Send to client
        if (contract.clientEmail) {
          console.log('Sending email to client:', contract.clientEmail);
          
          const clientEmailParams = {
            to: contract.clientEmail,
            from: fromName + ' <' + fromEmail + '>',
            subject: 'Contract ' + contract.contractNumber + ' Successfully Signed - Copy Attached',
            html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #4CAF50;">Contract Signed Successfully ✓</h2><p>Dear ' + contract.clientName + ',</p><p>Your performance contract <strong>' + contract.contractNumber + '</strong> has been successfully signed.</p><p>📎 <strong>Your signed contract is attached as a PDF for your records.</strong></p><p>We look forward to performing at your event!</p><p>Best regards,<br><strong>' + (userSettings?.businessName || 'MusoBuddy') + '</strong></p></div>',
            text: 'Contract ' + contract.contractNumber + ' has been successfully signed. PDF attached.',
            attachments: [{
              content: pdfBase64,
              filename: 'Contract-' + contract.contractNumber + '-Signed.pdf',
              type: 'application/pdf',
              disposition: 'attachment'
            }]
          };
          
          if (replyToEmail) {
            clientEmailParams.replyTo = replyToEmail;
          }
          
          await sendEmail(clientEmailParams);
          console.log('Client email sent');
        }
        
        // Send to performer
        if (userSettings?.businessEmail) {
          console.log('Sending email to performer:', userSettings.businessEmail);
          
          const performerEmailParams = {
            to: userSettings.businessEmail,
            from: fromName + ' <' + fromEmail + '>',
            subject: 'Contract ' + contract.contractNumber + ' Signed by ' + contract.clientName,
            html: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #4CAF50;">Contract Signed Successfully! ✓</h2><p>Great news! Your contract has been signed by ' + contract.clientName + '.</p><p>📎 <strong>Signed contract PDF is attached for your records.</strong></p><p>Time to prepare for the performance!</p></div>',
            text: 'Contract ' + contract.contractNumber + ' signed by ' + contract.clientName + '. PDF attached.',
            attachments: [{
              content: pdfBase64,
              filename: 'Contract-' + contract.contractNumber + '-Signed.pdf',
              type: 'application/pdf',
              disposition: 'attachment'
            }]
          };
          
          await sendEmail(performerEmailParams);
          console.log('Performer email sent');
        }
        
        console.log('=== EMAIL SENDING COMPLETED ===');
        
      } catch (error) {
        console.error('Error in email processing:', error);
      }
      
      res.json({ 
        message: "Contract signed successfully",
        contract: signedContract 
      });
      
    } catch (error) {
      console.error("Error signing contract:", error);
      res.status(500).json({ message: "Failed to sign contract" });
    }
  });
`;

console.log("Fixed contract signing function ready for insertion");