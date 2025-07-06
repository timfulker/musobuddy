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
 */
export async function handleSendGridWebhook(req: Request, res: Response) {
  try {
    console.log('=== SENDGRID WEBHOOK RECEIVED ===');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // SendGrid sends email data as form data
    const {
      to,
      from,
      subject,
      text,
      html,
      envelope
    } = req.body;

    // Validate this is for our leads email
    if (!to || !to.includes('leads@musobuddy.com')) {
      console.log('Email not for leads@musobuddy.com, ignoring');
      return res.status(200).json({ message: 'Email ignored - not for leads' });
    }

    // Parse the email content
    const enquiryData = await parseEmailEnquiry(from, subject, text || html || '');
    
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

    console.log('Successfully created enquiry from email:', enquiry.id);
    
    // Send success response to SendGrid
    res.status(200).json({ 
      message: 'Email processed successfully', 
      enquiryId: enquiry.id 
    });

  } catch (error) {
    console.error('Error processing SendGrid webhook:', error);
    res.status(500).json({ message: 'Failed to process email' });
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