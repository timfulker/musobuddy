/**
 * Mailgun Email Webhook Handler
 * Processes incoming emails sent to leads@musobuddy.com via Mailgun Routes
 */

import type { Request, Response } from "express";
import { storage } from "./storage";
import crypto from "crypto";

export interface MailgunWebhookPayload {
  sender: string;
  recipient: string;
  subject: string;
  'body-plain': string;
  'body-html'?: string;
  'attachment-count'?: string;
  timestamp: string;
  token?: string;
  signature?: string;
  [key: string]: any;
}

/**
 * Verify Mailgun webhook signature for security
 */
function verifyMailgunSignature(
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

/**
 * Parse client information from email content
 */
function parseClientInfo(emailText: string, fromEmail: string, subject: string) {
  const lines = emailText.split('\n').map(line => line.trim()).filter(line => line);
  
  // Extract client name from email or content
  let clientName = '';
  const nameMatch = fromEmail.match(/^([^@]+)@/);
  if (nameMatch) {
    clientName = nameMatch[1].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // Look for phone numbers
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/;
  const phoneMatch = emailText.match(phoneRegex);
  const phone = phoneMatch ? phoneMatch[0] : '';
  
  // Look for dates - various formats
  const dateRegex = /(?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\d{1,2}[-/]\d{1,2})/i;
  const dateMatch = emailText.match(dateRegex);
  const eventDate = dateMatch ? dateMatch[0] : '';
  
  // Look for venue/location
  const venueKeywords = ['venue', 'location', 'church', 'hall', 'hotel', 'club', 'center', 'centre'];
  let venue = '';
  for (const line of lines) {
    if (venueKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
      venue = line;
      break;
    }
  }
  
  return {
    clientName: clientName || 'Unknown Client',
    clientEmail: fromEmail,
    clientPhone: phone,
    eventDate,
    venue,
    details: emailText
  };
}

/**
 * Mailgun Inbound Email Webhook Handler
 */
export async function handleMailgunWebhook(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    console.log('📧 Mailgun webhook received');
    
    // Return 200 immediately as per Mailgun best practices
    res.status(200).send('OK');
    
    // Verify webhook signature if signing key is provided
    if (process.env.MAILGUN_SIGNING_KEY) {
      const { timestamp, token, signature } = req.body;
      if (!verifyMailgunSignature(timestamp, token, signature, process.env.MAILGUN_SIGNING_KEY)) {
        console.error('❌ Mailgun webhook signature verification failed');
        return;
      }
      console.log('✅ Mailgun webhook signature verified');
    }
    
    const emailData = req.body as MailgunWebhookPayload;
    
    // Log email details
    console.log('From:', emailData.sender);
    console.log('To:', emailData.recipient);
    console.log('Subject:', emailData.subject);
    console.log('Body length:', emailData['body-plain']?.length || 0);
    
    // Parse client information
    const clientInfo = parseClientInfo(
      emailData['body-plain'] || '',
      emailData.sender,
      emailData.subject
    );
    
    // Create enquiry in database
    const enquiry = await storage.createEnquiry({
      clientName: clientInfo.clientName,
      clientEmail: clientInfo.clientEmail,
      clientPhone: clientInfo.clientPhone,
      eventDate: clientInfo.eventDate,
      venue: clientInfo.venue,
      details: clientInfo.details,
      status: 'new',
      source: 'Email',
      userId: 1 // Default user ID - update based on your user system
    });
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Enquiry created successfully: #${enquiry.id} (${processingTime}ms)`);
    
  } catch (error) {
    console.error('❌ Error processing Mailgun webhook:', error);
    // Don't throw error since we already sent 200 response
  }
}