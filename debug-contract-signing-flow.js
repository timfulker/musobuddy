/**
 * Debug the contract signing flow to see why confirmation emails aren't sent
 */

async function debugContractSigningFlow() {
  console.log('🔍 Debugging contract signing flow...');
  
  try {
    // Let's manually test the confirmation email sending part
    const { storage } = await import('./server/storage.js');
    const { sendEmail } = await import('./server/mailgun-email.js');
    
    // Get a signed contract
    const contract = await storage.getContractById(253); // Contract #0123
    console.log('Contract details:', {
      id: contract.id,
      contractNumber: contract.contractNumber,
      clientName: contract.clientName,
      clientEmail: contract.clientEmail,
      status: contract.status,
      signedAt: contract.signedAt,
      userId: contract.userId
    });
    
    // Get user settings
    const userSettings = await storage.getUserSettings(contract.userId);
    console.log('User settings:', {
      businessEmail: userSettings?.businessEmail,
      emailFromName: userSettings?.emailFromName,
      businessName: userSettings?.businessName
    });
    
    // Test the email sending manually
    const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy User';
    const fromEmail = 'noreply@mg.musobuddy.com';
    
    // Test client confirmation email
    const clientEmailData = {
      to: contract.clientEmail,
      from: `${fromName} <${fromEmail}>`,
      subject: `Contract ${contract.contractNumber} Successfully Signed ✓`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Successfully Signed! ✓</h2>
          <p>Dear ${contract.clientName},</p>
          <p>Thank you for signing the contract! Your booking is now confirmed.</p>
        </div>
      `,
      text: `Contract ${contract.contractNumber} successfully signed. Thank you!`
    };
    
    console.log('🔥 Testing client confirmation email...');
    const clientResult = await sendEmail(clientEmailData);
    console.log('Client email result:', clientResult);
    
    // Test performer confirmation email
    if (userSettings?.businessEmail) {
      const performerEmailData = {
        to: userSettings.businessEmail,
        from: `${fromName} <${fromEmail}>`,
        subject: `Contract ${contract.contractNumber} Signed by Client ✓`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed! ✓</h2>
            <p>Great news! Contract <strong>${contract.contractNumber}</strong> has been signed by ${contract.clientName}.</p>
          </div>
        `,
        text: `Contract ${contract.contractNumber} signed by ${contract.clientName}.`
      };
      
      console.log('🔥 Testing performer confirmation email...');
      const performerResult = await sendEmail(performerEmailData);
      console.log('Performer email result:', performerResult);
    } else {
      console.log('❌ No business email found - performer email not sent');
    }
    
  } catch (error) {
    console.error('❌ Error debugging contract signing:', error);
  }
}

debugContractSigningFlow();