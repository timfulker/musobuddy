// Enhanced webhook handler with detailed data inspection
import { Request, Response } from 'express';
import { storage } from './storage';

export async function inspectMailgunWebhook(req: Request, res: Response): Promise<void> {
  const timestamp = new Date().toISOString();
  
  console.log('🔍 === WEBHOOK DATA INSPECTION START ===');
  console.log('🔍 Timestamp:', timestamp);
  
  // Log ALL raw data
  console.log('🔍 RAW REQUEST DATA:');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Content-Type:', req.headers['content-type']);
  
  // Log the complete body
  console.log('🔍 COMPLETE BODY DATA:');
  console.log('Body type:', typeof req.body);
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('Full body:', JSON.stringify(req.body, null, 2));
  
  // Check specific Mailgun fields
  const mailgunFields = [
    'sender', 'From', 'from',
    'recipient', 'To', 'to', 
    'subject', 'Subject',
    'body-plain', 'body-html', 'stripped-text', 'stripped-html',
    'text', 'html',
    'timestamp', 'token', 'signature',
    'message-headers', 'attachments'
  ];
  
  console.log('🔍 MAILGUN FIELD INSPECTION:');
  mailgunFields.forEach(field => {
    const value = req.body[field];
    if (value !== undefined) {
      console.log(`📧 ${field}:`, typeof value === 'string' && value.length > 100 ? 
        `"${value.substring(0, 100)}..."` : value);
    }
  });
  
  // Test email extraction with current logic
  console.log('🔍 EMAIL EXTRACTION TEST:');
  try {
    const extractedEmail = req.body.sender || req.body.From || req.body.from || 'NOT_FOUND';
    const extractedSubject = req.body.subject || req.body.Subject || 'NOT_FOUND';
    const extractedText = req.body['body-plain'] || req.body['stripped-text'] || req.body.text || 'NOT_FOUND';
    const extractedHtml = req.body['body-html'] || req.body['stripped-html'] || req.body.html || 'NOT_FOUND';
    
    console.log('📧 Extracted FROM:', extractedEmail);
    console.log('📧 Extracted SUBJECT:', extractedSubject);
    console.log('📧 Extracted TEXT length:', typeof extractedText === 'string' ? extractedText.length : 'Not string');
    console.log('📧 Extracted HTML length:', typeof extractedHtml === 'string' ? extractedHtml.length : 'Not string');
    
    if (extractedText && extractedText !== 'NOT_FOUND') {
      console.log('📧 TEXT SAMPLE:', extractedText.substring(0, 200));
    }
    
    // Test client name extraction
    let clientName = 'unknown';
    const emailContent = extractedText || extractedHtml || '';
    
    // Try to extract from email header
    if (extractedEmail && extractedEmail !== 'NOT_FOUND') {
      const emailMatch = extractedEmail.match(/[\w.-]+@[\w.-]+\.\w+/);
      const cleanEmail = emailMatch ? emailMatch[0] : extractedEmail;
      
      if (extractedEmail.includes('<')) {
        const nameFromHeader = extractedEmail.replace(/<[^>]+>/, '').trim().replace(/['"]/g, '');
        if (nameFromHeader && nameFromHeader !== cleanEmail) {
          clientName = nameFromHeader;
        }
      }
      
      // Try to extract from email content
      const namePatterns = [
        /(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
      ];
      
      for (const pattern of namePatterns) {
        const match = emailContent.match(pattern);
        if (match && match[1]) {
          clientName = match[1];
          break;
        }
      }
      
      console.log('📧 PARSED CLIENT NAME:', clientName);
      console.log('📧 CLEAN EMAIL:', cleanEmail);
    }
    
    // Create the enquiry with detailed logging
    console.log('🔍 CREATING ENQUIRY...');
    const enquiryData = {
      userId: '43963086',
      title: extractedSubject !== 'NOT_FOUND' ? extractedSubject : 'Email enquiry',
      clientName: clientName,
      clientEmail: extractedEmail !== 'NOT_FOUND' ? extractedEmail : null,
      clientPhone: null,
      eventDate: null,
      venue: null,
      eventType: null,
      notes: emailContent || 'No message content',
      status: 'new' as const
    };
    
    console.log('🔍 ENQUIRY DATA TO SAVE:', JSON.stringify(enquiryData, null, 2));
    
    const enquiry = await storage.createEnquiry(enquiryData);
    console.log('✅ ENQUIRY CREATED:', enquiry.id);
    
    res.status(200).json({
      success: true,
      enquiryId: enquiry.id,
      debug: {
        extractedEmail,
        extractedSubject,
        clientName,
        textLength: typeof extractedText === 'string' ? extractedText.length : 0,
        timestamp
      }
    });
    
  } catch (error: any) {
    console.error('❌ WEBHOOK PROCESSING ERROR:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({
      error: 'Processing failed',
      details: error.message,
      timestamp
    });
  }
  
  console.log('🔍 === WEBHOOK DATA INSPECTION END ===');
}