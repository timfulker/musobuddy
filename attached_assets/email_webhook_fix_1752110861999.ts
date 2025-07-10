/**
 * SendGrid Email Webhook Handler - FIXED VERSION
 * Processes incoming emails sent to leads@musobuddy.com
 */

import { Request, Response } from 'express';
import { storage } from './storage';
import { parseEmailEnquiry } from './email-parser';

export interface SendGridWebhookPayload {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  envelope: string; // This comes as JSON string from SendGrid
  headers: string;  // This comes as JSON string from SendGrid
  [key: string]: any; // Allow other fields
}

/**
 * SendGrid Inbound Email Webhook Handler - FIXED VERSION
 */
export async function handleSendGridWebhook(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    console.log('=== SENDGRID WEBHOOK RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('User-Agent:', req.headers['user-agent']);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    
    // Log the full request body for debugging
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    console.log('Request body keys:', Object.keys(req.body));
    
    // SendGrid sends form-encoded data - extract fields
    const {
      to,
      from,
      subject,
      text,
      html,
      envelope,
      headers,
      attachments,
      ...otherFields
    } = req.body;

    console.log('Extracted email data:', { 
      to, 
      from, 
      subject, 
      textLength: text?.length || 0,
      htmlLength: html?.length || 0,
      hasAttachments: !!attachments,
      envelope: envelope ? 'present' : 'missing',
      headers: headers ? 'present' : 'missing',
      otherFields: Object.keys(otherFields)
    });

    // Validate required fields
    if (!from) {
      console.log('Missing from field');
      return res.status(400).json({ message: 'Missing from field' });
    }

    if (!subject && !text && !html) {
      console.log('Missing email content');
      return res.status(400).json({ message: 'Missing email content' });
    }

    // SendGrid requirement: Validate message size (30MB limit)
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 30 * 1024 * 1024) {
      console.log('Message exceeds 30MB limit, rejecting');
      return res.status(413).json({ message: 'Message too large' });
    }

    // Validate this is for our leads email
    if (!to || !to.includes('leads@musobuddy.com')) {
      console.log('Email not for leads@musobuddy.com, ignoring. TO field:', to);
      // SendGrid requirement: Return 2xx even for ignored emails
      return res.status(200).json({ message: 'Email ignored - not for leads' });
    }

    // Parse envelope if it's a JSON string
    let parsedEnvelope = null;
    if (envelope) {
      try {
        parsedEnvelope = typeof envelope === 'string' ? JSON.parse(envelope) : envelope;
        console.log('Parsed envelope:', parsedEnvelope);
      } catch (e) {
        console.log('Failed to parse envelope:', e);
      }
    }

    // Parse headers if it's a JSON string
    let parsedHeaders = null;
    if (headers) {
      try {
        parsedHeaders = typeof headers === 'string' ? JSON.parse(headers) : headers;
        console.log('Parsed headers count:', Object.keys(parsedHeaders || {}).length);
      } catch (e) {
        console.log('Failed to parse headers:', e);
      }
    }

    // Use text content, fallback to html, or create minimal content
    const emailContent = text || (html ? html.replace(/<[^>]*>/g, '') : subject || 'No content');
    const emailSubject = subject || 'No subject';
    
    console.log('Processing email with content length:', emailContent.length);

    // Parse the email content with timeout protection
    let enquiryData;
    try {
      enquiryData = await Promise.race([
        parseEmailEnquiry(from, emailSubject, emailContent),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Parse timeout')), 25000))
      ]);
      console.log('Email parsed successfully:', {
        title: enquiryData.title,
        clientName: enquiryData.clientName,
        clientEmail: enquiryData.clientEmail,
        venue: enquiryData.venue
      });
    } catch (parseError) {
      console.error('Error parsing email:', parseError);
      // Create a basic enquiry even if parsing fails
      enquiryData = {
        title: `Email from ${from}`,
        clientName: from.split('@')[0] || 'Unknown',
        clientEmail: from,
        clientPhone: null,
        eventDate: null,
        venue: null,
        message: `Subject: ${emailSubject}\n\nContent:\n${emailContent}`
      };
    }
    
    // Create enquiry in system with timeout protection
    const enquiry = await Promise.race([
      storage.createEnquiry({
        title: enquiryData.title,
        clientName: enquiryData.clientName,
        clientEmail: enquiryData.clientEmail || from,
        clientPhone: enquiryData.clientPhone || null,
        eventDate: enquiryData.eventDate || null,
        venue: enquiryData.venue || null,
        notes: enquiryData.message,
        userId: "43963086", // Main account owner
        status: 'new',
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 20000))
    ]);

    const processingTime = Date.now() - startTime;
    console.log(`✅ Successfully created enquiry from email: ${enquiry.id} (${processingTime}ms)`);
    
    // SendGrid requirement: Must respond with 2xx status within 30 seconds
    res.status(200).json({ 
      message: 'Email processed successfully', 
      enquiryId: enquiry.id,
      clientName: enquiry.clientName,
      processingTime: processingTime 
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error processing SendGrid webhook:', error);
    console.error('Error stack:', error.stack);
    console.error('Processing time:', processingTime, 'ms');
    
    // SendGrid requirement: Even errors should return 2xx if email was received
    // Only return 5xx for actual webhook failures
    if (error.message?.includes('timeout')) {
      console.log('⏰ Timeout error - returning 2xx to prevent SendGrid retries');
      res.status(200).json({ 
        message: 'Email received but processing delayed',
        error: 'timeout',
        processingTime: processingTime
      });
    } else {
      // For debugging, let's return 2xx but log the error
      console.log('🔧 Returning 2xx for debugging - would normally be 5xx');
      res.status(200).json({ 
        message: 'Email received but processing failed',
        error: error.message,
        processingTime: processingTime,
        debug: true
      });
    }
  }
}