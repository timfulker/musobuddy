/**
 * Email Parsing Service for MusoBuddy
 * Extracts booking enquiry information from forwarded emails
 */

interface ParsedEnquiry {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  eventDate?: Date;
  venue?: string;
  message: string;
  title: string;
}

/**
 * Parse email enquiry and extract key booking information
 */
export async function parseEmailEnquiry(
  from: string, 
  subject: string, 
  body: string
): Promise<ParsedEnquiry> {
  const parsedData: ParsedEnquiry = {
    clientName: extractClientName(from, body),
    clientEmail: extractEmail(from, body),
    clientPhone: extractPhone(body),
    eventDate: extractEventDate(body),
    venue: extractVenue(body),
    message: cleanEmailBody(body),
    title: subject || "Email Enquiry"
  };

  return parsedData;
}

/**
 * Extract client name from email sender or body
 */
function extractClientName(from: string, body: string): string {
  // Try to extract name from email sender
  const nameMatch = from.match(/^([^<]+?)\s*<.*>$/);
  if (nameMatch && nameMatch[1].trim()) {
    return nameMatch[1].trim();
  }

  // Try to extract name from email address
  const emailMatch = from.match(/<([^@]+)@/);
  if (emailMatch) {
    return emailMatch[1].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Try to find name patterns in body
  const namePatterns = [
    /my name is ([a-zA-Z\s]+)/i,
    /i'm ([a-zA-Z\s]+)/i,
    /this is ([a-zA-Z\s]+)/i,
    /from ([a-zA-Z\s]+)/i
  ];

  for (const pattern of namePatterns) {
    const match = body.match(pattern);
    if (match && match[1].length < 50) {
      return match[1].trim();
    }
  }

  return from.split('@')[0] || 'Unknown Client';
}

/**
 * Extract email address from sender or body
 */
function extractEmail(from: string, body: string): string | undefined {
  // Extract from sender
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    return emailMatch[1];
  }

  // Look for additional email in body
  const bodyEmailMatch = body.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return bodyEmailMatch ? bodyEmailMatch[1] : undefined;
}

/**
 * Extract phone number from email body
 */
function extractPhone(body: string): string | undefined {
  const phonePatterns = [
    // UK formats
    /(\+44\s?7\d{3}\s?\d{3}\s?\d{3})/,
    /(07\d{3}\s?\d{3}\s?\d{3})/,
    /(\+44\s?\d{4}\s?\d{3}\s?\d{3})/,
    /(0\d{4}\s?\d{3}\s?\d{3})/,
    // General formats
    /(\+\d{1,3}\s?\d{3,4}\s?\d{3}\s?\d{3,4})/,
    /(\d{3,4}[-.\s]?\d{3}[-.\s]?\d{3,4})/
  ];

  for (const pattern of phonePatterns) {
    const match = body.match(pattern);
    if (match) {
      return match[1].replace(/\s+/g, ' ').trim();
    }
  }

  return undefined;
}

/**
 * Extract event date from email body
 */
function extractEventDate(body: string): Date | undefined {
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
    // Month DD, YYYY
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i,
    // DD Month YYYY
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
    // Next/this Saturday, Monday etc
    /(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  ];

  for (const pattern of datePatterns) {
    const match = body.match(pattern);
    if (match) {
      try {
        const dateStr = match[0];
        const parsedDate = new Date(dateStr);
        
        // Check if date is valid and in the future
        if (!isNaN(parsedDate.getTime()) && parsedDate > new Date()) {
          return parsedDate;
        }
      } catch (error) {
        continue;
      }
    }
  }

  return undefined;
}

/**
 * Extract venue from email body
 */
function extractVenue(body: string): string | undefined {
  const venuePatterns = [
    /at\s+([a-zA-Z\s\&\'\-]+(?:hall|centre|center|hotel|pub|club|venue|church|barn|manor|house|room))/i,
    /venue:?\s*([a-zA-Z\s\&\'\-]+)/i,
    /location:?\s*([a-zA-Z\s\&\'\-]+)/i,
    /held at\s+([a-zA-Z\s\&\'\-]+)/i
  ];

  for (const pattern of venuePatterns) {
    const match = body.match(pattern);
    if (match && match[1].length < 100) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Clean email body by removing headers, signatures, and formatting
 */
function cleanEmailBody(body: string): string {
  let cleaned = body;

  // Remove email headers
  cleaned = cleaned.replace(/^(From|To|Subject|Date|Sent):.*$/gm, '');
  
  // Remove forward/reply indicators
  cleaned = cleaned.replace(/^(>|\|).*/gm, '');
  cleaned = cleaned.replace(/On.*wrote:$/gm, '');
  cleaned = cleaned.replace(/-----Original Message-----/g, '');
  
  // Remove common email signatures
  cleaned = cleaned.replace(/--\s*\n[\s\S]*$/m, '');
  cleaned = cleaned.replace(/Best regards[\s\S]*$/im, '');
  cleaned = cleaned.replace(/Kind regards[\s\S]*$/im, '');
  cleaned = cleaned.replace(/Thanks[\s\S]*$/im, '');
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Webhook endpoint for email service providers (like SendGrid, Mailgun)
 * This would be called when emails are sent to leads@musobuddy.com
 */
export interface EmailWebhookPayload {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  timestamp: number;
}

export function processEmailWebhook(payload: EmailWebhookPayload): ParsedEnquiry {
  return parseEmailEnquiry(payload.from, payload.subject, payload.text);
}