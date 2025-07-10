// Add this to your routes.ts file for debugging

// Debug webhook endpoint - logs everything
app.all('/api/webhook/debug', async (req, res) => {
  console.log('=== WEBHOOK DEBUG ENDPOINT ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Raw body type:', typeof req.body);
  console.log('Body keys:', req.body ? Object.keys(req.body) : 'No body');
  
  // Log specific SendGrid fields if present
  if (req.body) {
    const { to, from, subject, text, html, envelope, headers } = req.body;
    console.log('SendGrid fields detected:');
    console.log('- to:', to);
    console.log('- from:', from);
    console.log('- subject:', subject);
    console.log('- text length:', text?.length || 0);
    console.log('- html length:', html?.length || 0);
    console.log('- envelope:', envelope ? 'present' : 'missing');
    console.log('- headers:', headers ? 'present' : 'missing');
  }
  
  res.status(200).json({
    message: 'Debug endpoint received data',
    method: req.method,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint that simulates your email processing
app.post('/api/webhook/test-processing', async (req, res) => {
  try {
    console.log('=== TESTING EMAIL PROCESSING ===');
    
    // Use the exact same logic as your main webhook
    const { to, from, subject, text, html } = req.body;
    
    console.log('Test data:', { to, from, subject, textLength: text?.length });
    
    if (!from) {
      throw new Error('Missing from field');
    }
    
    // Test email parsing
    const { parseEmailEnquiry } = await import('./email-parser');
    const enquiryData = await parseEmailEnquiry(from, subject || '', text || html || '');
    
    console.log('Parsed enquiry data:', enquiryData);
    
    // Test database insertion
    const enquiry = await storage.createEnquiry({
      title: enquiryData.title,
      clientName: enquiryData.clientName,
      clientEmail: enquiryData.clientEmail || from,
      clientPhone: enquiryData.clientPhone || null,
      eventDate: enquiryData.eventDate || null,
      venue: enquiryData.venue || null,
      notes: enquiryData.message,
      userId: "43963086",
      status: 'new',
    });
    
    console.log('✅ Test enquiry created:', enquiry.id);
    
    res.status(200).json({
      success: true,
      message: 'Test processing successful',
      enquiryId: enquiry.id,
      parsedData: enquiryData
    });
    
  } catch (error) {
    console.error('❌ Test processing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Test processing failed',
      error: error.message
    });
  }
});