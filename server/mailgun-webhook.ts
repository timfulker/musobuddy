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
    console.log('📧 MAILGUN WEBHOOK PROCESSING EMAIL');
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request body keys:', Object.keys(req.body || {}));
    
    const {
      recipient,
      sender,
      subject,
      'body-plain': bodyPlain,
      'body-html': bodyHtml
    } = req.body;

    // Validate this is for our leads email
    if (!recipient || !recipient.includes('leads@musobuddy.com')) {
      console.log('Email not for leads@musobuddy.com, ignoring');
      return res.status(200).json({ message: 'Email ignored - not for leads' });
    }

    // Parse the email content using our client info parser
    const clientInfo = parseClientInfo(bodyPlain || bodyHtml || '', sender, subject);
    
    // Create enquiry in system - assign to main account owner
    let eventDate = null;
    if (clientInfo.eventDate) {
      try {
        eventDate = new Date(clientInfo.eventDate);
        if (isNaN(eventDate.getTime())) {
          console.log('Invalid date detected, setting to null:', clientInfo.eventDate);
          eventDate = null;
        }
      } catch (e) {
        console.log('Error parsing date, setting to null:', clientInfo.eventDate);
        eventDate = null;
      }
    }
    
    const enquiry = await storage.createEnquiry({
      title: subject || `Email from ${clientInfo.clientName}`,
      clientName: clientInfo.clientName,
      clientEmail: clientInfo.clientEmail,
      clientPhone: clientInfo.clientPhone || null,
      eventDate: eventDate,
      venue: clientInfo.venue || null,
      notes: clientInfo.details,
      userId: "43963086", // Main account owner
      status: 'new',
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Successfully created enquiry from Mailgun email: ${enquiry.id} (${processingTime}ms)`);
    
    res.status(200).json({ 
      message: 'Email processed successfully', 
      enquiryId: enquiry.id,
      clientName: enquiry.clientName,
      processingTime: processingTime 
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error processing Mailgun webhook:', error);
    console.error('Error stack:', error.stack);
    console.error('Processing time:', processingTime, 'ms');
    
    res.status(500).json({ 
      message: 'Failed to process email',
      error: error.message,
      processingTime: processingTime
    });
  }
}