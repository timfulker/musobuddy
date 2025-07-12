/**
 * Simple Mailgun Email Webhook Handler
 * Just captures raw email data and displays it
 */

import type { Request, Response } from "express";
import { storage } from "./storage";

/**
 * Simple email webhook - just capture and display raw email data
 */
export async function handleMailgunWebhook(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    console.log('📧 SIMPLE EMAIL WEBHOOK - RECEIVED EMAIL');
    console.log('📧 Method:', req.method);
    console.log('📧 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📧 Body:', JSON.stringify(req.body, null, 2));
    
    const body = req.body || {};
    
    // Get basic email info - try ALL possible field names
    const sender = body.sender || body.from || body.From || body['from'] || body['sender'] || 'unknown@email.com';
    const recipient = body.recipient || body.to || body.To || body['to'] || body['recipient'] || 'leads@musobuddy.com';
    const subject = body.subject || body.Subject || body['subject'] || body['Subject'] || 'No Subject';
    const bodyText = body['body-plain'] || body['body-html'] || body.text || body.Text || body.message || body.body || 'No body text';
    
    // Log ALL fields to see what Mailgun is actually sending
    console.log('📧 ALL MAILGUN FIELDS:');
    Object.keys(body).forEach(key => {
      console.log(`  ${key}: ${body[key]}`);
    });
    
    console.log('📧 Sender:', sender);
    console.log('📧 Recipient:', recipient);
    console.log('📧 Subject:', subject);
    console.log('📧 Body:', bodyText);
    
    // Create a simple enquiry with the email data
    const enquiry = await storage.createEnquiry({
      title: `Email: ${subject}`,
      clientName: sender.split('@')[0] || 'Unknown',
      clientEmail: sender,
      clientPhone: null,
      eventDate: null,
      venue: null,
      notes: `RAW EMAIL DATA:\n\nFrom: ${sender}\nTo: ${recipient}\nSubject: ${subject}\n\nMessage:\n${bodyText}\n\nAll webhook data:\n${JSON.stringify(body, null, 2)}`,
      userId: "43963086",
      status: 'new',
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Email received and enquiry created: ${enquiry.id} (${processingTime}ms)`);
    
    res.status(200).json({ 
      message: 'Email received and enquiry created',
      enquiryId: enquiry.id,
      from: sender,
      to: recipient,
      subject: subject,
      processingTime: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error processing email webhook:', error);
    
    res.status(500).json({ 
      message: 'Failed to process email',
      error: error.message,
      processingTime: processingTime
    });
  }
}