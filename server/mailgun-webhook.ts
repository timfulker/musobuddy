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
  clientPhone: string;
  eventDate: string;
  venue: string;
  eventType: string;
  description: string;
  source: string;
} {
  const { from, subject, text, html } = emailData;
  
  // Extract client email and name
  const clientEmail = from.includes('<') 
    ? from.match(/<([^>]+)>/)?.[1] || from
    : from;
  
  let clientName = from.includes('<')
    ? from.replace(/<[^>]+>/, '').trim().replace(/['"]/g, '')
    : clientEmail.split('@')[0];

  // Extract phone number from email content
  const emailContent = text || html || '';
  const phoneMatch = emailContent.match(/(?:phone|tel|mobile|call|contact).{0,20}?(\d{5}\s?\d{6}|\d{11}|07\d{3}\s?\d{6})/i);
  const clientPhone = phoneMatch ? phoneMatch[1].replace(/\s/g, '') : '';

  // Extract client name from email content if mentioned
  const nameMatch = emailContent.match(/(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch) {
    clientName = nameMatch[1];
  }

  // Extract event date
  const dateMatch = emailContent.match(/(?:on|for)\s+([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i);
  const eventDate = dateMatch ? dateMatch[1] : '';

  // Extract venue
  const venueMatch = emailContent.match(/(?:at|venue|location|held at)\s+([A-Z][^.!?]*)/i);
  const venue = venueMatch ? venueMatch[1].trim() : '';

  // Extract event type
  let eventType = 'Performance';
  if (emailContent.toLowerCase().includes('wedding')) eventType = 'Wedding';
  else if (emailContent.toLowerCase().includes('birthday')) eventType = 'Birthday';
  else if (emailContent.toLowerCase().includes('corporate')) eventType = 'Corporate';
  else if (emailContent.toLowerCase().includes('party')) eventType = 'Party';

  // Use subject as title, or create from content
  const title = subject || `${eventType} enquiry from ${clientName}`;
  
  // Clean description - remove extracted details for cleaner notes
  const description = emailContent || 'Email enquiry received';
  
  return {
    title,
    clientName,
    clientEmail,
    clientPhone,
    eventDate,
    venue,
    eventType,
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
    console.log('📋 Event date conversion test:', enquiryData.eventDate ? new Date(enquiryData.eventDate) : new Date());
    
    // Create enquiry in database
    // Note: We'll need to determine the userId - for now using a default
    const userId = '43963086'; // Using your user ID for testing
    
    const enquiry = await storage.createEnquiry({
      title: enquiryData.title,
      clientName: enquiryData.clientName,
      clientEmail: enquiryData.clientEmail,
      clientPhone: enquiryData.clientPhone,
      eventDate: enquiryData.eventDate ? new Date(enquiryData.eventDate) : new Date(), // Convert string to Date object
      venue: enquiryData.venue,
      eventType: enquiryData.eventType,
      notes: enquiryData.description,
      userId,
      status: 'new',
      gigType: 'TBD',
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