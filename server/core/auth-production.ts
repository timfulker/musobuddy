import { type Express } from "express";
import { storage } from "./storage";
import { db } from "./database";
import { users, phoneVerifications } from "../../shared/schema";
import { eq, desc, and, gte, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ENV, isProduction, getAppServerUrl } from "./environment";

export interface AuthRoutes {
  app: Express;
}

export class ProductionAuthSystem {
  private app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  private normalizePhoneNumber(phone: string): string {
    // Convert to international format consistently
    let normalized = phone.replace(/\s+/g, '');
    
    // Handle UK numbers
    if (normalized.startsWith('07')) {
      normalized = '+44' + normalized.slice(1);
    } else if (normalized.startsWith('447')) {
      normalized = '+' + normalized;
    }
    
    console.log('📱 Phone normalization:', { original: phone, normalized });
    return normalized;
  }

  public registerRoutes() {
    console.log('🔐 Registering production authentication routes...');

    // Enhanced auth check with detailed session debugging
    this.app.get('/api/auth/user', async (req: any, res) => {
      try {
        const userId = req.session?.userId;
        
        console.log('🔍 AUTH CHECK DEBUG:', {
          sessionId: req.sessionID,
          hasSession: !!req.session,
          sessionUserId: userId,
          sessionData: req.session,
          cookieHeader: req.headers.cookie,
          sessionStore: req.sessionStore ? 'available' : 'missing'
        });
        
        if (!userId) {
          console.log('❌ No session userId found - session details:', {
            sessionExists: !!req.session,
            sessionKeys: req.session ? Object.keys(req.session) : 'no session',
            sessionId: req.sessionID
          });
          return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await storage.getUserById(userId);
        if (!user) {
          console.log('❌ User not found for ID:', userId);
          req.session.destroy(() => {});
          return res.status(401).json({ error: 'User not found' });
        }

        console.log('✅ User authenticated successfully:', user.email);
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneVerified: user.phoneVerified,
          onboardingCompleted: user.onboardingCompleted || false,
          tier: user.tier || 'trial',
          isAdmin: user.isAdmin || false,
          isSubscribed: user.isSubscribed || false,
          isLifetime: user.isLifetime || false
        });
      } catch (error: any) {
        console.error('❌ Auth user error:', error);
        res.status(500).json({ error: 'Authentication failed' });
      }
    });

