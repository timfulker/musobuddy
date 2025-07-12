import { Request, Response } from 'express';
import crypto from 'crypto';
import { storage } from './storage';

// Mailgun webhook signature verification
function verifyWebhookSignature(
  timestamp: string,
  token: string,
  signature: string,
  signingKey: string
): boolean {
  const value = timestamp + token;
  const hash = crypto
    .createHmac('sha256', signingKey)
    .update(value)
    .digest('hex');
  return hash === signature;
}

// Extract email details from Mailgun webhook
function extractEmailDetails(body: any): {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  recipient: string;
} {
  return {
    from: body.sender || body.From || '',
    to: body.recipient || body.To || '',
    subject: body.subject || body.Subject || '',
    text: body['body-plain'] || body.text || '',
    html: body['body-html'] || body.html || '',
    recipient: body.recipient || body.To || ''
  };
}

// Parse email content for enquiry details
function parseEmailForEnquiry(emailData: any): {
  title: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  venue: string;
  description: string;
  source: string;
} {
  const { from, subject, text, html } = emailData;
  
  // Extract client email and name
  const clientEmail = from.includes('<') 
    ? from.match(/<([^>]+)>/)?.[1] || from
    : from;
  
  const clientName = from.includes('<')
    ? from.replace(/<[^>]+>/, '').trim().replace(/['"]/g, '')
    : clientEmail.split('@')[0];

  // Use subject as title, or create from content
  const title = subject || `Enquiry from ${clientName}`;
  
  // Use both text and HTML for description
  const description = text || html || 'Email enquiry received';
  
  return {
    title,
    clientName,
    clientEmail,
    eventDate: new Date(), // Convert to Date object
    venue: 'TBD',
    description,
    source: 'Email'
  };
}

// Main webhook handler
export async function handleMailgunWebhook(req: Request, res: Response): Promise<void> {
  console.log('📧 Mailgun webhook received');
  console.log('Headers:', req.headers);
  console.log('Body keys:', Object.keys(req.body));
  
  try {
    // Verify webhook signature if signing key is provided
    if (process.env.MAILGUN_WEBHOOK_SIGNING_KEY) {
      const timestamp = req.body.timestamp;
      const token = req.body.token;
      const signature = req.body.signature;
      
      const isValid = verifyWebhookSignature(
        timestamp,
        token,
        signature,
        process.env.MAILGUN_WEBHOOK_SIGNING_KEY
      );
      
      if (!isValid) {
        console.log('❌ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
    
    // Extract email details
    const emailData = extractEmailDetails(req.body);
    console.log('📧 Email details:', emailData);
    
    // Only process emails to leads address
    if (!emailData.to.includes('leads@')) {
      console.log('📧 Email not for leads address, ignoring');
      return res.status(200).json({ message: 'Email ignored - not for leads' });
    }
    
    // Parse email for enquiry creation
    const enquiryData = parseEmailForEnquiry(emailData);
    console.log('📋 Enquiry data:', enquiryData);
    console.log('📋 Event date type:', typeof enquiryData.eventDate);
    console.log('📋 Event date value:', enquiryData.eventDate);
    
    // Create enquiry in database
    // Note: We'll need to determine the userId - for now using a default
    const userId = 'email-system'; // This will need to be configured
    
    const enquiry = await storage.createEnquiry({
      ...enquiryData,
      userId,
      status: 'new',
      gigType: 'TBD',
      eventType: 'TBD',
      eventTime: '18:00',
      fee: 0
    });
    
    console.log('✅ Enquiry created:', enquiry);
    
    res.status(200).json({ 
      message: 'Email processed successfully',
      enquiry: enquiry 
    });
    
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      error: 'Failed to process webhook',
      details: error.message 
    });
  }
}