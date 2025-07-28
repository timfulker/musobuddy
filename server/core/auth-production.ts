import { type Express } from "express";
import { storage } from "./storage";
import { db } from "./database";
import { users, phoneVerifications } from "../../shared/schema";
import { eq, desc, and, gte, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ENV, isProduction, getAppServerUrl } from "./environment";
import { smsService } from "./sms-service";
import { 
  loginRateLimit, 
  phoneVerificationRateLimit, 
  signupRateLimit,
  passwordResetRateLimit
} from "./rate-limiting";

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

  // CRITICAL FIX: Replit production-aware session save function
  private async saveSession(req: any): Promise<void> {
    return new Promise((resolve, reject) => {
      // REPLIT PRODUCTION: Add extra validation
      if (!req.session) {
        console.error('❌ No session object available for save');
        reject(new Error('No session object'));
        return;
      }
      
      req.session.save((err: any) => {
        if (err) {
          console.error('❌ REPLIT PRODUCTION Session save failed:', err);
          console.error('❌ Session state:', {
            sessionId: req.sessionID,
            hasSession: !!req.session,
            keys: req.session ? Object.keys(req.session) : 'no session'
          });
          reject(err);
        } else {
          console.log('✅ REPLIT PRODUCTION Session saved successfully:', {
            sessionId: req.sessionID,
            userId: req.session.userId,
            isReplitProduction: ENV.appServerUrl.includes('musobuddy.replit.app'),
            timestamp: new Date().toISOString()
          });
          resolve();
        }
      });
    });
  }

  public setupRoutes() {
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
          sessionStore: req.sessionStore ? 'available' : 'missing',
          isEmergencyAdmin: userId === 'admin-emergency-id',
          emergencyLogin: req.session?.emergencyLogin
        });
        
        if (!userId) {
          console.log('❌ No session userId found - session details:', {
            sessionExists: !!req.session,
            sessionKeys: req.session ? Object.keys(req.session) : 'no session',
            sessionId: req.sessionID
          });
          return res.status(401).json({ error: 'Not authenticated' });
        }

        // Handle emergency admin session
        if (userId === 'admin-emergency-id' && req.session.emergencyLogin) {
          console.log('✅ EMERGENCY admin session authenticated:', req.session.email);
          return res.json({
            id: 'admin-emergency-id',
            email: req.session.email,
            firstName: 'Admin',
            lastName: 'User',
            phoneVerified: true,
            onboardingCompleted: true,
            tier: 'admin',
            isAdmin: true,
            isSubscribed: true,
            isLifetime: true
          });
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

    // FIXED: Emergency bulletproof admin login endpoint - SINGLE DEFINITION
    this.app.post('/api/auth/admin-login', async (req: any, res) => {
      const loginId = Date.now().toString();
      console.log(`🚨 EMERGENCY ADMIN LOGIN START - ${loginId}`);
      console.log('Request body:', req.body);
      console.log('Session before:', req.session);
      console.log('Session ID:', req.sessionID);
      
      try {
        const { email, password } = req.body;
        console.log(`📧 Email: ${email}, Password provided: ${!!password}`);

        // Emergency hardcoded check for admin
        if (email === 'timfulker@gmail.com' && password === 'MusoBuddy2025!') {
          console.log(`🔑 EMERGENCY: Using hardcoded admin credentials`);
          
          // Get the actual user from database
          let adminUser;
          try {
            adminUser = await storage.getUserByEmail('timfulker@gmail.com');
            console.log(`🔍 EMERGENCY: Admin user found:`, !!adminUser);
          } catch (dbError) {
            console.error(`❌ EMERGENCY: Database error:`, dbError);
          }
          
          // CRITICAL FIX: Set session data with real user ID
          req.session.userId = adminUser ? adminUser.id : 'admin-emergency-id';
          req.session.isAdmin = true;
          req.session.email = email;
          req.session.emergencyLogin = true;
      
          console.log(`💾 EMERGENCY: Session data set:`, {
            userId: req.session.userId,
            isAdmin: req.session.isAdmin,
            email: req.session.email,
            sessionId: req.sessionID
          });

          // EXTERNAL REVIEWER'S EXACT FIX: Explicitly save session with callback
          req.session.save((err: any) => {
            if (err) {
              console.error(`❌ EMERGENCY: Session save error:`, err);
              return res.status(500).json({ error: 'Session save failed' });
            }
            
            console.log(`✅ EMERGENCY: Session saved successfully with callback`);
            
            return res.json({
              success: true,
              requiresVerification: false,
              message: 'Admin login successful',
              user: {
                id: req.session.userId,
                email: req.session.email,
                isAdmin: true,
                tier: 'admin',
                firstName: 'Admin',
                lastName: 'User',
                isSubscribed: true,
                isLifetime: true,
                phoneVerified: true
              }
            });
          } catch (saveError) {
            console.error(`❌ EMERGENCY: Session save failed:`, saveError);
            return res.status(500).json({ error: 'Session save failed' });
          }
        }

        // If not hardcoded admin, reject immediately
        console.log(`❌ EMERGENCY: Not hardcoded admin credentials`);
        return res.status(401).json({ error: 'Emergency mode: only hardcoded admin allowed' });

      } catch (error: any) {
        console.error(`❌ [ADMIN-${loginId}] Admin login error:`, error);
        res.status(500).json({ error: 'Admin login failed' });
      }
    });

    // HARDENING: Login endpoint with rate limiting protection
    this.app.post('/api/auth/login', loginRateLimit, async (req: any, res) => {
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

        // EXTERNAL REVIEWER'S EXACT FIX: Set session data and explicitly save with callback
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.requiresVerification = !user.phoneVerified;
        
        // CRITICAL: Explicitly save session before response
        req.session.save(async (err: any) => {
          if (err) {
            console.error('❌ Session save error:', err);
            return res.status(500).json({ error: 'Session save failed' });
          }
          
          console.log('✅ Login successful for:', email, 'Session saved with callback');
          
          // Handle SMS verification for non-verified users
          if (!user.phoneVerified && user.phoneNumber) {
            // Generate and send verification code
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Store in database
            await db.insert(phoneVerifications).values({
              phoneNumber: this.normalizePhoneNumber(user.phoneNumber),
              verificationCode,
              expiresAt,
              ipAddress: req.ip || '',
              userAgent: req.headers['user-agent'] || '',
            });

            // Send SMS
            try {
              await smsService.sendVerificationCode(user.phoneNumber, verificationCode);
              console.log('✅ Verification code sent successfully to:', user.phoneNumber);
            } catch (smsError: any) {
              console.error('❌ SMS send failed:', smsError.message);
              if (ENV.isDevelopment) {
                console.log('📱 Development mode - verification code is:', verificationCode);
              }
            }
          }
          
          // Send response AFTER session is saved
          if (!user.phoneVerified) {
            return res.json({
              success: true,
              requiresVerification: true,
              message: 'Please verify your phone number'
            });
          }
          
          res.json({ 
            success: true, 
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
        });

      } catch (error: any) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
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

    // HARDENING: Phone verification endpoint with rate limiting protection
    this.app.post('/api/auth/verify-phone', phoneVerificationRateLimit, async (req: any, res) => {
      try {
        const { verificationCode, phoneNumber, email } = req.body;
        const userId = req.session?.userId;

        console.log('📱 Phone verification attempt:', { 
          hasSession: !!req.session,
          userId,
          codeProvided: !!verificationCode,
          phoneProvided: !!phoneNumber 
        });

        // Get user from session or fallback
        let user;
        if (userId) {
          user = await storage.getUser(userId);
        } else if (email) {
          // Fallback for session issues
          user = await storage.getUserByEmail(email);
          if (user) {
            req.session.userId = user.id;
          }
        }

        if (!user) {
          return res.status(400).json({ error: 'User session not found' });
        }

        if (!user.phoneNumber) {
          return res.status(400).json({ error: 'No phone number on record' });
        }

        // Check verification code
        const normalizedPhone = this.normalizePhoneNumber(user.phoneNumber);
        const [verification] = await db
          .select()
          .from(phoneVerifications)
          .where(and(
            eq(phoneVerifications.phoneNumber, normalizedPhone),
            eq(phoneVerifications.verificationCode, verificationCode),
            gte(phoneVerifications.expiresAt, new Date()),
            isNull(phoneVerifications.verifiedAt)
          ))
          .orderBy(desc(phoneVerifications.createdAt))
          .limit(1);

        if (!verification) {
          console.log('❌ Invalid verification code');
          return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        // Mark as verified
        await db
          .update(phoneVerifications)
          .set({ verifiedAt: new Date() })
          .where(eq(phoneVerifications.id, verification.id));

        // Update user
        await storage.updateUser(user.id, {
          phoneVerified: true,
          phoneVerifiedAt: new Date()
        });

        // CRITICAL: Set session for authenticated user after phone verification
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.phoneVerified = true;

        // Save session
        await this.saveSession(req);

        console.log('✅ Phone verified successfully for:', user.email, 'Session set with userId:', user.id);

        res.json({
          success: true,
          message: 'Phone verified successfully',
          user: {
            id: user.id,
            email: user.email,
            phoneVerified: true
          }
        });

      } catch (error: any) {
        console.error('❌ Phone verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
      }
    });

    // Resend verification code
    this.app.post('/api/auth/resend-code', async (req: any, res) => {
      try {
        // Get user from session
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await storage.getUser(userId);
        if (!user || !user.phoneNumber) {
          return res.status(400).json({ error: 'User not found or no phone number' });
        }

        // Generate new verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store in database
        await db.insert(phoneVerifications).values({
          phoneNumber: user.phoneNumber,
          verificationCode,
          expiresAt,
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        });

        // Send SMS (or log in trial mode)
        const { smsService } = await import('./sms-service');
        await smsService.sendVerificationCode(user.phoneNumber, verificationCode);

        res.json({ 
          success: true, 
          message: 'New verification code sent',
          // In development/trial mode, include code for testing
          ...(ENV.isProduction ? {} : { code: verificationCode })
        });

      } catch (error: any) {
        console.error('❌ Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification code' });
      }
    });

    // CRITICAL FIX: Add missing signup endpoint
    // HARDENING: Signup endpoint with rate limiting protection
    this.app.post('/api/auth/signup', signupRateLimit, async (req: any, res) => {
      console.log('📝 Signup attempt:', { email: req.body.email, phone: req.body.phoneNumber });
      
      try {
        const { firstName, lastName, email, phoneNumber, password } = req.body;

        if (!firstName || !lastName || !email || !phoneNumber || !password) {
          return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const bcrypt = await import('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 12);

        // Normalize phone number
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

        // Create user
        const userId = nanoid();
        const user = await storage.createUser({
          id: userId,
          firstName,
          lastName,
          email: email.toLowerCase(),
          phoneNumber: normalizedPhone,
          password: hashedPassword,
          phoneVerified: false,
          tier: 'trial',
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          onboardingCompleted: false,
          emailPrefix: '',
          isAdmin: false,
          isSubscribed: false,
          isLifetime: false
        });

        // Set session for the new user
        req.session.userId = userId;
        
        // Save session immediately
        await this.saveSession(req);

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store verification code
        await db.insert(phoneVerifications).values({
          phoneNumber: normalizedPhone,
          verificationCode,
          expiresAt,
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        });

        console.log('📱 Verification code stored for signup:', {
          phone: normalizedPhone,
          code: verificationCode,
          userId
        });

        // Send SMS
        try {
          console.log('📱 Attempting to send SMS for signup...');
          await smsService.sendVerificationCode(normalizedPhone, verificationCode);
          console.log('✅ Verification code sent successfully');
          
          res.json({ 
            userId,
            success: true,
            message: 'Account created successfully. Please check your phone for a verification code.',
          });
        } catch (smsError: any) {
          console.error('❌ SMS send failed during signup:', smsError.message);
          console.error('❌ Full SMS error:', smsError);
          
          // In development, return the code
          if (ENV.isDevelopment) {
            console.log('📱 Development mode - returning verification code for testing');
            res.json({ 
              userId,
              success: true,
              message: 'Account created successfully.',
              verificationCode, // For testing when SMS fails
              tempMessage: 'SMS not available in trial mode - use the code shown below'
            });
          } else {
            res.json({ 
              userId,
              success: true,
              message: 'Account created successfully. Please check your phone for a verification code.',
            });
          }
        }

      } catch (error: any) {
        console.error('❌ Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
      }
    });

    console.log('✅ Production authentication routes registered');
  }
}