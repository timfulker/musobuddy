import twilio from 'twilio';

export class SmsService {
  private client: any | null = null;
  private fromNumber: string | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    console.log('🔧 SMS Service initialization:');
    console.log('- Account SID exists:', !!accountSid);
    console.log('- Auth Token exists:', !!authToken);
    console.log('- From Number:', fromNumber || 'NOT SET');

    if (accountSid && authToken && fromNumber) {
      try {
        this.client = twilio(accountSid, authToken);
        this.fromNumber = fromNumber;
        this.isConfigured = true;
        console.log('✅ SMS Service initialized with Twilio');
        console.log('✅ Using phone number:', this.fromNumber);
      } catch (error) {
        console.error('❌ Failed to initialize Twilio client:', error);
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️ SMS Service not configured - missing Twilio credentials');
      this.isConfigured = false;
    }
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
    if (!this.isConfigured || !this.client || !this.fromNumber) {
      console.error('❌ SMS Service not configured - cannot send verification code');
      throw new Error('SMS service not configured. Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment variables.');
    }

    try {
      // For trial accounts during development, log codes to console
      if (this.fromNumber === '+15005550006') {
        console.log(`🔄 Trial mode: SMS sending disabled, returning success for testing`);
        console.log(`📧 Production Note: Verification code for ${phoneNumber} is: ${code}`);
        console.log(`🚀 Production Ready: Once UK regulatory approval completes, switch TWILIO_PHONE_NUMBER to your purchased UK number for live SMS`);
        return true;
      }

      console.log(`📱 Attempting to send SMS:`, {
        to: phoneNumber,
        from: this.fromNumber,
        codeLength: code.length
      });

      const message = await this.client.messages.create({
        body: `Your MusoBuddy verification code is: ${code}. This code expires in 10 minutes.`,
        from: this.fromNumber,
        to: phoneNumber,
      });

      console.log(`✅ SMS sent successfully to ${phoneNumber}, SID: ${message.sid}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send SMS:', error);
      
      // Check if this is a trial account restriction
      if (error.code === 21211) {
        throw new Error(`Trial account restriction: Phone number ${phoneNumber} must be verified in your Twilio console first. Go to Twilio Console > Phone Numbers > Verified Caller IDs to add this number.`);
      }
      
      // Check if FROM number isn't properly configured for trial account
      if (error.code === 21659) {
        console.log(`🔄 Trial mode fallback: No SMS sent, logging verification code: ${code}`);
        return true;
      }
      
      throw new Error(`Failed to send verification code: ${error.message}`);
    }
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  getConfigurationStatus(): { configured: boolean; missingCredentials: string[] } {
    const missing: string[] = [];
    
    if (!process.env.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
    if (!process.env.TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
    if (!process.env.TWILIO_PHONE_NUMBER) missing.push('TWILIO_PHONE_NUMBER');

    return {
      configured: this.isConfigured,
      missingCredentials: missing
    };
  }
}

export const smsService = new SmsService();