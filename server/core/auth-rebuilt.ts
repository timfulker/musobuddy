// COMPLETELY REBUILT AUTHENTICATION SYSTEM
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
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('44')) {
    return '+' + digits;
  } else if (digits.startsWith('0')) {
    return '+44' + digits.substring(1);
  } else if (digits.startsWith('7') && digits.length === 11) {
    return '+44' + digits;
  }
  
  return '+44' + digits;
}

// FIXED SMS FUNCTION FOR ES MODULES
async function sendVerificationSMS(phoneNumber: string, verificationCode: string) {
  const isProduction = ENV.isProduction || process.env.REPLIT_DEPLOYMENT;
  
  console.log('🔍 SMS ATTEMPT:', {
    timestamp: new Date().toISOString(),
    phoneNumber: phoneNumber,
    formattedPhone: formatPhoneNumber(phoneNumber),
    environment: { isProduction },
    twilioConfig: {
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
      fromNumber: process.env.TWILIO_PHONE_NUMBER
    }
  });
  
  if (isProduction && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      console.log('📱 ATTEMPTING TWILIO SMS...');
      
      // FIXED: Use dynamic import instead of require()
      const { default: twilio } = await import('twilio');
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      console.log('📱 Twilio API call:', {
        to: formattedPhone,
        from: process.env.TWILIO_PHONE_NUMBER
      });
      
      const message = await twilioClient.messages.create({
        body: `Your MusoBuddy verification code is: ${verificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });
      
      console.log('✅ SMS SENT SUCCESSFULLY:', {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from
      });
      
      return {
        success: true,
        message: 'Verification code sent to your phone',
        showCode: false
      };
      
    } catch (smsError: any) {
      console.log('❌ TWILIO ERROR:', {
        code: smsError.code,
        message: smsError.message,
        moreInfo: smsError.moreInfo,
        status: smsError.status
      });
      
      return {
        success: false,
        message: `SMS failed (${smsError.code}): ${smsError.message}`,
        showCode: true,
        tempMessage: `SMS failed - use code: ${verificationCode}`
      };
    }
  } else {
    console.log('📱 Development mode - showing code');
    return {
      success: true,
      message: 'Development mode - use code below',
      showCode: true,
      tempMessage: `Development mode - use code: ${verificationCode}`
    };
  }
}

export function setupAuthRoutes(app: Express) {
  console.log('🔐 Setting up authentication routes...');

  // DEBUG ENDPOINTS
  app.get('/api/debug/sms-config', (req: any, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
        ENV_isProduction: ENV.isProduction
      },
      twilio: {
        hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
      },
      shouldSendSMS: ENV.isProduction && !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_PHONE_NUMBER
    });
  });

  app.post('/api/debug/test-sms', async (req: any, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number required' });
      }
      
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('🧪 Testing SMS to:', phoneNumber);
      
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
          // FIXED: Use dynamic import instead of require()
          const { default: twilio } = await import('twilio');
          const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          
          const formattedPhone = formatPhoneNumber(phoneNumber);
          
          const message = await twilioClient.messages.create({
            body: `MusoBuddy TEST: ${testCode}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
          });
          
          res.json({
            success: true,
            sid: message.sid,
            testCode: testCode,
            formattedPhone: formattedPhone
          });
        } catch (smsError: any) {
          res.status(500).json({
            success: false,
            error: smsError.message,
            code: smsError.code,
            details: smsError.moreInfo
          });
        }
      } else {
        res.status(500).json({ error: 'Twilio not configured' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Test failed' });
    }
  });

  // LOGIN
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      
      console.log('🔐 Login attempt for:', email);
      
      // Admin login
      if (email === 'timfulker@gmail.com' && password === 'admin123') {
        req.session.userId = '43963086';
        req.session.email = email;
        req.session.isAdmin = true;
        req.session.phoneVerified = true;
        
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => err ? reject(err) : resolve(true));
        });
        
        return res.json({
          success: true,
          user: { id: req.session.userId, email, isAdmin: true, phoneVerified: true }
        });
      }
      
      // Regular user login
      const user = await storage.authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      if (!user.phoneVerified) {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        req.session.verificationCode = verificationCode;
        req.session.pendingUserId = user;
        
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => err ? reject(err) : resolve(true));
        });
        
        const smsResult = await sendVerificationSMS(user.phoneNumber || '', verificationCode);
        
        return res.json({
          requiresVerification: true,
          phoneNumber: user.phoneNumber,
          message: smsResult.message,
          ...(smsResult.showCode && { verificationCode, tempMessage: smsResult.tempMessage })
        });
      }
      
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.phoneVerified = true;
      
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => err ? reject(err) : resolve(true));
      });
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // GET USER - WITH DATABASE VALIDATION
  app.get('/api/auth/user', async (req: any, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      // CRITICAL SECURITY FIX: Validate user still exists in database
      const user = await storage.getUserById(req.session.userId);
      
      if (!user) {
        console.log(`❌ User ${req.session.userId} no longer exists - clearing session`);
        req.session.destroy((err: any) => {
          if (err) console.error('Session destroy error:', err);
        });
        return res.status(401).json({ error: 'User account no longer exists' });
      }
      
      res.json({
        id: req.session.userId,
        email: req.session.email,
        isAdmin: req.session.isAdmin || false,
        phoneVerified: req.session.phoneVerified || false,
        isSubscribed: user.isSubscribed || false,
        isLifetime: user.isLifetime || false
      });
    } catch (error: any) {
      console.error('❌ User validation error:', error);
      res.status(500).json({ error: 'Authentication validation failed' });
    }
  });

  // LOGOUT
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) return res.status(500).json({ error: 'Logout failed' });
      res.json({ success: true });
    });
  });

  // SIGNUP - SINGLE DEFINITION
  app.post('/api/auth/signup', async (req: any, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, password } = req.body;
      
      console.log('📝 Signup attempt for:', email);
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      if (!firstName || !lastName || !email || !phoneNumber || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber.replace(/\s+/g, ''),
        password,
        phoneVerified: false,
        isSubscribed: false
      });
      
      const userId = newUser.id; // Extract just the ID string
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      req.session.userId = userId;
      req.session.email = email;
      req.session.verificationCode = verificationCode;
      req.session.phoneNumber = phoneNumber;
      
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => err ? reject(err) : resolve(true));
      });
      
      const smsResult = await sendVerificationSMS(phoneNumber, verificationCode);
      
      res.json({
        success: true,
        userId: newUser,
        message: smsResult.message,
        ...(smsResult.showCode && { verificationCode, tempMessage: smsResult.tempMessage })
      });
      
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      res.status(500).json({ error: 'Signup failed' });
    }
  });

  // VERIFY - SINGLE DEFINITION
  app.post('/api/auth/verify', async (req: any, res) => {
    try {
      const { verificationCode } = req.body;
      const sessionCode = req.session?.verificationCode;
      const sessionUserId = req.session?.userId;
      const email = req.session?.email;
      
      // Extract just the ID string if userId is an object
      const userId = typeof sessionUserId === 'object' && sessionUserId?.id ? sessionUserId.id : sessionUserId;
      
      console.log('📱 Verification attempt:', { sessionUserId, extractedUserId: userId, providedCode: verificationCode, sessionCode });
      
      if (!userId || !sessionCode) {
        return res.status(400).json({ error: 'No verification session found' });
      }
      
      if (verificationCode !== sessionCode) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }
      
      await storage.updateUser(userId, { phoneVerified: true });
      req.session.phoneVerified = true;
      
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => err ? reject(err) : resolve(true));
      });
      
      res.json({
        success: true,
        message: 'Phone verified successfully',
        user: { id: userId, email, phoneVerified: true }
      });
      
    } catch (error: any) {
      console.error('❌ Verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // RESEND VERIFICATION - MISSING ENDPOINT THAT CAUSES 404
  app.post('/api/auth/resend-verification', async (req: any, res) => {
    try {
      const sessionUserId = req.session?.userId;
      
      if (!sessionUserId) {
        return res.status(400).json({ error: 'No user session found' });
      }
      
      const user = await storage.getUserById(sessionUserId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      req.session.verificationCode = newVerificationCode;
      
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => err ? reject(err) : resolve(true));
      });
      
      const smsResult = await sendVerificationSMS(user.phoneNumber || '', newVerificationCode);
      
      res.json({
        success: true,
        message: smsResult.message,
        ...(smsResult.showCode && { verificationCode: newVerificationCode, tempMessage: smsResult.tempMessage })
      });
      
    } catch (error: any) {
      console.error('❌ Resend verification error:', error);
      res.status(500).json({ error: 'Failed to resend verification code' });
    }
  });

  // START TRIAL
  app.post('/api/auth/start-trial', async (req: any, res) => {
    try {
      const sessionUserId = req.session?.userId;
      const email = req.session?.email;
      
      // Extract just the ID string if userId is an object
      const userId = typeof sessionUserId === 'object' && sessionUserId?.id ? sessionUserId.id : sessionUserId;
      
      console.log('🎯 Start trial attempt:', {
        sessionUserId,
        extractedUserId: userId,
        email,
        hasSession: !!req.session,
        sessionKeys: req.session ? Object.keys(req.session) : []
      });
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        console.error('❌ User not found in database:', { userId, email });
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (!user.phoneVerified) {
        return res.status(400).json({ error: 'Phone verification required' });
      }

      console.log('✅ Creating Stripe checkout session for user:', user.email);
      
      // Create Stripe checkout session for trial
      const { StripeService } = await import('./stripe-service.js');
      const stripeService = new StripeService();
      
      const priceId = 'price_1RouBwD9Bo26CG1DAF1rkSZI'; // Core monthly price
      const session = await stripeService.createTrialCheckoutSession(userId, priceId);
      
      console.log('✅ Checkout session created:', session.sessionId);
      res.json({
        success: true,
        checkoutUrl: session.checkoutUrl,
        sessionId: session.sessionId
      });
      
    } catch (error: any) {
      console.error('❌ Start trial error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // SESSION RESTORATION
  app.post('/api/auth/restore-session', async (req: any, res) => {
    try {
      if (req.session?.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          return res.json({ 
            success: true, 
            user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
          });
        }
      }
      res.status(401).json({ success: false, error: 'No session to restore' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Session restoration failed' });
    }
  });

  console.log('✅ Authentication routes configured');
}