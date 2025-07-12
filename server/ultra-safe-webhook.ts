import { Request, Response } from 'express';
import { storage } from './storage';

/**
 * Ultra-safe webhook handler that bypasses all date processing
 * This is designed to isolate the toISOString() error
 */
export async function handleUltraSafeWebhook(req: Request, res: Response): Promise<void> {
  console.log('🛡️ === ULTRA SAFE WEBHOOK HANDLER START ===');
  
  try {
    // Extract basic information without any date processing
    const sender = req.body.sender || req.body.from || 'unknown@example.com';
    const recipient = req.body.recipient || req.body.to || 'leads@musobuddy.com';
    const subject = req.body.subject || 'Email enquiry';
    const bodyText = req.body['body-plain'] || req.body.text || 'No message content';
    
    console.log('🛡️ Extracted data:');
    console.log('🛡️ Sender:', sender);
    console.log('🛡️ Recipient:', recipient);
    console.log('🛡️ Subject:', subject);
    console.log('🛡️ Body length:', bodyText.length);
    
    // Create ultra-minimal enquiry with NO date fields
    const ultraSafeEnquiry = {
      userId: '43963086', // Your user ID
      title: subject,
      clientName: extractClientName(sender, bodyText),
      clientEmail: extractEmail(sender),
      clientPhone: null, // Explicitly null
      eventDate: null, // Explicitly null - no date processing
      eventTime: null, // Explicitly null
      eventEndTime: null, // Explicitly null
      performanceDuration: null, // Explicitly null
      venue: null, // Explicitly null
      eventType: null, // Explicitly null
      gigType: null, // Explicitly null
      estimatedValue: null, // Explicitly null
      status: 'new' as const,
      notes: bodyText,
      responseNeeded: true,
      lastContactedAt: null // Explicitly null - no date processing
    };
    
    console.log('🛡️ Ultra safe enquiry data prepared');
    console.log('🛡️ Client name:', ultraSafeEnquiry.clientName);
    console.log('🛡️ Client email:', ultraSafeEnquiry.clientEmail);
    
    // Attempt to create enquiry with ultra-safe data
    console.log('🛡️ Creating enquiry with ultra-safe data...');
    
    const newEnquiry = await storage.createEnquiry(ultraSafeEnquiry);
    
    console.log('🛡️ ✅ Ultra safe enquiry created successfully!');
    console.log('🛡️ Enquiry ID:', newEnquiry.id);
    
    res.status(200).json({
      success: true,
      message: 'Ultra safe webhook processed successfully',
      enquiryId: newEnquiry.id,
      clientName: ultraSafeEnquiry.clientName,
      subject: subject,
      processing: 'ultra-safe-mode'
    });
    
  } catch (error: any) {
    console.error('🛡️ === ULTRA SAFE WEBHOOK ERROR ===');
    console.error('🛡️ Error message:', error.message);
    console.error('🛡️ Error stack:', error.stack);
    
    if (error.message && error.message.includes('toISOString')) {
      console.error('🛡️ ⚠️ toISOString error STILL OCCURS in ultra-safe mode!');
      console.error('🛡️ This indicates the error is very deep in the system');
      console.error('🛡️ Possibly in the ORM, database driver, or validation layer');
    }
    
    res.status(500).json({
      error: 'Ultra safe webhook failed',
      details: error.message,
      mode: 'ultra-safe',
      timestamp: new Date().toISOString()
    });
  }
  
  console.log('🛡️ === ULTRA SAFE WEBHOOK HANDLER END ===');
}

function extractClientName(sender: string, bodyText: string): string {
  // Try to extract name from sender field
  if (sender.includes('<')) {
    const nameMatch = sender.match(/^([^<]+)/);
    if (nameMatch) {
      return nameMatch[1].trim().replace(/['"]/g, '');
    }
  }
  
  // Try to extract name from email body
  const namePatterns = [
    /(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+here/i
  ];
  
  for (const pattern of namePatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Fallback to email prefix
  const email = extractEmail(sender);
  return email.split('@')[0];
}

function extractEmail(sender: string): string {
  const emailMatch = sender.match(/[\w.-]+@[\w.-]+\.\w+/);
  return emailMatch ? emailMatch[0] : sender;
}