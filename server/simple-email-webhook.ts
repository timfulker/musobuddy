/**
 * Simple Email Webhook Handler
 * Handles email forwarding without domain verification requirements
 */

import type { Request, Response } from "express";
import { storage } from "./storage";

export interface SimpleEmailPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  timestamp?: string;
}

/**
 * Parse client information from email content
 */
function parseClientInfo(emailText: string, fromEmail: string, subject: string) {
  const lines = emailText.split('\n').map(line => line.trim()).filter(line => line);
  
  // Extract client name from email
  let clientName = '';
  const nameMatch = fromEmail.match(/^([^@]+)@/);
  if (nameMatch) {
    clientName = nameMatch[1].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  // Look for phone numbers
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/;
  const phoneMatch = emailText.match(phoneRegex);
  const phone = phoneMatch ? phoneMatch[0] : '';
  
  // Look for dates
  const dateRegex = /(?:january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)/i;
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
    phone,
    eventDate,
    venue,
    notes: emailText
  };
}

/**
 * Handle simple email webhook
 */
export async function handleSimpleEmailWebhook(req: Request, res: Response) {
  console.log('🔥 SIMPLE EMAIL WEBHOOK HIT!');
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const payload = req.body as SimpleEmailPayload;
    
    // Basic validation
    if (!payload.from || !payload.subject || !payload.text) {
      console.error('Missing required email fields');
      return res.status(400).json({ error: 'Missing required email fields' });
    }
    
    console.log('📧 Processing email from:', payload.from);
    console.log('📧 Subject:', payload.subject);
    console.log('📧 Text preview:', payload.text.substring(0, 200) + '...');
    
    // Parse client information
    const clientInfo = parseClientInfo(payload.text, payload.from, payload.subject);
    
    // Create enquiry
    const enquiry = await storage.createEnquiry({
      title: payload.subject,
      clientName: clientInfo.clientName,
      clientEmail: clientInfo.clientEmail,
      phone: clientInfo.phone,
      eventDate: clientInfo.eventDate,
      venue: clientInfo.venue,
      notes: clientInfo.notes,
      source: 'Email Forwarding',
      status: 'new',
      userId: 'system', // Will be handled by system
      gigType: 'General',
      eventType: 'Performance'
    });
    
    console.log('✅ Enquiry created successfully:', enquiry.id);
    
    res.status(200).json({
      success: true,
      enquiry: enquiry.id,
      message: 'Email processed successfully'
    });
    
  } catch (error) {
    console.error('❌ Error processing email:', error);
    res.status(500).json({
      error: 'Failed to process email',
      details: error.message
    });
  }
}