// COMPLETELY REBUILT AUTHENTICATION SYSTEM - CLEANED UP
import { type Express } from "express";
import { storage } from "./storage.js";
import { ENV } from './environment.js';

/**
 * REBUILT AUTHENTICATION MIDDLEWARE
 * Clean, simple authentication check
 */
export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// PHONE NUMBER FORMATTING FUNCTION
function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  console.log('📞 Phone formatting:', {
    original: phone,
    digitsOnly: digits,
    length: digits.length
  });
  
  // Handle UK phone numbers specifically
  if (digits.startsWith('44')) {
    const formatted = '+' + digits;
    console.log('📞 Already has UK country code:', formatted);
    return formatted;
  } else if (digits.startsWith('0')) {
    const formatted = '+44' + digits.substring(1);
    console.log('📞 UK number with leading 0:', formatted);
    return formatted;
  } else if (digits.startsWith('7') && digits.length === 11) {
    const formatted = '+44' + digits;
    console.log('📞 UK mobile without 0:', formatted);
    return formatted;
  }
  
  // Default: assume UK and add +44
  const formatted = '+44' + digits;
  console.log('📞 Default UK formatting:', formatted);
  return formatted;
}

// ENHANCED SMS SENDING FUNCTION WITH DETAILED ERROR CAPTURE
async function sendVerificationSMS(phoneNumber: string, verificationCode: string) {
  const isProduction = ENV.isProduction || process.env.REPLIT_DEPLOYMENT;
  
  console.log('🔍 SMS ATTEMPT - FULL DEBUG INFO:', {
    timestamp: new Date().toISOString(),
    phoneNumber: phoneNumber,
    formattedPhone: formatPhoneNumber(phoneNumber),
    verificationCodeLength: verificationCode.length,
    environment: {
      isProduction,
      NODE_ENV: process.env.NODE_ENV,
      REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT
    },
    twilioConfig: {
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
      fromNumber: process.env.TWILIO_PHONE_NUMBER,
      accountSidPrefix: process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) + '...' || 'MISSING'
    }
  });
  
  if (isProduction && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      console.log('📱 ATTEMPTING TWILIO SMS...');
      
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      console.log('📱 Twilio API call parameters:', {
        to: formattedPhone,
        from: process.env.TWILIO_PHONE_NUMBER,
        messageLength: `Your MusoBuddy verification code is: ${verificationCode}`.length
      });
      
      const message = await twilio.messages.create({
        body: `Your MusoBuddy verification code is: ${verificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });
      
      console.log('✅ SMS SENT SUCCESSFULLY:', {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        dateCreated: message.dateCreated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      });
      
      return {
        success: true,
        message: 'Verification code sent to your phone',
        showCode: false
      };
      
    } catch (smsError: any) {
      console.log('❌ TWILIO ERROR - COMPLETE DETAILS:');
      console.log('❌ Error Code:', smsError.code);
      console.log('❌ Error Message:', smsError.message);
      console.log('❌ More Info URL:', smsError.moreInfo);
      console.log('❌ Status Code:', smsError.status);
      console.log('❌ Request ID:', smsError.requestId);
      console.log('❌ Full Error Object:', JSON.stringify(smsError, null, 2));
      
      // Specific error handling
      let errorMessage = 'SMS delivery failed';
      
      switch (smsError.code) {
        case 21211:
          errorMessage = `Invalid phone number format: ${phoneNumber}`;
          console.log('🔍 Phone number format issue. Original:', phoneNumber, 'Formatted:', formatPhoneNumber(phoneNumber));
          break;
        case 21214:
          errorMessage = 'Phone number is not a mobile number';
          break;
        case 21408:
          errorMessage = 'SMS permissions not enabled for this Twilio account';
          break;
        case 21610:
          errorMessage = 'Phone number not verified in Twilio console (Trial account restriction)';
          console.log('🔍 TRIAL ACCOUNT: Add', formatPhoneNumber(phoneNumber), 'to verified numbers in Twilio Console');
          break;
        case 20003:
          errorMessage = 'Authentication failed - check Twilio credentials';
          break;
        case 21606:
          errorMessage = 'Phone number is not currently reachable via SMS';
          break;
        default:
          errorMessage = `Twilio API Error (${smsError.code}): ${smsError.message}`;
      }
      
      return {
        success: false,
        message: errorMessage,
        showCode: true,
        tempMessage: `SMS failed (${smsError.code}): ${errorMessage} - Use code: ${verificationCode}`,
        twilioError: {
          code: smsError.code,
          message: smsError.message,
          moreInfo: smsError.moreInfo
        }
      };
    }
  } else {
    console.log('📱 Development mode or missing credentials');
    
    return {
      success: true,
      message: 'Development mode - use code below',
      showCode: true,
      tempMessage: `Development mode - use code: ${verificationCode}`
    };
  }
}

export function setupAuthRoutes(app: Express) {
  console.log('🔐 Setting up cleaned authentication routes...');

  // DEBUG ENDPOINTS - temporary for SMS configuration testing
  app.get('/api/debug/sms-config', (req: any, res) => {
    const config = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
        ENV_isProduction: ENV.isProduction,
        ENV_isDevelopment: ENV.isDevelopment
      },
      twilio: {
        hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER // Remove this in production!
      },
      shouldSendSMS: ENV.isProduction && 
                     !!process.env.TWILIO_ACCOUNT_SID && 
                     !!process.env.TWILIO_AUTH_TOKEN && 
                     !!process.env.TWILIO_PHONE_NUMBER
    };
    
    console.log('🔍 SMS Configuration Debug:', config);
    res.json(config);
  });

  // TEST SMS ENDPOINT - force send SMS for testing
  app.post('/api/debug/test-sms', async (req: any, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number required' });
      }
      
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log('🧪 TESTING SMS SEND - Force production mode');
      
      // Force SMS send regardless of environment
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          
          const formattedPhone = formatPhoneNumber(phoneNumber);
          
          console.log('📱 Test SMS attempt:', {
            original: phoneNumber,
            formatted: formattedPhone,
            from: process.env.TWILIO_PHONE_NUMBER,
            code: testCode
          });
          
          const message = await twilio.messages.create({
            body: `MusoBuddy TEST: Your verification code is: ${testCode}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
          });
          
          console.log('✅ TEST SMS sent successfully:', {
            sid: message.sid,
            status: message.status,
            to: message.to,
            from: message.from
          });
          
          res.json({
            success: true,
            message: 'Test SMS sent successfully',
            sid: message.sid,
            testCode: testCode,
            formattedPhone: formattedPhone
          });
          
        } catch (smsError: any) {
          console.error('❌ TEST SMS failed:', smsError);
          console.error('❌ Error Details:', {
            code: smsError.code,
            message: smsError.message,
            moreInfo: smsError.moreInfo
          });
          
          res.status(500).json({
            success: false,
            error: 'SMS test failed',
            details: {
              code: smsError.code,
              message: smsError.message,
              moreInfo: smsError.moreInfo
            }
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: 'Twilio credentials not configured'
        });
      }
      
    } catch (error) {
      console.error('❌ Test SMS endpoint error:', error);
      res.status(500).json({ error: 'Test failed' });
    }
  });

  // LOGIN ENDPOINT
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      
      console.log('🔐 Login attempt for:', email);
      
      // Check for admin login first
      if (email === 'timfulker@gmail.com' && password === 'admin123') {
        req.session.userId = '43963086';
        req.session.email = email;
        req.session.isAdmin = true;
        req.session.phoneVerified = true;
        
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
        
        console.log('✅ Admin login successful');
        
        return res.json({
          success: true,
          user: {
            id: req.session.userId,
            email: email,
            isAdmin: true,
            tier: 'admin',
            phoneVerified: true
          }
        });
      }
      
      // Regular user login
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      // Check if phone verification is required
      if (!user.phoneVerified) {
        console.log('📱 Phone verification required for:', email);
        
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        req.session.verificationCode = verificationCode;
        req.session.pendingUserId = user;
        
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
        
        const smsResult = await sendVerificationSMS(user.phoneNumber || '', verificationCode);
        
        return res.json({
          requiresVerification: true,
          phoneNumber: user.phoneNumber,
          message: smsResult.message,
          ...(smsResult.showCode && { verificationCode, tempMessage: smsResult.tempMessage })
        });
      }
      
      // Phone already verified - complete login
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.isAdmin = user.tier === 'admin';
      req.session.phoneVerified = true;
      
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      console.log('✅ Login successful for:', email);
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // GET CURRENT USER
  app.get('/api/auth/user', (req: any, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
      id: req.session.userId,
      email: req.session.email,
      isAdmin: req.session.isAdmin || false,
      tier: 'admin',
      phoneVerified: req.session.phoneVerified || false
    });
  });

  // LOGOUT
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // SIGNUP ENDPOINT - SINGLE DEFINITION
  app.post('/api/auth/signup', async (req: any, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, password } = req.body;
      
      console.log('📝 Signup attempt for:', email);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      // Validate required fields
      if (!firstName || !lastName || !email || !phoneNumber || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      // Create new user
      const userId = await storage.createUser({
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber.replace(/\s+/g, ''), // Remove spaces
        password,
        phoneVerified: false,
        isSubscribed: false
      });
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification in session
      req.session.userId = userId;
      req.session.email = email;
      req.session.verificationCode = verificationCode;
      req.session.phoneNumber = phoneNumber;
      
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      // Use consolidated SMS sending function
      const smsResult = await sendVerificationSMS(phoneNumber, verificationCode);
      
      console.log('✅ Signup successful, SMS result:', smsResult.success);
      
      res.json({
        success: true,
        userId,
        message: smsResult.message,
        ...(smsResult.showCode && { verificationCode, tempMessage: smsResult.tempMessage })
      });
      
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      res.status(500).json({ error: 'Signup failed' });
    }
  });

  // PHONE VERIFICATION ENDPOINT - SINGLE DEFINITION
  app.post('/api/auth/verify', async (req: any, res) => {
    try {
      const { verificationCode } = req.body;
      const sessionCode = req.session?.verificationCode;
      const userId = req.session?.userId;
      const email = req.session?.email;
      
      console.log('📱 Verification attempt:', { userId, providedCode: verificationCode, sessionCode });
      
      if (!userId || !sessionCode) {
        return res.status(400).json({ error: 'No verification session found' });
      }
      
      if (verificationCode !== sessionCode) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }
      
      // Update user as phone verified
      await storage.updateUser(userId, { phoneVerified: true });
      
      // Update session
      req.session.phoneVerified = true;
      
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      console.log('✅ Phone verification successful for:', email);
      
      res.json({
        success: true,
        message: 'Phone verified successfully',
        user: {
          id: userId,
          email,
          phoneVerified: true
        }
      });
      
    } catch (error: any) {
      console.error('❌ Verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // RESEND VERIFICATION CODE ENDPOINT
  app.post('/api/auth/resend-verification', async (req: any, res) => {
    try {
      const sessionUserId = req.session?.userId;
      const sessionCode = req.session?.verificationCode;
      
      console.log('🔄 Resend verification attempt:', {
        sessionUserId: sessionUserId,
        hasSessionCode: !!sessionCode
      });
      
      if (!sessionUserId) {
        return res.status(400).json({ error: 'No user session found' });
      }
      
      // Get user details
      const user = await storage.getUserById(sessionUserId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Generate new verification code
      const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Update session with new code
      req.session.verificationCode = newVerificationCode;
      
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      console.log('📱 Resending verification code to:', user.phoneNumber || 'N/A');
      
      // Use the consolidated SMS sending function
      const smsResult = await sendVerificationSMS(user.phoneNumber || '', newVerificationCode);
      
      res.json({
        success: true,
        message: smsResult.message,
        ...(smsResult.showCode && { 
          verificationCode: newVerificationCode, 
          tempMessage: smsResult.tempMessage 
        })
      });
      
    } catch (error: any) {
      console.error('❌ Resend verification error:', error);
      res.status(500).json({ error: 'Failed to resend verification code' });
    }
  });

  // START TRIAL ENDPOINT
  app.post('/api/auth/start-trial', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        console.log('❌ No userId in session for start-trial');
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('🚀 Backend: Starting trial for userId:', userId);
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (!user.phoneVerified) {
        return res.status(400).json({ error: 'Phone verification required' });
      }

      console.log('📋 Backend: User found and verified, creating checkout session...');

      // For now, just redirect to pricing - Stripe integration can be added later
      res.json({
        success: true,
        redirectUrl: '/pricing'
      });
      
    } catch (error: any) {
      console.error('❌ Start trial error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // SESSION RESTORATION
  app.post('/api/auth/restore-session', async (req: any, res) => {
    try {
      console.log('🔄 Session restoration attempt:', {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        userId: req.session?.userId
      });

      if (req.session?.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          console.log('✅ Session already valid for user:', user.email);
          return res.json({ 
            success: true, 
            message: 'Session already valid',
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName
            }
          });
        }
      }

      console.log('❌ No valid session found for restoration');
      res.status(401).json({ success: false, error: 'No session to restore' });
      
    } catch (error: any) {
      console.error('❌ Session restoration error:', error);
      res.status(500).json({ success: false, error: 'Session restoration failed' });
    }
  });

  console.log('✅ Cleaned authentication routes configured');
}