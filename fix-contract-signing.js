// Quick fix to restore contract signing email functionality
// This will be integrated into the main routes file

const contractSigningEmailFix = `
      // Send confirmation emails immediately after signing
      console.log('=== SENDING CONFIRMATION EMAILS ===');
      
      const userSettings = await storage.getUserSettings(contract.userId);
      const { sendEmail } = await import('./sendgrid');
      const { generateContractPDF } = await import('./pdf-generator');
      
      const userBusinessEmail = userSettings?.businessEmail;
      const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy';
      const fromEmail = 'noreply@musobuddy.com';
      const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
      
      // Generate PDF with signature details
      const signatureDetails = {
        signedAt: new Date(),
        signatureName: signatureName.trim(),
        clientIpAddress: clientIP
      };
      
      const pdfBuffer = await generateContractPDF(signedContract, userSettings || null, signatureDetails);
      const pdfBase64 = pdfBuffer.toString('base64');
      console.log('PDF generated, size:', pdfBuffer.length);
      
      const signedDate = new Date().toLocaleDateString('en-GB');
      const signedTime = new Date().toLocaleTimeString('en-GB');
      
      // Send to client
      if (contract.clientEmail) {
        console.log('Sending email to client:', contract.clientEmail);
        
        const clientEmailParams = {
          to: contract.clientEmail,
          from: fromName + ' <' + fromEmail + '>',
          subject: 'Contract ' + contract.contractNumber + ' Successfully Signed - Copy Attached',
          html: '<h2>Contract Signed Successfully</h2><p>Your contract has been signed and is attached as a PDF.</p>',
          text: 'Contract signed successfully. PDF attached.',
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
          html: '<h2>Contract Signed!</h2><p>Your contract has been signed by the client. PDF attached.</p>',
          text: 'Contract signed by client. PDF attached.',
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
`;

console.log('Contract signing email fix ready');