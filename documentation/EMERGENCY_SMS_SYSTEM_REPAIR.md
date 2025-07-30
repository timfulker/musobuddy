# EMERGENCY SMS VERIFICATION SYSTEM REPAIR MANUAL

## Critical System Overview
SMS verification handles: Phone verification during signup → Code generation → Twilio delivery → Code validation → Account activation

## IMMEDIATE DIAGNOSIS CHECKLIST

### 1. Test SMS Sending
```bash
# Test SMS endpoint directly
curl -X POST http://localhost:5000/api/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+447700900123"}'
```

### 2. Check Environment Variables
```bash
# CRITICAL: These must be set in Replit Secrets
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

### 3. Verify Database Schema
```sql
-- Check phoneVerifications table exists
SELECT * FROM "phoneVerifications" LIMIT 1;

-- Check users table has phone verification fields
SELECT phone_number, phone_verified FROM users LIMIT 1;
```

## COMMON FAILURE POINTS & FIXES

### Issue 1: "SMS Sending Failed" - Twilio Configuration
**Symptoms**: 400/401 errors when sending SMS, "Authentication failed"
**Root Cause**: Incorrect Twilio credentials or phone number format

**EMERGENCY FIX**: Update `server/core/sms-service.ts`
```typescript
import twilio from 'twilio';

export class SMSService {
  private client: any;
  
  constructor() {
    // CRITICAL: Verify environment variables exist
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio configuration. Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
    }
    
