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

// Safe enquiry creation that eliminates timestamp conversion issues
async function createEnquirySafe(enquiryData: {
  userId: string;
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  eventDate: Date | null;
  venue: string | null;
  eventType: string | null;
  notes: string;
  status: string;
}): Promise<any> {
  console.log('🛡️ === SAFE ENQUIRY CREATION START ===');
  
  try {
    // Create a completely clean data object with explicit null handling
    const cleanData = {
      userId: String(enquiryData.userId),
      title: String(enquiryData.title || 'Email Enquiry'),
      clientName: String(enquiryData.clientName || 'Unknown Client'),
      clientEmail: enquiryData.clientEmail || null,
      clientPhone: enquiryData.clientPhone || null,
      eventDate: null as Date | null,
      eventTime: null as string | null,
      eventEndTime: null as string | null,
      performanceDuration: null as number | null,
      venue: enquiryData.venue || null,
      eventType: enquiryData.eventType || null,
      gigType: null as string | null,
      estimatedValue: null as string | null,
      status: enquiryData.status || 'new',
      notes: enquiryData.notes || null,
      responseNeeded: true,
      lastContactedAt: null as Date | null
    };

    // Handle eventDate with extreme care
    if (enquiryData.eventDate && enquiryData.eventDate instanceof Date) {
      // Verify the Date is valid before using it
      if (!isNaN(enquiryData.eventDate.getTime())) {
        cleanData.eventDate = enquiryData.eventDate;
        console.log('🛡️ Valid Date object assigned:', enquiryData.eventDate.toISOString());
      } else {
        console.log('🛡️ Invalid Date object, setting to null');
        cleanData.eventDate = null;
      }
    } else {
      console.log('🛡️ No valid Date object, setting eventDate to null');
      cleanData.eventDate = null;
    }

    console.log('🛡️ Clean data prepared for storage:', {
      ...cleanData,
      eventDate: cleanData.eventDate ? `Date(${cleanData.eventDate.toISOString()})` : 'null',
      notes: cleanData.notes ? `${cleanData.notes.substring(0, 50)}...` : 'null'
    });

    // Call storage with clean data
    console.log('🛡️ Calling storage.createEnquiry...');
    const result = await storage.createEnquiry(cleanData);
    
    console.log('🛡️ Storage creation successful!');
    console.log('🛡️ Created enquiry ID:', result.id);
    console.log('🛡️ === SAFE ENQUIRY CREATION END SUCCESS ===');
    
    return result;

  } catch (error: any) {
    console.error('🛡️ === SAFE ENQUIRY CREATION ERROR ===');
    console.error('🛡️ Error in safe storage wrapper:', error.message);
    console.error('🛡️ Error stack:', error.stack);
    console.error('🛡️ Input data that failed:', {
      userId: enquiryData.userId,
      title: enquiryData.title,
      clientName: enquiryData.clientName,
      eventDate: enquiryData.eventDate ? 
        (enquiryData.eventDate instanceof Date ? 
          `Date(${enquiryData.eventDate.toISOString()})` : 
          `Invalid: ${typeof enquiryData.eventDate}`) : 
        'null'
    });
    
    // Re-throw with more context
    throw new Error(`Safe storage creation failed: ${error.message}`);
  }
}

// DEPRECATED: Old webhook handler - DO NOT USE
export async function handleMailgunWebhook(req: Request, res: Response): Promise<void> {
  console.error('🚨 OLD HANDLER CALLED - THIS SHOULD NOT HAPPEN!');
  console.error('🚨 Request path:', req.path);
  console.error('🚨 Request method:', req.method);
  
  res.status(500).json({
    error: 'Old handler called',
    details: 'This old handler should not be called. Use the clean handler in index.ts instead.',
    path: req.path,
    method: req.method
  });
  
}