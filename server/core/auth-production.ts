import { type Express } from "express";
import { storage } from "./storage";
import { db } from "./database";
import { users, phoneVerifications } from "../../shared/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { nanoid } from "nanoid";

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

    // Get current authenticated user
    this.app.get('/api/auth/user', async (req: any, res) => {
      try {
        const userId = req.session?.userId;
        console.log('🔍 Auth check for userId:', userId);
        
        if (!userId) {
          console.log('❌ No session userId found');
          return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await storage.getUserById(userId);
        if (!user) {
          console.log('❌ User not found for ID:', userId);
          // Clear invalid session
          req.session.destroy(() => {});
          return res.status(401).json({ error: 'User not found' });
        }

        console.log('✅ User authenticated:', user.email);
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
        
        console.log('📱 Generated verification code:', verificationCode);

        // For production: Send via Twilio (if configured)
        try {
          // Check if Twilio is properly configured
          const twilioSid = process.env.TWILIO_ACCOUNT_SID;
          const twilioToken = process.env.TWILIO_AUTH_TOKEN;
          const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

          // Always use development mode for now while Twilio application is pending
          console.log('🔧 DEVELOPMENT MODE - Verification code:', verificationCode);
          console.log('📱 Phone number:', normalizedPhone);
          console.log('🎯 ENTER THIS CODE:', verificationCode);
        } catch (smsError: any) {
          console.error('❌ SMS sending failed:', smsError.message);
          // Continue anyway - user can still enter code manually
        }

        res.json({
          success: true,
          userId,
          message: 'Account created. Check your phone for verification code.',
          // Include code in response for development/testing
          ...(process.env.NODE_ENV === 'development' && { verificationCode })
        });

      } catch (error: any) {
        console.error('❌ Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
      }
    });

    // Phone verification - production version
    this.app.post('/api/auth/verify-phone', async (req: any, res) => {
      console.log('📱 Phone verification request:', req.body);
      
      try {
        const { verificationCode } = req.body;
        const userId = req.session.userId;

        if (!userId || !verificationCode) {
          return res.status(400).json({ error: 'User ID and verification code required' });
        }

        // Get user
        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        if (user.phoneVerified) {
          return res.status(400).json({ error: 'Phone already verified' });
        }

        // Find latest verification code for this phone
        const verification = await db.select()
          .from(phoneVerifications)
          .where(
            and(
              eq(phoneVerifications.phoneNumber, user.phoneNumber || ''),
              gte(phoneVerifications.expiresAt, new Date())
            )
          )
          .orderBy(desc(phoneVerifications.createdAt))
          .limit(1);

        if (verification.length === 0) {
          return res.status(400).json({ error: 'No valid verification code found' });
        }

        const record = verification[0];

        // Check if code matches
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

        // Ensure session is set
        req.session.userId = userId;

        console.log('✅ Phone verified for user:', userId);

        res.json({
          success: true,
          message: 'Phone number verified successfully'
        });

      } catch (error: any) {
        console.error('❌ Phone verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
      }
    });

    // Login route
    this.app.post('/api/auth/login', async (req: any, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await storage.authenticateUser(email, password);
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = user.id;

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

      } catch (error: any) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
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