    this.client = twilio(accountSid, authToken);
    console.log(`✅ SMS Service initialized with number: ${fromNumber}`);
  }
  
  async sendVerificationSMS(phoneNumber: string, verificationCode: string): Promise<boolean> {
    try {
      // CRITICAL: Normalize phone number to E.164 format
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      const message = await this.client.messages.create({
        body: `Your MusoBuddy verification code is: ${verificationCode}. This code expires in 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: normalizedPhone
      });
      
      console.log(`✅ SMS sent successfully: ${message.sid} to ${normalizedPhone}`);
      return true;
    } catch (error: any) {
      console.error('❌ SMS sending failed:', {
        error: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        phoneNumber: phoneNumber
      });
      return false;
    }
  }
  
  // CRITICAL: Phone number normalization
  private normalizePhoneNumber(phoneNumber: string): string {
    let normalized = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    
    // Handle UK numbers
    if (normalized.startsWith('44')) {
      return '+' + normalized;
    } else if (normalized.startsWith('07') || normalized.startsWith('7')) {
      return '+44' + normalized.substring(normalized.startsWith('07') ? 2 : 1);
    }
    
    // Handle US numbers
    if (normalized.length === 10) {
      return '+1' + normalized;
    }
    
    // Already includes country code
    if (normalized.startsWith('1') && normalized.length === 11) {
      return '+' + normalized;
    }
    
    // Default: assume it's correctly formatted
    return phoneNumber.startsWith('+') ? phoneNumber : '+' + normalized;
  }
}
```

### Issue 2: "Verification Code Invalid" - Database Storage
**Symptoms**: SMS received but code validation fails
**Root Cause**: Database storage or retrieval issues

**EMERGENCY FIX**: Update `server/core/storage.ts`
```typescript
async storeVerificationCode(phoneNumber: string, code: string): Promise<void> {
  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Delete any existing codes for this number
    await this.db.delete(phoneVerifications)
      .where(eq(phoneVerifications.phoneNumber, normalizedPhone));
    
    // Store new verification code
    await this.db.insert(phoneVerifications).values({
      phoneNumber: normalizedPhone,
      verificationCode: code,
      expiresAt,
      verified: false
    });
    
    console.log(`✅ Verification code stored for ${normalizedPhone}`);
  } catch (error: any) {
    console.error('❌ Failed to store verification code:', error);
    throw new Error('Database error storing verification code');
  }
}

async verifyPhoneCode(phoneNumber: string, code: string): Promise<boolean> {
  try {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Find active verification code
    const verification = await this.db.select()
      .from(phoneVerifications)
      .where(
        and(
          eq(phoneVerifications.phoneNumber, normalizedPhone),
          eq(phoneVerifications.verificationCode, code),
          eq(phoneVerifications.verified, false),
          gt(phoneVerifications.expiresAt, new Date())
        )
      )
      .limit(1);
    
    if (verification.length === 0) {
      console.log(`❌ Invalid or expired code for ${normalizedPhone}`);
      return false;
    }
    
    // Mark as verified
    await this.db.update(phoneVerifications)
      .set({ verified: true })
      .where(eq(phoneVerifications.id, verification[0].id));
    
    console.log(`✅ Phone verification successful for ${normalizedPhone}`);
    return true;
  } catch (error: any) {
    console.error('❌ Phone verification error:', error);
    return false;
  }
}
```

### Issue 3: "Phone Number Format" - International Support
**Symptoms**: Valid phone numbers rejected or SMS not delivered
**Root Cause**: Inconsistent phone number handling

**EMERGENCY FIX**: Create `server/core/phone-utils.ts`
```typescript
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // UK mobile numbers
  if (cleaned.match(/^(07\d{9}|7\d{9})$/)) {
    cleaned = cleaned.replace(/^0?7/, '447');
    return '+' + cleaned;
  }
  
  // UK landline numbers
  if (cleaned.match(/^(01\d{8,9}|02\d{8,9}|03\d{8,9})$/)) {
    cleaned = cleaned.replace(/^0/, '44');
    return '+' + cleaned;
  }
  
  // Already has country code
  if (cleaned.match(/^44\d{10}$/)) {
    return '+' + cleaned;
  }
  
  // US numbers
  if (cleaned.match(/^\d{10}$/)) {
    return '+1' + cleaned;
  }
  
  if (cleaned.match(/^1\d{10}$/)) {
    return '+' + cleaned;
  }
  
  // International format already
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  throw new Error(`Unsupported phone number format: ${phoneNumber}`);
}

export function validatePhoneNumber(phoneNumber: string): boolean {
  try {
    const normalized = normalizePhoneNumber(phoneNumber);
    return normalized.length >= 10 && normalized.startsWith('+');
  } catch {
    return false;
  }
}
```

## AUTHENTICATION ROUTES INTEGRATION

### Complete SMS Authentication Routes in `server/core/auth-rebuilt.ts`
```typescript
// SEND SMS VERIFICATION
app.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    // Validate phone number format
    const { validatePhoneNumber, normalizePhoneNumber } = await import('./phone-utils');
    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in database
    await storage.storeVerificationCode(phoneNumber, verificationCode);
    
    // Send via SMS in production, log in development
    if (process.env.NODE_ENV === 'production') {
      const { SMSService } = await import('./sms-service');
      const smsService = new SMSService();
      const sent = await smsService.sendVerificationSMS(phoneNumber, verificationCode);
      
      if (!sent) {
        return res.status(500).json({ error: 'Failed to send SMS' });
      }
    } else {
      console.log(`🔐 DEVELOPMENT SMS CODE: ${verificationCode} for ${phoneNumber}`);
    }
    
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error: any) {
    console.error('❌ SMS verification error:', error);
    res.status(500).json({ error: 'SMS sending failed' });
  }
});

// VERIFY SMS CODE
app.post('/api/auth/verify-phone', async (req, res) => {
  try {
    const { phoneNumber, verificationCode } = req.body;
    
    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({ error: 'Phone number and code required' });
    }
    
    // Verify code
    const isValid = await storage.verifyPhoneCode(phoneNumber, verificationCode);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }
    
    // Update user as phone verified
    if (req.session?.userId) {
      await storage.updateUser(req.session.userId, { 
        phoneVerified: true,
        phoneNumber: phoneNumber 
      });
      req.session.phoneVerified = true;
    }
    
    res.json({ success: true, message: 'Phone verified successfully' });
  } catch (error: any) {
    console.error('❌ Phone verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});
```

## DEBUGGING COMMANDS
```bash
# Test Twilio credentials
curl -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
  "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
  -d "From=$TWILIO_PHONE_NUMBER" \
  -d "To=+447700900123" \
  -d "Body=Test message"

# Check database verification codes
SELECT * FROM "phoneVerifications" ORDER BY "createdAt" DESC LIMIT 5;

# Test phone number normalization
node -e "
const { normalizePhoneNumber } = require('./server/core/phone-utils');
console.log(normalizePhoneNumber('07700900123'));
console.log(normalizePhoneNumber('+447700900123'));
"
```

## SUCCESS INDICATORS
- ✅ SMS sending returns 200 with success message
- ✅ SMS received on test phone within 1 minute
- ✅ Code verification returns 200 with success
- ✅ User marked as phone verified in database
- ✅ Authentication flow proceeds to dashboard