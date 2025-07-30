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

/**
 * REBUILT AUTHENTICATION ROUTES
 * Simple, working authentication without complexity
 */
// CONSOLIDATED SMS SENDING FUNCTION
async function sendVerificationSMS(phoneNumber: string, verificationCode: string) {
  // Force production mode for testing - remove this line after testing
  const isProduction = true; // ENV.isProduction || process.env.REPLIT_DEPLOYMENT;
  
  console.log('🚨 SMS FUNCTION CALLED:', {
    phoneNumber,
    verificationCode,
    isProduction,
    timestamp: new Date().toISOString()
  });
  
  console.log('📱 SMS Config Check:', {
    isProduction,
    hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
    hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
    hasTwilioPhone: !!process.env.TWILIO_PHONE_NUMBER,
    twilioPhone: process.env.TWILIO_PHONE_NUMBER
  });
  
  console.log('🔍 Checking if we enter production SMS path...');
  
  if (isProduction && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      console.log('🔧 DEBUGGING: Creating Twilio client...');
      console.log('🔧 Account SID (first 10 chars):', process.env.TWILIO_ACCOUNT_SID?.substring(0, 10));
      console.log('🔧 Auth Token (first 10 chars):', process.env.TWILIO_AUTH_TOKEN?.substring(0, 10));
      
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      console.log('🔧 Twilio client created successfully');
      console.log('📱 Attempting SMS send:', {
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: 'Your MusoBuddy verification code is: [CODE]'
      });
      
      console.log('🔧 About to call twilio.messages.create...');
      
      const message = await twilio.messages.create({
        body: `Your MusoBuddy verification code is: ${verificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      
      console.log('🔧 twilio.messages.create completed successfully');
      
      console.log('✅ SMS sent successfully, SID:', message.sid);
      
      return {
        success: true,
        message: 'Verification code sent to your phone',
        showCode: false
      };
      
    } catch (smsError: any) {
      console.error('❌ SMS COMPREHENSIVE ERROR ANALYSIS:');
      console.error('❌ Error Object:', smsError);
      console.error('❌ Error Message:', smsError.message);
      console.error('❌ Error Code:', smsError.code);
      console.error('❌ Error Status:', smsError.status);
      console.error('❌ More Info:', smsError.moreInfo);
      console.error('❌ Details:', smsError.details);
      console.error('❌ Full JSON:', JSON.stringify(smsError, null, 2));
      
      // Fallback to showing code if SMS fails
      return {
        success: false,
        message: 'SMS failed - use code below',
        showCode: true,
        tempMessage: `SMS failed - use code: ${verificationCode}`,
        errorCode: smsError.code,
        errorMessage: smsError.message
      };
    }
  } else {
    // Development mode or missing credentials
    console.log('✅ Development mode or missing SMS credentials, showing code');
    
    return {
      success: true,
      message: 'Development mode - use code below',
      showCode: true,
      tempMessage: `Development mode - use code: ${verificationCode}`
    };
  }
}

export function setupAuthRoutes(app: Express) {
  console.log('🔐 Setting up rebuilt authentication routes...');

  // DEBUG ENDPOINT - temporary for SMS configuration testing
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

  // TEST SMS ENDPOINT - force send SMS in development for testing
  app.post('/api/debug/test-sms', async (req: any, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number required' });
      }
      
      const testCode = '123456';
      
      console.log('🧪 TESTING SMS SEND - Force production mode');
      
      // Force SMS send regardless of environment
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          
          console.log('📱 Test SMS attempt:', {
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            code: testCode
          });
          
          const message = await twilio.messages.create({
            body: `MusoBuddy TEST: Your verification code is: ${testCode}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          });
          
          console.log('✅ TEST SMS sent successfully, SID:', message.sid);
          
          res.json({
            success: true,
            message: 'Test SMS sent successfully',
            sid: message.sid,
            testCode: testCode
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

  // Regular login endpoint
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      
      console.log('🔐 Login attempt for:', email);
      
      // Check for admin login first
      if (email === 'timfulker@gmail.com' && password === 'admin123') {
        // Set admin session data
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
        
        // Generate new verification code for existing user
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store verification data in session
        req.session.verificationCode = verificationCode;
        req.session.pendingUserId = user;
        
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
        
        // Use consolidated SMS sending function
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

  // Get current user
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

  // Logout
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // SIGNUP ENDPOINT - restored for production
  app.post('/api/auth/signup', async (req: any, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, password } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName || !email || !phoneNumber || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      console.log('📝 Signup attempt for:', email);
      
      // Create user with phone verification pending
      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
        phoneVerified: false
      });
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification code in session
      req.session.verificationCode = verificationCode;
      req.session.pendingUserId = newUser;
      
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      // Check if we're in production environment
      const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT;
      
      if (isProduction && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        // Production: Send real SMS
        try {
          const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          
          await twilio.messages.create({
            body: `Your MusoBuddy verification code is: ${verificationCode}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          });
          
          console.log('✅ SMS sent to:', phoneNumber);
          
          res.json({
            success: true,
            userId: newUser,
            message: 'Verification code sent to your phone'
          });
          
        } catch (smsError) {
          console.error('❌ SMS failed:', smsError);
          // Fallback to showing code if SMS fails
          res.json({
            success: true,
            userId: newUser,
            verificationCode: verificationCode,
            tempMessage: 'SMS failed - use code: ' + verificationCode
          });
        }
      } else {
        // Development: Show code on screen
        console.log('✅ Signup successful (dev mode), code:', verificationCode);
        
        res.json({
          success: true,
          userId: newUser,
          verificationCode: verificationCode,
          tempMessage: 'Development mode - use code: ' + verificationCode
        });
      }
      
    } catch (error) {
      console.error('❌ Signup error:', error);
      res.status(500).json({ error: 'Signup failed' });
    }
  });

  // PHONE VERIFICATION ENDPOINT - restored for production
  app.post('/api/auth/verify', async (req: any, res) => {
    try {
      const { verificationCode } = req.body;
      
      if (!verificationCode) {
        return res.status(400).json({ error: 'Verification code required' });
      }
      
      const sessionCode = req.session.verificationCode;
      const pendingUserId = req.session.pendingUserId;
      
      console.log('📱 Verification attempt:', {
        userId: pendingUserId,
        providedCode: verificationCode,
        sessionCode: sessionCode
      });
      
      if (verificationCode === sessionCode && pendingUserId) {
        // Mark phone as verified
        await storage.updateUser(pendingUserId.id, { phoneVerified: true });
        
        // Set authenticated session
        req.session.userId = pendingUserId.id;
        req.session.email = pendingUserId.email;
        req.session.phoneVerified = true;
        
        // Clear verification data
        delete req.session.verificationCode;
        delete req.session.pendingUserId;
        
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
        
        console.log('✅ Phone verification successful for:', pendingUserId.email);
        
        res.json({
          success: true,
          message: 'Phone verified successfully',
          user: {
            id: pendingUserId,
            email: pendingUserId.email,
            phoneVerified: true
          }
        });
      } else {
        res.status(400).json({ error: 'Invalid verification code' });
      }
      
    } catch (error) {
      console.error('❌ Verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // TRIAL SETUP ENDPOINT
  app.post('/api/auth/start-trial', async (req: any, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log('🚀 Backend: Starting trial for userId:', userId);
      
      // For now, just redirect to pricing - Stripe integration can be added later
      res.json({
        success: true,
        redirectUrl: '/pricing'
      });
      
    } catch (error) {
      console.error('❌ Trial setup error:', error);
      res.status(500).json({ error: 'Trial setup failed' });
    }
  });

  // Session restoration - moved from routes.ts
  app.post('/api/auth/restore-session', async (req: any, res) => {
    try {
      console.log('🔄 Session restoration attempt:', {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        userId: req.session?.userId
      });

      // Check if session already exists and is valid
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

  // SIGNUP ENDPOINT - Create new user account
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
        phoneNumber: (phoneNumber || '').replace(/\s+/g, ''), // Remove spaces safely
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
      
      // Save session
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

  // VERIFICATION ENDPOINT - Verify phone number
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
      
      // Save session
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

  // Start trial route - moved from routes.ts
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

      const { StripeService } = await import('./stripe-service');
      const stripeService = new StripeService();
      
      const session = await stripeService.createTrialCheckoutSession(userId);
      
      console.log('✅ Backend: Checkout session created:', session.sessionId);
      res.json(session);
      
    } catch (error: any) {
      console.error('❌ Start trial error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  console.log('✅ Rebuilt authentication routes configured');
}