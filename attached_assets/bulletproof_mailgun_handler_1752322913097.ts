import { Request, Response } from 'express';
import { storage } from './storage';

// Safe object inspection utility
function safeInspect(obj: any, maxDepth = 2): string {
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'function') return '[Function]';
      if (value instanceof Date) return `[Date: ${value.toISOString()}]`;
      if (value === null) return '[null]';
      if (value === undefined) return '[undefined]';
      return value;
    }, 2);
  } catch (error) {
    return `[Inspection Error: ${error.message}]`;
  }
}

// Completely safe date conversion that never calls toISOString() unexpectedly
function safeDateConversion(input: any): Date | null {
  // Handle null/undefined immediately
  if (input === null || input === undefined || input === '') {
    return null;
  }

  // If already a Date object, validate it
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  // Handle string input
  if (typeof input === 'string') {
    try {
      const parsed = new Date(input);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }

  // Handle numeric timestamp
  if (typeof input === 'number') {
    try {
      // Handle both seconds and milliseconds
      const timestamp = input > 1000000000000 ? input : input * 1000;
      const parsed = new Date(timestamp);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }

  // For any other type, return null
  return null;
}

// Ultra-safe email extraction that never fails
function extractEmailData(body: any): {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
} {
  const safeGet = (obj: any, ...keys: string[]): string => {
    for (const key of keys) {
      if (obj && typeof obj[key] === 'string') {
        return obj[key];
      }
    }
    return '';
  };

  return {
    from: safeGet(body, 'sender', 'From', 'from'),
    to: safeGet(body, 'recipient', 'To', 'to'),
    subject: safeGet(body, 'subject', 'Subject'),
    text: safeGet(body, 'body-plain', 'stripped-text', 'text'),
    html: safeGet(body, 'body-html', 'stripped-html', 'html')
  };
}

// Safe enquiry data extraction
function extractEnquiryData(emailData: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): {
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  eventDate: Date | null;
  venue: string | null;
  eventType: string | null;
  notes: string;
} {
  const { from, subject, text, html } = emailData;
  const content = text || html || '';

  // Extract client email safely
  let clientEmail = from;
  try {
    const emailMatch = from.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      clientEmail = emailMatch[0];
    }
  } catch {
    // Keep original from value
  }

  // Extract client name safely
  let clientName = 'Unknown Client';
  try {
    // Try to extract from email content
    const namePatterns = [
      /(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        clientName = match[1].trim();
        break;
      }
    }
    
    // If no name found in content, try to extract from email header
    if (clientName === 'Unknown Client') {
      if (from.includes('<')) {
        const extracted = from.replace(/<[^>]+>/, '').trim().replace(/['"]/g, '');
        if (extracted && extracted !== from) {
          clientName = extracted;
        }
      } else {
        // Use part before @ as fallback
        const emailPart = clientEmail.split('@')[0];
        if (emailPart) {
          clientName = emailPart;
        }
      }
    }
  } catch {
    clientName = 'Unknown Client';
  }

  // Extract phone number safely
  let clientPhone: string | null = null;
  try {
    const phonePatterns = [
      /(?:phone|tel|mobile|call|contact).{0,20}?(\+?44\s?[0-9\s]{10,})/i,
      /(07\d{3}\s?\d{6})/,
      /(\d{5}\s?\d{6})/
    ];
    
    for (const pattern of phonePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        clientPhone = match[1].replace(/\s/g, '');
        break;
      }
    }
  } catch {
    // Keep null
  }

  // Extract event date safely - this is where the timestamp issue often occurs
  let eventDate: Date | null = null;
  try {
    const datePatterns = [
      /(?:on|for|date)\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
    ];
    
    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        // Use our safe date conversion
        eventDate = safeDateConversion(match[1]);
        if (eventDate) break;
      }
    }
  } catch {
    // Keep null
  }

  // Extract venue safely
  let venue: string | null = null;
  try {
    const venuePatterns = [
      /(?:at|venue|location|held at)\s+([A-Z][^.!?\n]*)/i,
      /(?:venue:)\s*([^.!?\n]+)/i
    ];
    
    for (const pattern of venuePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        venue = match[1].trim();
        break;
      }
    }
  } catch {
    // Keep null
  }

  // Determine event type safely
  let eventType: string | null = null;
  try {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('wedding')) eventType = 'Wedding';
    else if (lowerContent.includes('birthday')) eventType = 'Birthday';
    else if (lowerContent.includes('corporate')) eventType = 'Corporate';
    else if (lowerContent.includes('party')) eventType = 'Party';
    else eventType = 'Performance';
  } catch {
    eventType = 'Performance';
  }

  // Create title safely
  const title = subject || `${eventType || 'Performance'} enquiry from ${clientName}`;

  return {
    title,
    clientName,
    clientEmail,
    clientPhone,
    eventDate,
    venue,
    eventType,
    notes: content || 'Email enquiry received'
  };
}

