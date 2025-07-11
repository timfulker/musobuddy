/**
 * Updated Mailgun Email Webhook Handler
 * Now handles both real emails AND test data from Mailgun
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
 * Enhanced Mailgun Inbound Email Webhook Handler
 * Now handles both real emails and test data
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

    // Enhanced validation - handle both real emails and test data
    let isTestData = false;
    let targetEmail = recipient;
    let fromEmail = sender;
    
    // Check if this is test data (no recipient field)
    if (!recipient && sender) {
      console.log('🧪 Detected test data - no recipient field, processing anyway');
      isTestData = true;
      targetEmail = 'leads@musobuddy.com'; // Assume it's for leads
      fromEmail = sender;
    }
    
    // Check if this is for leads email (only for real emails)
    if (!isTestData && recipient && !recipient.includes('leads@musobuddy.com')) {
      console.log('Email not for leads@musobuddy.com, ignoring');
      return res.status(200).json({ message: 'Email ignored - not for leads' });
    }

    // Use default values for test data
    const emailSubject = subject || 'Test Email from Mailgun';
    const emailBody = bodyPlain || bodyHtml || 'Test email content - no body provided';
    const emailFrom = fromEmail || 'test@example.com';

    console.log('Processing email:', {
      isTestData,
      targetEmail,
      fromEmail: emailFrom,
      subject: emailSubject,
      bodyLength: emailBody.length
    });

    // Parse the email content using our client info parser
    const clientInfo = parseClientInfo(emailBody, emailFrom, emailSubject);
    
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
    
    // Add test indicator to title if this is test data
    const enquiryTitle = isTestData 
      ? `[TEST] ${emailSubject || `Email from ${clientInfo.clientName}`}`
      : (emailSubject || `Email from ${clientInfo.clientName}`);
    
    const enquiry = await storage.createEnquiry({
      title: enquiryTitle,
      clientName: clientInfo.clientName,
      clientEmail: clientInfo.clientEmail,
      clientPhone: clientInfo.clientPhone || null,
      eventDate: eventDate,
      venue: clientInfo.venue || null,
      notes: isTestData 
        ? `[TEST DATA] ${clientInfo.details}`
        : clientInfo.details,
      userId: "43963086", // Main account owner
      status: 'new',
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Successfully created enquiry from Mailgun ${isTestData ? 'TEST' : 'email'}: ${enquiry.id} (${processingTime}ms)`);
    
    res.status(200).json({ 
      message: isTestData 
        ? 'Test data processed successfully' 
        : 'Email processed successfully', 
      enquiryId: enquiry.id,
      clientName: enquiry.clientName,
      isTestData,
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