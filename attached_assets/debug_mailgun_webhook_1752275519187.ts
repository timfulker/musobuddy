/**
 * DEBUG VERSION - Mailgun Webhook Handler
 * Logs everything and creates enquiries regardless of data format
 */

import type { Request, Response } from "express";
import { storage } from "./storage";

export async function handleMailgunWebhook(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 DEBUG WEBHOOK - PROCESSING EMAIL');
    console.log('📧 ALL REQUEST HEADERS:', JSON.stringify(req.headers, null, 2));
    console.log('📧 ALL REQUEST BODY:', JSON.stringify(req.body, null, 2));
    console.log('📧 REQUEST BODY KEYS:', Object.keys(req.body || {}));
    console.log('📧 REQUEST METHOD:', req.method);
    console.log('📧 REQUEST URL:', req.url);
    
    // Log every single field
    const body = req.body || {};
    for (const [key, value] of Object.entries(body)) {
      console.log(`📧 FIELD "${key}":`, typeof value, '=', value);
    }
    
    // Try to extract ANY email-like data
    const possibleRecipients = [
      body.recipient, body.to, body['To'], body.Recipient
    ].filter(x => x);
    
    const possibleSenders = [
      body.sender, body.from, body['From'], body.Sender
    ].filter(x => x);
    
    const possibleSubjects = [
      body.subject, body.Subject, body['subject']
    ].filter(x => x);
    
    const possibleBodies = [
      body['body-plain'], body.text, body.Text, body['body-html'], 
      body.html, body.Html, body.message, body.content
    ].filter(x => x);
    
    console.log('📧 POSSIBLE RECIPIENTS:', possibleRecipients);
    console.log('📧 POSSIBLE SENDERS:', possibleSenders);
    console.log('📧 POSSIBLE SUBJECTS:', possibleSubjects);
    console.log('📧 POSSIBLE BODIES (lengths):', possibleBodies.map(b => b?.length || 0));
    
    // Use first available values
    const emailRecipient = possibleRecipients[0] || 'leads@musobuddy.com';
    const emailSender = possibleSenders[0] || 'unknown@example.com';
    const emailSubject = possibleSubjects[0] || 'Debug Email';
    const emailBody = possibleBodies[0] || 'No content found';
    
    console.log('📧 FINAL VALUES USED:');
    console.log('  - Recipient:', emailRecipient);
    console.log('  - Sender:', emailSender);
    console.log('  - Subject:', emailSubject);
    console.log('  - Body length:', emailBody.length);
    
    // Extract client name from sender email
    const nameMatch = emailSender.match(/^([^@]+)@/);
    const clientName = nameMatch 
      ? nameMatch[1].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Debug Client';
    
    // ALWAYS create an enquiry to test
    const enquiry = await storage.createEnquiry({
      title: `[DEBUG] ${emailSubject}`,
      clientName: clientName,
      clientEmail: emailSender,
      clientPhone: null,
      eventDate: null,
      venue: null,
      notes: `DEBUG WEBHOOK DATA:\n\nRecipient: ${emailRecipient}\nSender: ${emailSender}\nSubject: ${emailSubject}\n\nBody:\n${emailBody}\n\nAll Fields:\n${JSON.stringify(body, null, 2)}`,
      userId: "43963086",
      status: 'new',
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ DEBUG: Created enquiry ${enquiry.id} (${processingTime}ms)`);
    
    res.status(200).json({ 
      message: 'DEBUG: Email data logged and enquiry created',
      enquiryId: enquiry.id,
      clientName: enquiry.clientName,
      processingTime: processingTime,
      debugInfo: {
        recipients: possibleRecipients,
        senders: possibleSenders,
        subjects: possibleSubjects,
        bodyLengths: possibleBodies.map(b => b?.length || 0)
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ DEBUG ERROR:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'DEBUG: Failed to process email',
      error: error.message,
      processingTime: processingTime
    });
  }
}