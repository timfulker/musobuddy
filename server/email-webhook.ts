/**
 * SendGrid Email Webhook Handler
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
  envelope: {
    to: string[];
    from: string;
  };
  headers: {
    [key: string]: string;
  };
}

/**
 * SendGrid Inbound Email Webhook Handler
 * Receives emails sent to leads@musobuddy.com and processes them
 * Optimized to meet all SendGrid requirements from July 8, 2025 support response
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
    
    // SendGrid requirement: Must respond with 2xx status quickly
    // Parse email data from form-encoded body
    const {
      to,
      from,
      subject,
      text,
      html,
      envelope,
      attachments
    } = req.body;

    console.log('Email data:', { 
      to, 
      from, 
      subject, 
      textLength: text?.length || 0,
      htmlLength: html?.length || 0,
      hasAttachments: !!attachments
    });

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

    // Parse the email content with timeout protection
    const enquiryData = await Promise.race([
      parseEmailEnquiry(from, subject, text || html || ''),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Parse timeout')), 25000))
    ]);
    
    // Create enquiry in system with timeout protection
    const enquiry = await Promise.race([
      storage.createEnquiry({
        title: enquiryData.title,
        clientName: enquiryData.clientName,
        clientEmail: enquiryData.clientEmail || null,
        clientPhone: enquiryData.clientPhone || null,
        eventDate: enquiryData.eventDate || new Date(),
        venue: enquiryData.venue || null,
        notes: enquiryData.message,
        userId: "43963086", // Main account owner
        status: 'new',
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 20000))
    ]);

    const processingTime = Date.now() - startTime;
    console.log(`Successfully created enquiry from email: ${enquiry.id} (${processingTime}ms)`);
    
    // SendGrid requirement: Must respond with 2xx status within 30 seconds
    res.status(200).json({ 
      message: 'Email processed successfully', 
      enquiryId: enquiry.id,
      processingTime: processingTime 
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Error processing SendGrid webhook:', error);
    console.error('Processing time:', processingTime, 'ms');
    
    // SendGrid requirement: Even errors should return 2xx if email was received
    // Only return 5xx for actual webhook failures
    if (error.message?.includes('timeout')) {
      console.log('Timeout error - returning 2xx to prevent SendGrid retries');
      res.status(200).json({ 
        message: 'Email received but processing delayed',
        error: 'timeout',
        processingTime: processingTime
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to process email',
        error: error.message,
        processingTime: processingTime
      });
    }
  }
}

/**
 * Mailgun Webhook Handler (alternative option)
 */
export async function handleMailgunWebhook(req: Request, res: Response) {
  try {
    console.log('Received Mailgun webhook:', req.body);
    
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

    // Parse the email content
    const enquiryData = await parseEmailEnquiry(sender, subject, bodyPlain || bodyHtml || '');
    
    // Create enquiry in system - assign to main account owner
    const enquiry = await storage.createEnquiry({
      title: enquiryData.title,
      clientName: enquiryData.clientName,
      clientEmail: enquiryData.clientEmail || null,
      clientPhone: enquiryData.clientPhone || null,
      eventDate: enquiryData.eventDate || new Date(),
      venue: enquiryData.venue || null,
      notes: enquiryData.message,
      userId: "43963086", // Main account owner
      status: 'new',
    });

    console.log('Successfully created enquiry from Mailgun email:', enquiry.id);
    
    res.status(200).json({ 
      message: 'Email processed successfully', 
      enquiryId: enquiry.id 
    });

  } catch (error) {
    console.error('Error processing Mailgun webhook:', error);
    res.status(500).json({ message: 'Failed to process email' });
  }
}