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
export function setupAuthRoutes(app: Express) {
  console.log('🔐 Setting up rebuilt authentication routes...');

  // Regular login endpoint
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      // For now, only allow admin credentials since admin route was removed
      if (email === 'timfulker@gmail.com' && password === 'admin123') {
        // Set session data
        req.session.userId = '43963086';
        req.session.email = email;
        req.session.isAdmin = true;
        req.session.phoneVerified = true;
        
        // Explicit session save
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
        
        console.log('✅ Login successful, session saved');
        
        res.json({
          success: true,
          user: {
            id: req.session.userId,
            email: email,
            isAdmin: true,
            tier: 'admin',
            phoneVerified: true
          }
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
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
      
      // Send SMS verification in production
      if (ENV.isProduction) {
        const { SMSService } = await import('./sms-service');
        const smsService = new SMSService();
        await smsService.sendVerificationCode(phoneNumber, verificationCode);
        
        console.log('✅ Signup successful, SMS sent to:', phoneNumber);
        res.json({
          success: true,
          userId,
          message: 'Please check your phone for verification code'
        });
      } else {
        // Development mode - return code for testing
        console.log('✅ Signup successful (dev mode), code:', verificationCode);
        res.json({
          success: true,
          userId,
          verificationCode,
          tempMessage: `Development mode - use code: ${verificationCode}`
        });
      }
      
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