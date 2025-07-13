// Replace the webhook handler in server/index.ts with this minimal diagnostic version

app.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  const requestId = Date.now().toString();
  console.log(`🔍 [${requestId}] DIAGNOSTIC WEBHOOK START`);
  
  try {
    // Log everything first
    console.log(`🔍 [${requestId}] Raw body:`, JSON.stringify(req.body, null, 2));
    console.log(`🔍 [${requestId}] Headers:`, JSON.stringify(req.headers, null, 2));
    
    // Extract fields with fallbacks
    const from = req.body.From || req.body.from || req.body.sender || 'NO_FROM_FIELD';
    const subject = req.body.Subject || req.body.subject || 'NO_SUBJECT_FIELD';
    const body = req.body['body-plain'] || req.body['stripped-text'] || req.body.text || 'NO_BODY_FIELD';
    
    console.log(`🔍 [${requestId}] Extracted - From: "${from}"`);
    console.log(`🔍 [${requestId}] Extracted - Subject: "${subject}"`);
    console.log(`🔍 [${requestId}] Extracted - Body length: ${body.length}`);
    
    // Test email extraction
    const emailMatch = from.match(/[\w.-]+@[\w.-]+\.\w+/);
    const clientEmail = emailMatch ? emailMatch[0] : from;
    console.log(`🔍 [${requestId}] Email extraction - Match: ${!!emailMatch}, Result: "${clientEmail}"`);
    
    // Test name extraction
    let clientName = 'Unknown';
    if (from.includes('<')) {
      const nameMatch = from.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim();
      }
    } else if (clientEmail && clientEmail !== 'NO_FROM_FIELD') {
      clientName = clientEmail.split('@')[0];
    }
    console.log(`🔍 [${requestId}] Name extraction result: "${clientName}"`);
    
    // Create enquiry object
    const enquiry = {
      userId: '43963086',
      title: subject !== 'NO_SUBJECT_FIELD' ? subject : `Email from ${clientName}`,
      clientName,
      clientEmail: clientEmail !== 'NO_FROM_FIELD' ? clientEmail : null,
      clientPhone: null,
      eventDate: null,
      eventTime: null,
      eventEndTime: null,
      performanceDuration: null,
      venue: null,
      eventType: null,
      gigType: null,
      estimatedValue: null,
      status: 'new' as const,
      notes: body !== 'NO_BODY_FIELD' ? body : 'Email enquiry with no body content',
      responseNeeded: true,
      lastContactedAt: null
    };
    
    console.log(`🔍 [${requestId}] Enquiry object:`, JSON.stringify(enquiry, null, 2));
    
    // Validate critical fields
    if (!enquiry.userId || !enquiry.title || !enquiry.clientName || !enquiry.status) {
      console.log(`❌ [${requestId}] VALIDATION FAILED - Missing required fields`);
      console.log(`❌ [${requestId}] userId: ${!!enquiry.userId}`);
      console.log(`❌ [${requestId}] title: ${!!enquiry.title}`);
      console.log(`❌ [${requestId}] clientName: ${!!enquiry.clientName}`);
      console.log(`❌ [${requestId}] status: ${!!enquiry.status}`);
      
      return res.status(200).json({
        success: false,
        error: 'Validation failed',
        enquiry,
        requestId
      });
    }
    
    // Database insertion with detailed error logging
    console.log(`🔍 [${requestId}] Attempting database insertion...`);
    
    try {
      const newEnquiry = await storage.createEnquiry(enquiry);
      console.log(`✅ [${requestId}] SUCCESS - Database record created: ${newEnquiry.id}`);
      
      res.status(200).json({
        success: true,
        enquiryId: newEnquiry.id,
        clientName: enquiry.clientName,
        clientEmail: enquiry.clientEmail,
        requestId
      });
      
    } catch (dbError: any) {
      console.log(`❌ [${requestId}] DATABASE ERROR:`, dbError.message);
      console.log(`❌ [${requestId}] Error code:`, dbError.code);
      console.log(`❌ [${requestId}] Error constraint:`, dbError.constraint);
      console.log(`❌ [${requestId}] Error detail:`, dbError.detail);
      console.log(`❌ [${requestId}] Error stack:`, dbError.stack);
      
      // Return success to Mailgun but log the error
      res.status(200).json({
        success: false,
        error: 'Database error',
        dbErrorMessage: dbError.message,
        dbErrorCode: dbError.code,
        enquiry,
        requestId
      });
    }
    
  } catch (generalError: any) {
    console.log(`❌ [${requestId}] GENERAL ERROR:`, generalError.message);
    console.log(`❌ [${requestId}] Error stack:`, generalError.stack);
    
    res.status(200).json({
      success: false,
      error: 'General processing error',
      message: generalError.message,
      requestId
    });
  }
  
  console.log(`🔍 [${requestId}] DIAGNOSTIC WEBHOOK END`);
});
