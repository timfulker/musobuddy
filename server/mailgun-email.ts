import formData from 'form-data';
import Mailgun from 'mailgun.js';

// Initialize Mailgun client
const mailgun = new Mailgun(formData);

// Email interface for type safety
interface EmailData {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

// Send email function
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    // Debug environment variables
    console.log('🔍 Checking Mailgun environment variables...');
    console.log('MAILGUN_API_KEY exists:', !!process.env.MAILGUN_API_KEY);
    console.log('MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN);
    
    // Check for required environment variables
    if (!process.env.MAILGUN_API_KEY) {
      console.error('❌ MAILGUN_API_KEY environment variable is required');
      return false;
    }

    // Use custom subdomain in production, sandbox for development
    const domain = process.env.MAILGUN_DOMAIN || 'mg.musobuddy.com';
    console.log('🌐 Using domain:', domain);
    
    // Create Mailgun client with EU endpoint
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net' // EU endpoint for better performance
    });

    // Prepare message data
    const messageData: any = {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text || '',
      html: emailData.html || ''
    };

    // Add reply-to if specified
    if (emailData.replyTo) {
      messageData['h:Reply-To'] = emailData.replyTo;
    }

    // Add attachments if specified
    if (emailData.attachments && emailData.attachments.length > 0) {
      messageData.attachment = emailData.attachments.map(att => ({
        data: Buffer.from(att.content, 'base64'),
        filename: att.filename,
        contentType: att.type
      }));
    }

    // Send email
    const result = await mg.messages.create(domain, messageData);
    
    console.log('✅ Email sent successfully:', result.id);
    console.log('📧 From:', emailData.from);
    console.log('📧 To:', emailData.to);
    console.log('📧 Subject:', emailData.subject);
    
    return true;
    
  } catch (error: any) {
    console.error('❌ Failed to send email:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

// Test function for sandbox testing
export async function testEmailSending(): Promise<void> {
  console.log('🧪 Testing Mailgun email sending...');
  
  const testEmail: EmailData = {
    to: 'test@example.com',
    from: 'MusoBuddy <noreply@sandbox-123.mailgun.org>',
    subject: 'Test Email from MusoBuddy',
    text: 'This is a test email to verify Mailgun integration.',
    html: '<h1>Test Email</h1><p>This is a test email to verify Mailgun integration.</p>'
  };

  const success = await sendEmail(testEmail);
  
  if (success) {
    console.log('✅ Email test passed!');
  } else {
    console.log('❌ Email test failed!');
  }
}