// Main webhook handler with comprehensive error handling
export async function handleMailgunWebhook(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('🚀 === BULLETPROOF MAILGUN WEBHOOK START ===');
    console.log('🚀 Timestamp:', new Date().toISOString());
    console.log('🚀 Processing time start:', startTime);
    
    // Step 1: Safely extract request data
    console.log('📥 Step 1: Extracting request data...');
    const requestBody = req.body || {};
    console.log('📥 Request method:', req.method);
    console.log('📥 Request headers:', safeInspect(req.headers));
    console.log('📥 Request body keys:', Object.keys(requestBody));
    console.log('📥 Request body size:', JSON.stringify(requestBody).length);

    // Step 2: Extract email data safely
    console.log('📧 Step 2: Extracting email data...');
    let emailData;
    try {
      emailData = extractEmailData(requestBody);
      console.log('📧 Email extraction successful');
      console.log('📧 From:', emailData.from);
      console.log('📧 To:', emailData.to);
      console.log('📧 Subject:', emailData.subject);
      console.log('📧 Text length:', emailData.text.length);
      console.log('📧 HTML length:', emailData.html.length);
    } catch (error) {
      console.error('📧 Email extraction failed:', error.message);
      throw new Error(`Email extraction failed: ${error.message}`);
    }

    // Step 3: Validate recipient
    console.log('✅ Step 3: Validating recipient...');
    if (!emailData.to.toLowerCase().includes('leads@musobuddy.com')) {
      console.log('✅ Email not for leads address, ignoring');
      return res.status(200).json({ 
        message: 'Email ignored - not for leads',
        recipient: emailData.to
      });
    }
    console.log('✅ Recipient validation passed');

    // Step 4: Extract enquiry data safely
    console.log('📋 Step 4: Extracting enquiry data...');
    let enquiryData;
    try {
      enquiryData = extractEnquiryData(emailData);
      console.log('📋 Enquiry extraction successful');
      console.log('📋 Title:', enquiryData.title);
      console.log('📋 Client name:', enquiryData.clientName);
      console.log('📋 Client email:', enquiryData.clientEmail);
      console.log('📋 Client phone:', enquiryData.clientPhone);
      console.log('📋 Event date:', enquiryData.eventDate ? enquiryData.eventDate.toISOString() : 'null');
      console.log('📋 Venue:', enquiryData.venue);
      console.log('📋 Event type:', enquiryData.eventType);
    } catch (error) {
      console.error('📋 Enquiry extraction failed:', error.message);
      throw new Error(`Enquiry extraction failed: ${error.message}`);
    }

    // Step 5: Create database enquiry
    console.log('💾 Step 5: Creating database enquiry...');
    const userId = '43963086'; // Your user ID
    
    try {
      // Prepare data for storage with explicit type safety
      const storageData = {
        userId,
        title: enquiryData.title,
        clientName: enquiryData.clientName,
        clientEmail: enquiryData.clientEmail,
        clientPhone: enquiryData.clientPhone,
        eventDate: enquiryData.eventDate, // This is either a Date object or null
        venue: enquiryData.venue,
        eventType: enquiryData.eventType,
        notes: enquiryData.notes,
        status: 'new' as const
      };

      console.log('💾 Storage data prepared');
      console.log('💾 EventDate type:', typeof storageData.eventDate);
      console.log('💾 EventDate instanceof Date:', storageData.eventDate instanceof Date);

      const enquiry = await storage.createEnquiry(storageData);
      
      console.log('💾 Database enquiry created successfully');
      console.log('💾 Enquiry ID:', enquiry.id);

      const processingTime = Date.now() - startTime;
      console.log('✅ === WEBHOOK SUCCESS ===');
      console.log('✅ Processing time:', processingTime + 'ms');
      console.log('✅ Enquiry created:', enquiry.id);

      res.status(200).json({
        message: 'Email processed successfully',
        enquiryId: enquiry.id,
        subject: emailData.subject,
        from: emailData.from,
        processingTime: processingTime + 'ms'
      });

    } catch (storageError) {
      console.error('💾 Storage error:', storageError.message);
      console.error('💾 Storage error stack:', storageError.stack);
      throw new Error(`Storage failed: ${storageError.message}`);
    }

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ === WEBHOOK ERROR ===');
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Processing time:', processingTime + 'ms');
    console.error('❌ Request body that caused error:', safeInspect(req.body));

    // Check specifically for toISOString errors
    if (error.message && error.message.includes('toISOString')) {
      console.error('❌ 🔍 FOUND toISOString ERROR - This indicates a date handling issue');
      console.error('❌ 🔍 Check if any Date objects are being called incorrectly');
    }

    res.status(500).json({
      error: 'Failed to process webhook',
      details: error.message,
      timestamp: new Date().toISOString(),
      processingTime: processingTime + 'ms'
    });
  }
}