    // Admin login endpoint - always bypasses verification for admin users
    this.app.post('/api/auth/admin-login', async (req: any, res) => {
      const loginId = Date.now().toString();
      console.log(`🔐 [ADMIN-${loginId}] Login attempt:`, { 
        email: req.body.email,
        sessionId: req.sessionID 
      });
      
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user by email
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if user is admin
        if (!user.isAdmin) {
          return res.status(403).json({ error: 'Admin access required' });
        }

        // Check password
        const bcrypt = await import('bcrypt');
        const passwordValid = await bcrypt.compare(password, user.password || '');
        if (!passwordValid) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log(`✅ [ADMIN-${loginId}] Credentials validated for:`, email);

        // Set session data
        req.session.userId = user.id;
        req.session.isAdmin = true;
        req.session.adminLoginTime = new Date().toISOString();

        console.log(`📝 [ADMIN-${loginId}] Session data set:`, {
          userId: req.session.userId,
          isAdmin: req.session.isAdmin,
          sessionId: req.sessionID
        });

        // CRITICAL: Force session save and wait for completion
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              console.error(`❌ [ADMIN-${loginId}] Session save failed:`, err);
              reject(err);
            } else {
              console.log(`✅ [ADMIN-${loginId}] Session saved successfully - userId: ${req.session.userId}`);
              resolve(true);
            }
          });
        });

        // Verify session was saved by reading it back
        console.log(`🔍 [ADMIN-${loginId}] Session verification:`, {
          sessionUserId: req.session.userId,
          sessionData: req.session
        });

        console.log(`🎉 [ADMIN-${loginId}] Admin login completed for: ${email}`);

        res.json({
          success: true,
          requiresVerification: false,
          message: 'Admin login successful - session confirmed',
          sessionInfo: {
            sessionId: req.sessionID,
            userId: req.session.userId,
            isAdmin: req.session.isAdmin
          },
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            tier: user.tier,
            isAdmin: user.isAdmin,
            isSubscribed: user.isSubscribed,
            isLifetime: user.isLifetime,
            phoneVerified: true
          }
        });

      } catch (error: any) {
        console.error(`❌ [ADMIN-${loginId}] Admin login error:`, error);
        res.status(500).json({ error: 'Admin login failed' });
      }
    });

    // Super detailed session debug endpoint
    this.app.get('/api/debug/session-detailed', (req: any, res) => {
      console.log('🔬 DETAILED SESSION DEBUG');
      console.log('Session ID:', req.sessionID);
      console.log('Session object:', JSON.stringify(req.session, null, 2));
      console.log('Session store details:', {
        hasStore: !!req.sessionStore,
        storeType: req.sessionStore?.constructor.name
      });

      res.json({
        sessionID: req.sessionID,
        session: req.session,
        hasSession: !!req.session,
        sessionKeys: Object.keys(req.session || {}),
        cookies: req.headers.cookie,
        timestamp: new Date().toISOString()
      });
    });

    // Regular login endpoint - handles unverified accounts
    this.app.post('/api/auth/login', async (req: any, res) => {
      console.log('🔐 Login attempt:', { email: req.body.email });
      
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user by email
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const bcrypt = await import('bcrypt');
        const passwordValid = await bcrypt.compare(password, user.password || '');
        if (!passwordValid) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Set session
        req.session.userId = user.id;
        
        // CRITICAL FIX: Force session save for immediate availability
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });

        console.log('✅ Login successful for:', email, 'Session saved, phone verified:', user.phoneVerified);

        // Admin users always bypass verification
        if (user.isAdmin) {
          console.log('✅ Admin user detected - bypassing verification requirements');
          return res.json({
            success: true,
            requiresVerification: false,
            message: 'Admin login successful',
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              tier: user.tier,
              isAdmin: user.isAdmin,
              isSubscribed: user.isSubscribed,
              isLifetime: user.isLifetime
            }
          });
        }

        // Check if phone is verified for regular users
        if (!user.phoneVerified) {
          // Generate new verification code for unverified user
          const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

          // Store verification code
          await db.insert(phoneVerifications).values({
            phoneNumber: user.phoneNumber || '',
            verificationCode,
            expiresAt,
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            attempts: 0,
          });

          // Send SMS
          if (ENV.isProduction) {
            try {
              const { SmsService } = await import('./sms-service');
              const smsService = new SmsService();
              await smsService.sendVerificationCode(user.phoneNumber || '', verificationCode);
              console.log('📱 SMS sent to:', user.phoneNumber);
            } catch (error) {
              console.error('❌ SMS sending failed:', error);
            }
          } else {
            console.log('📱 [DEV] Verification code for', user.phoneNumber, ':', verificationCode);
          }

          return res.json({
            success: true,
            requiresVerification: true,
            message: 'Login successful. Please verify your phone number.',
            phoneNumber: user.phoneNumber
          });
        }

        // Phone verified - normal login
        res.json({
          success: true,
          requiresVerification: false,
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            tier: user.tier,
            isSubscribed: user.isSubscribed,
            isLifetime: user.isLifetime
          }
        });

      } catch (error: any) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // User signup - production version
    this.app.post('/api/auth/signup', async (req: any, res) => {
      try {
        const { firstName, lastName, email, phoneNumber, password } = req.body;
        
        console.log('📝 Signup attempt:', { email, phoneNumber: this.normalizePhoneNumber(phoneNumber) });

        // Validate required fields
        if (!firstName || !lastName || !email || !phoneNumber || !password) {
          return res.status(400).json({ error: 'All fields are required' });
        }

        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

        // Check if user already exists (email or phone)
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ error: 'Account already exists with this email' });
        }

        // Check if phone number is already registered
        const existingPhone = await storage.getUserByPhone(normalizedPhone);
        if (existingPhone) {
          return res.status(400).json({ error: 'Account already exists with this phone number' });
        }

        // Create user account with 14-day trial
        const userId = nanoid();
        const user = await storage.createUser({
          id: userId,
          email,
          firstName,
          lastName,
          phoneNumber: normalizedPhone,
          password, // Will be hashed by storage layer
          phoneVerified: false,
          tier: 'trial',
          onboardingCompleted: false
        });

        console.log('✅ User created:', userId);

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store verification code
        await db.insert(phoneVerifications).values({
          phoneNumber: normalizedPhone,
          verificationCode,
          expiresAt,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          attempts: 0,
        });

        // Set session immediately
        req.session.userId = userId;
        
        console.log('✅ SESSION SET:', {
          sessionId: req.sessionID,
          userId: userId,
          sessionExists: !!req.session,
          sessionData: req.session
        });
        
        console.log('📱 Generated verification code:', verificationCode);

        // Get Twilio credentials  
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        let smsSuccess = false;

        // Send SMS via Twilio
        try {
          console.log('🔍 SMS attempt with:', {
            hasSid: !!twilioSid,
            hasToken: !!twilioToken, 
            hasPhone: !!twilioPhone,
            isProduction: ENV.isProduction,
            environment: ENV.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'
          });

          if (twilioSid && twilioToken && twilioPhone) {
            // Send real SMS (both dev and production)
            const { default: twilio } = await import('twilio');
            const client = twilio(twilioSid, twilioToken);
            
            const message = await client.messages.create({
              body: `Your MusoBuddy verification code is: ${verificationCode}`,
              from: twilioPhone,
              to: normalizedPhone
            });
            
            console.log('📱 SMS sent successfully:', message.sid);
            console.log('📱 Message status:', message.status);
            smsSuccess = true;
          } else {
            // Missing credentials
            console.log('❌ Missing Twilio credentials - SMS not sent');
            console.log('🎯 ENTER THIS CODE:', verificationCode);
          }
        } catch (smsError: any) {
          console.error('❌ SMS sending failed:', smsError.message);
          console.error('❌ SMS error code:', smsError.code);
          console.error('❌ SMS error details:', smsError.moreInfo);
          // Continue anyway - user can still enter code manually
          console.log('🎯 FALLBACK CODE:', verificationCode);
        }

        // Determine if we should include verification code in response
        const shouldIncludeCode = !smsSuccess;

        res.json({
          success: true,
          userId,
          message: shouldIncludeCode ? 
            'Account created. SMS not available - use code shown below.' :
            'Account created. Check your phone for verification code.',
          // Include code only if SMS couldn't be sent
          ...(shouldIncludeCode && { 
            verificationCode, 
            tempMessage: 'SMS not configured - use code above' 
          })
        });

      } catch (error: any) {
        console.error('❌ Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
      }
    });

    // Phone verification - ENHANCED with fallback logic for session issues
    this.app.post('/api/auth/verify-phone', async (req: any, res) => {
      console.log('📱 Phone verification request:', req.body);
      console.log('🔍 ENHANCED Session debug:', {
        sessionId: req.sessionID,
        sessionExists: !!req.session,
        sessionData: req.session,
        userId: req.session?.userId,
        cookieHeader: req.headers.cookie,
        userAgent: req.headers['user-agent'],
        allHeaders: Object.keys(req.headers)
      });
      
      try {
        const { verificationCode, phoneNumber, email } = req.body;
        let userId = req.session?.userId;

        if (!verificationCode) {
          console.log('❌ Missing verification code');
          return res.status(400).json({ error: 'Verification code required' });
        }

        // FALLBACK 1: If no session userId, try to find user by phone number
        if (!userId && phoneNumber) {
          console.log('🔄 FALLBACK: Looking up user by phone number:', phoneNumber);
          const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
          const user = await storage.getUserByPhone(normalizedPhone);
          if (user) {
            userId = user.id;
            console.log('✅ FALLBACK: Found user by phone:', userId);
            // Restore session
            req.session.userId = userId;
          }
        }

        // FALLBACK 2: If still no user, try to find by email
        if (!userId && email) {
          console.log('🔄 FALLBACK: Looking up user by email:', email);
          const user = await storage.getUserByEmail(email);
          if (user) {
            userId = user.id;
            console.log('✅ FALLBACK: Found user by email:', userId);
            // Restore session
            req.session.userId = userId;
          }
        }

        // FALLBACK 3: Find user by recent unverified verification record
        if (!userId) {
          console.log('🔄 FALLBACK: Looking for recent verification record');
          const recentVerifications = await db.select()
            .from(phoneVerifications)
            .where(
              and(
                eq(phoneVerifications.verificationCode, verificationCode),
                gte(phoneVerifications.expiresAt, new Date()),
                isNull(phoneVerifications.verifiedAt) // Not yet verified
              )
            )
            .orderBy(desc(phoneVerifications.createdAt))
            .limit(1);

          if (recentVerifications.length > 0) {
            const verification = recentVerifications[0];
            const user = await storage.getUserByPhone(verification.phoneNumber);
            if (user) {
              userId = user.id;
              console.log('✅ FALLBACK: Found user by verification record:', userId);
              // Restore session
              req.session.userId = userId;
            }
          }
        }

        if (!userId) {
          console.log('❌ Could not determine user ID through any method');
          return res.status(400).json({ 
            error: 'Session expired. Please restart the signup process.',
            requiresRestart: true 
          });
        }

        // Get user
        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        if (user.phoneVerified) {
          return res.status(400).json({ error: 'Phone already verified' });
        }

        // Find latest verification code for this phone with enhanced matching
        const verification = await db.select()
          .from(phoneVerifications)
          .where(
            and(
              eq(phoneVerifications.phoneNumber, user.phoneNumber || ''),
              eq(phoneVerifications.verificationCode, verificationCode),
              gte(phoneVerifications.expiresAt, new Date())
            )
          )
          .orderBy(desc(phoneVerifications.createdAt))
          .limit(1);

        if (verification.length === 0) {
          console.log('❌ No valid verification code found for:', {
            phoneNumber: user.phoneNumber,
            code: verificationCode,
            currentTime: new Date().toISOString()
          });
          return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        const record = verification[0];

        // Check if code matches (already checked in query, but double-check)
        if (record.verificationCode !== verificationCode) {
          // Increment attempts
          await db.update(phoneVerifications)
            .set({ attempts: (record.attempts || 0) + 1 })
            .where(eq(phoneVerifications.id, record.id));
            
          return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Mark phone as verified
        await storage.updateUser(userId, {
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
        });

        // Mark verification as used
        await db.update(phoneVerifications)
          .set({ verifiedAt: new Date() })
          .where(eq(phoneVerifications.id, record.id));

        // FORCE session save with callback
        req.session.userId = userId;
        await new Promise((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              console.error('❌ Session save error after verification:', err);
              reject(err);
            } else {
              console.log('✅ Session saved after verification:', req.session.id);
              resolve(true);
            }
          });
        });

        console.log('✅ Phone verified for user:', userId);

        res.json({
          success: true,
          message: 'Phone number verified successfully',
          userId: userId // Include userId for frontend reference
        });

      } catch (error: any) {
        console.error('❌ Phone verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
      }
    });

    // Resend verification code for existing users
    this.app.post('/api/auth/resend-code', async (req: any, res) => {
      try {
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({ error: 'Email required' });
        }

        // Find user by email
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(404).json({ error: 'Account not found' });
        }

        if (user.phoneVerified) {
          return res.status(400).json({ error: 'Phone already verified' });
        }

        // Generate new verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store verification code
        await db.insert(phoneVerifications).values({
          phoneNumber: user.phoneNumber || '',
          verificationCode,
          expiresAt,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          attempts: 0,
        });

        // Set session for verification
        req.session.userId = user.id;

        console.log('🔄 Resending verification code to:', user.phoneNumber);
        console.log('📱 New verification code:', verificationCode);

        // Send SMS via Twilio
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        let smsSuccess = false;

        try {
          if (twilioSid && twilioToken && twilioPhone) {
            const { default: twilio } = await import('twilio');
            const client = twilio(twilioSid, twilioToken);
            
            const message = await client.messages.create({
              body: `Your MusoBuddy verification code is: ${verificationCode}`,
              from: twilioPhone,
              to: user.phoneNumber || ''
            });
            
            console.log('📱 SMS resent successfully:', message.sid);
            smsSuccess = true;
          } else {
            console.log('❌ Missing Twilio credentials - SMS not sent');
            console.log('🎯 ENTER THIS CODE:', verificationCode);
          }
        } catch (smsError: any) {
          console.error('❌ SMS sending failed:', smsError.message);
          console.log('🎯 FALLBACK CODE:', verificationCode);
        }

        const shouldIncludeCode = !smsSuccess;

        res.json({
          success: true,
          message: shouldIncludeCode ? 
            'Verification code generated. SMS not available - use code shown below.' :
            'Verification code sent to your phone.',
          ...(shouldIncludeCode && { 
            verificationCode, 
            tempMessage: 'SMS not configured - use code above' 
          })
        });

      } catch (error: any) {
        console.error('❌ Resend code error:', error);
        res.status(500).json({ error: 'Failed to resend verification code' });
      }
    });

    // Login route
    this.app.post('/api/auth/login', async (req: any, res) => {
      try {
        const { email, password } = req.body;
        console.log('🔍 Login attempt:', { email, passwordLength: password?.length });

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' });
        }

        console.log('🔍 Calling storage.authenticateUser...');
        const user = await storage.authenticateUser(email, password);
        console.log('🔍 authenticateUser result:', user ? 'Found user' : 'No user found');
        
        if (!user) {
          console.log('❌ Authentication failed for:', email);
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Force session save before responding
        req.session.userId = user.id;
        console.log('🔍 Setting session userId:', user.id);
        
        req.session.save((err: any) => {
          if (err) {
            console.error('❌ Session save error:', err);
            return res.status(500).json({ error: 'Session save failed' });
          }
          
          console.log('✅ Session saved successfully for user:', user.email);
          res.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phoneVerified: user.phoneVerified,
              onboardingCompleted: user.onboardingCompleted
            }
          });
        });

      } catch (error: any) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    });

    // Session restoration endpoint for Stripe checkout
    this.app.post('/api/auth/restore-session', async (req: any, res) => {
      try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
          return res.status(400).json({ error: 'Session ID required' });
        }

        console.log('🔄 Restoring session for Stripe sessionId:', sessionId);

        // Import StripeService to get session details
        const { StripeService } = await import('./stripe-service');
        const stripeService = new StripeService();
        
        // Get session details from Stripe
        const sessionDetails = await stripeService.getSessionDetails(sessionId);
        const userId = sessionDetails.metadata?.userId;
        
        if (!userId) {
          console.error('❌ No userId in Stripe session metadata');
          return res.status(400).json({ error: 'Invalid session - no user ID' });
        }

        // Get user from database
        const user = await storage.getUserById(userId);
        if (!user) {
          console.error('❌ User not found:', userId);
          return res.status(404).json({ error: 'User not found' });
        }

        // Restore session
        req.session.userId = user.id;
        
        console.log('✅ Session restored for user:', user.email);
        
        // Force session save and return success
        req.session.save((err: any) => {
          if (err) {
            console.error('❌ Session save error:', err);
            return res.status(500).json({ error: 'Session save failed' });
          }
          
          res.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phoneVerified: user.phoneVerified,
              onboardingCompleted: user.onboardingCompleted,
              isSubscribed: user.isSubscribed,
              isLifetime: user.isLifetime
            }
          });
        });
        
      } catch (error: any) {
        console.error('❌ Session restoration error:', error);
        res.status(500).json({ error: 'Session restoration failed' });
      }
    });

    // Start trial route (redirects to Stripe checkout)
    this.app.post('/api/auth/start-trial', async (req: any, res) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        console.log('🚀 Starting trial for user:', userId);

        // Store the session ID in user record for session restoration
        await storage.updateUser(userId, { 
          lastSessionId: req.sessionID,
          trialInProgress: true 
        });

        // Import StripeService dynamically
        const { StripeService } = await import('./stripe-service');
        const stripeService = new StripeService();
        
        // Use the Core plan price ID for trial
        const corePrice = 'price_1RouBwD9Bo26CG1DAF1rkSZI'; // Test price ID
        
        const session = await stripeService.createTrialCheckoutSession(userId, corePrice);
        
        console.log('✅ Trial checkout session created:', session.sessionId);
        res.json({ 
          success: true, 
          checkoutUrl: session.checkoutUrl,
          sessionId: session.sessionId 
        });
        
      } catch (error: any) {
        console.error('❌ Start trial error:', error);
        res.status(500).json({ error: error.message || 'Failed to start trial' });
      }
    });

    // Session restoration route for post-Stripe redirect
    this.app.post('/api/auth/restore-session', async (req: any, res) => {
      try {
        const { email, sessionId } = req.body;
        
        if (!email) {
          return res.status(400).json({ error: 'Email required for session restoration' });
        }

        console.log('🔄 Attempting session restoration for:', email);

        // Find user by email
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Verify user has started subscription process - webhook might be delayed
        if (!user.stripeCustomerId) {
          return res.status(400).json({ error: 'User has not started subscription process' });
        }

        // Restore session
        req.session.userId = user.id;
        
        console.log('✅ Session restored for user:', user.email);
        
        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneVerified: user.phoneVerified,
            onboardingCompleted: user.onboardingCompleted,
            tier: user.tier,
            isSubscribed: user.isSubscribed,
            isLifetime: user.isLifetime,
            isAdmin: user.isAdmin
          }
        });

      } catch (error: any) {
        console.error('❌ Session restoration error:', error);
        res.status(500).json({ error: 'Session restoration failed' });
      }
    });

    // Server-side redirect handler for trial success (bypasses browser cache)
    this.app.get('/trial-success', async (req: any, res) => {
      try {
        const sessionId = req.query.session_id;
        
        if (!sessionId) {
          return res.redirect('/?error=no_session_id');
        }

        console.log('🔄 Server-side session restoration for sessionId:', sessionId);

        // Import StripeService to get session details
        const { StripeService } = await import('./stripe-service');
        const stripeService = new StripeService();
        
        // Get session details from Stripe
        const sessionDetails = await stripeService.getSessionDetails(sessionId);
        const userId = sessionDetails.metadata?.userId;
        
        if (!userId) {
          console.error('❌ No userId in Stripe session metadata');
          return res.redirect('/?error=invalid_session');
        }

        // Get user from database
        const user = await storage.getUserById(userId);
        if (!user) {
          console.error('❌ User not found:', userId);
          return res.redirect('/?error=user_not_found');
        }

        // Restore session on server
        req.session.userId = user.id;
        
        console.log('✅ Server-side session restored for:', user.email);
        
        // Force session save before redirect
        req.session.save((err: any) => {
          if (err) {
            console.error('❌ Session save error:', err);
            return res.redirect('/?error=session_save_failed');
          }
          
          // Redirect to dashboard with authenticated session
          res.redirect('/dashboard');
        });
        
      } catch (error: any) {
        console.error('❌ Server-side session restoration error:', error);
        res.redirect('/?error=session_restore_failed');
      }
    });

    // Logout route
    this.app.post('/api/auth/logout', (req: any, res) => {
      req.session.destroy((err: any) => {
        if (err) {
          console.error('❌ Logout error:', err);
          return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
      });
    });

    // Restore session using Stripe session ID - find user who completed this checkout
    this.app.post('/api/auth/restore-session-by-stripe', async (req: any, res) => {
      try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
          return res.status(400).json({ error: 'Session ID required' });
        }

        console.log('🔄 Attempting session restoration by Stripe session:', sessionId);

        // Import StripeService to get session details
        const { StripeService } = await import('./stripe-service');
        const stripeService = new StripeService();
        
        try {
          // Get session details from Stripe
          const sessionDetails = await stripeService.getSessionDetails(sessionId);
          const userId = sessionDetails.metadata?.userId;
          
          if (!userId) {
            return res.status(400).json({ error: 'User ID not found in session metadata' });
          }

          // Get user by ID
          const user = await storage.getUserById(userId);
          if (!user) {
            return res.status(404).json({ error: 'User not found' });
          }

          // Verify user has started subscription process - webhook might be delayed
          if (!user.stripeCustomerId) {
            return res.status(400).json({ error: 'User has not started subscription process' });
          }

          // Restore session
          req.session.userId = user.id;
          
          console.log('✅ Session restored for user via Stripe session:', user.email);
          
          res.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phoneVerified: user.phoneVerified,
              onboardingCompleted: user.onboardingCompleted,
              tier: user.tier,
              isSubscribed: user.isSubscribed,
              isLifetime: user.isLifetime,
              isAdmin: user.isAdmin
            }
          });

        } catch (stripeError) {
          console.error('❌ Stripe session lookup failed:', stripeError);
          return res.status(400).json({ error: 'Invalid or expired session ID' });
        }

      } catch (error: any) {
        console.error('❌ Session restoration by Stripe error:', error);
        res.status(500).json({ error: 'Session restoration failed' });
      }
    });

    console.log('✅ Production authentication routes registered');
  }
}