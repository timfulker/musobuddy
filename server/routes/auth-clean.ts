import { type Express } from "express";
import rateLimit from 'express-rate-limit';
import { storage } from "../core/storage";
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { generateAuthToken, requireAuth } from '../middleware/auth';
import { verifyFirebaseToken } from '../core/firebase-admin';
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';

// Phone number formatting
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

// Check if user is exempt from subscription requirements
function isExemptUser(email: string): boolean {
  const allowedBypassEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com', 'jake.stanley@musobuddy.com'];
  return allowedBypassEmails.includes(email);
}

// Rate limiting configuration for authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signup attempts per hour
  message: { error: 'Too many signup attempts. Please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const smsVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // 3 SMS verification attempts per 10 minutes
  message: { error: 'Too many verification attempts. Please try again in 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: { error: 'Too many password reset attempts. Please try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// SMS verification now uses secure database storage instead of vulnerable in-memory Map

export function setupAuthRoutes(app: Express) {
  console.log('🔐 Setting up clean JWT-based authentication...');
  console.log('🔍 [DEBUG] Express app object:', !!app);
  console.log('🔍 [DEBUG] App.post method:', typeof app.post);

  // Signup endpoint - protected with rate limiting
  app.post('/api/auth/signup', signupLimiter, async (req, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, password } = req.body;

      if (!firstName || !lastName || !email || !phoneNumber || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Hash password before storing in database (security improvement)
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Store pending verification securely in database
      await storage.createSmsVerification(
        email,
        firstName,
        lastName,
        formattedPhone,
        hashedPassword,
        verificationCode,
        new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
      );

      // Clean up expired verifications for security
      await storage.deleteExpiredSmsVerifications();

      // Send SMS verification using Twilio
      try {
        const { SmsService } = await import('../core/sms-service');
        const smsService = new SmsService();
        
        await smsService.sendVerificationCode(formattedPhone, verificationCode);
        console.log(`✅ SMS verification code sent to ${formattedPhone}`);

        res.json({ 
          success: true, 
          message: 'Verification code sent to your phone',
          // Don't send verification code in production
          ...(process.env.NODE_ENV === 'development' && { verificationCode })
        });
      } catch (smsError) {
        console.error('❌ SMS sending failed:', smsError);
        // Fallback to console log in case SMS fails
        console.log(`📱 FALLBACK - SMS code for ${formattedPhone}: ${verificationCode}`);
        
        res.json({ 
          success: true, 
          message: 'Verification code sent',
          verificationCode // Include code when SMS fails
        });
      }

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verify signup endpoint
  app.post('/api/auth/verify-signup', async (req, res) => {
    try {
      const { email, verificationCode } = req.body;

      // Get pending verification from secure database storage
      const pending = await storage.getSmsVerificationByEmail(email);
      if (!pending) {
        return res.status(400).json({ error: 'No pending verification found' });
      }

      if (pending.expiresAt < new Date()) {
        await storage.deleteSmsVerification(email);
        return res.status(400).json({ error: 'Verification code expired' });
      }

      if (pending.verificationCode !== verificationCode) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Create user (password is already securely hashed in database)
      const userId = nanoid();

      const newUser = await storage.createUser({
        id: userId,
        email: pending.email,
        password: pending.password, // Already hashed when stored
        firstName: pending.firstName,
        lastName: pending.lastName,
        phoneNumber: pending.phoneNumber,
        phoneVerified: true,
        isAdmin: false,
        tier: 'free',
        createdAt: new Date()
      });

      // Clean up pending verification from database
      await storage.deleteSmsVerification(email);

      // Generate JWT token
      const authToken = generateAuthToken(userId, pending.email, true);

      res.json({
        success: true,
        message: 'Account created successfully',
        authToken,
        user: {
          userId,
          email: pending.email,
          firstName: pending.firstName,
          lastName: pending.lastName
        }
      });

    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // TEST ENDPOINT - Verify routing works for auth paths
  console.log('🔍 [DEBUG] Registering test route...');
  app.get('/api/auth/test-route', async (req, res) => {
    console.log('🧪 TEST ROUTE HIT - Auth routing works!');
    res.json({ success: true, message: 'Auth routing is working' });
  });
  console.log('✅ [DEBUG] Test route registered');

  // Firebase login endpoint - verifies token and creates/finds user
  app.post('/api/auth/firebase-login', async (req, res) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ error: 'Firebase ID token is required' });
      }

      // Verify Firebase token
      const firebaseUser = await verifyFirebaseToken(idToken);
      if (!firebaseUser) {
        return res.status(401).json({ error: 'Invalid Firebase token' });
      }

      console.log('🔥 Firebase token verified for user:', firebaseUser.uid);

      // Get user from database using Firebase UID
      let user = await storage.getUserByFirebaseUid(firebaseUser.uid);

      if (!user) {
        // Create new user from Firebase data
        const userId = nanoid();
        
        const newUser = await storage.createUser({
          id: userId,
          email: firebaseUser.email || '',
          firstName: firebaseUser.name?.split(' ')[0] || 'User',
          lastName: firebaseUser.name?.split(' ').slice(1).join(' ') || '',
          firebaseUid: firebaseUser.uid,
          phoneVerified: firebaseUser.emailVerified || false,
          isAdmin: isExemptUser(firebaseUser.email || ''),
          tier: 'pending_payment',
          createdAt: new Date()
        });

        user = newUser;
        console.log('✅ New user created from Firebase:', user.id);
        
        // New user needs to check subscription
        if (!user.isAdmin) {
          return res.json({
            success: true,
            paymentRequired: true,
            user: {
              userId: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              firebaseUid: firebaseUser.uid,
              isAdmin: false
            }
          });
        }
      }

      // Check subscription status for non-admin users
      if (!user.isAdmin && (user.tier === 'pending_payment' || user.tier === 'free')) {
        // Check if they have an active Stripe subscription
        const hasActiveSubscription = user.stripeSubscriptionId ? true : false;
        
        // If no subscription and not exempt, require payment
        if (!hasActiveSubscription && user.tier === 'pending_payment') {
          return res.json({
            success: true,
            paymentRequired: true,
            user: {
              userId: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              firebaseUid: firebaseUser.uid,
              isAdmin: false
            }
          });
        }
      }

      // User authenticated successfully - no JWT needed, Firebase token is the auth
      res.json({
        success: true,
        user: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          firebaseUid: firebaseUser.uid,
          isAdmin: user.isAdmin || false,
          tier: user.tier
        }
      });

    } catch (error) {
      console.error('Firebase login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login endpoint - temporarily bypass rate limiting for debugging
  app.post('/api/auth/login', async (req, res) => {
    console.log('🚨 LOGIN ENDPOINT HIT - REQUEST REACHED HANDLER!');
    console.log('🔍 Request details:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      bodyKeys: Object.keys(req.body || {}),
      body: req.body
    });
    
    try {
      console.log('🔍 LOGIN REQUEST:', { 
        email: req.body.email, 
        hasPassword: !!req.body.password,
        passwordLength: req.body.password?.length 
      });

      const { email, password } = req.body;

      if (!email || !password) {
        console.log('❌ Missing login fields:', { email: !!email, password: !!password });
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // All authentication now goes through proper credential verification
      console.log('🔍 Looking up user by email:', email);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log('❌ User not found for email:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      console.log('✅ User found:', { 
        userId: user.id, 
        email: user.email,
        hasPassword: !!user.password,
        passwordLength: user.password?.length,
        phoneVerified: user.phoneVerified 
      });

      const isValidPassword = await bcrypt.compare(password, user.password || '');
      console.log('🔍 Password comparison result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('❌ Invalid password for user:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // SECURITY FIX: Check if user has completed payment process
      const userPlan = user.plan || 'pending_payment';
      console.log('🔍 User plan status:', userPlan);
      
      if (userPlan === 'pending_payment' && !user.createdViaStripe) {
        console.log('❌ User login blocked - payment pending:', email);
        return res.status(403).json({ 
          error: 'Payment required',
          details: 'Please complete your subscription setup',
          requiresPayment: true,
          userId: user.id,
          email: user.email
        });
      }

      // Generate JWT token only for paid users
      const authToken = generateAuthToken(user.id, user.email || '', true);
      console.log('✅ Login successful for user:', email);

      res.json({
        success: true,
        message: 'Login successful',
        authToken,
        user: {
          userId: user.id,
          email: user.email,
          plan: userPlan
        }
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Change password endpoint
  app.post('/api/auth/change-password', requireAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Handle music business user password change
      if (userId === 'music-user-001') {
        // Get current user data
        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Check if current password is correct (check both hardcoded and database password)
        const isCurrentPasswordValid = currentPassword === 'music123' || 
          (user.password && await bcrypt.compare(currentPassword, user.password));

        if (!isCurrentPasswordValid) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in database
        await storage.updateUser(userId, { password: hashedPassword });

        return res.json({
          success: true,
          message: 'Password updated successfully'
        });
      }

      // Handle regular users
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password || '');
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { password: hashedPassword });

      res.json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get current user endpoint - uses Firebase authentication
  app.get('/api/auth/user', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user.userId;
      
      // Handle admin user from database
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin || false,
        phoneVerified: user.phoneVerified || false,
        emailPrefix: user.emailPrefix || null
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Alias for /api/auth/user
  app.get('/api/auth/me', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin || false,
        phoneVerified: user.phoneVerified || false,
        emailPrefix: user.emailPrefix || null
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // New register endpoint - creates user immediately
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, password } = req.body;

      if (!firstName || !lastName || !email || !phoneNumber || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Create user immediately
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = nanoid();
      const formattedPhone = formatPhoneNumber(phoneNumber);

      await storage.createUser({
        id: userId,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        phoneNumber: formattedPhone,
        phoneVerified: false,
        createdViaStripe: false,
        plan: 'pending_payment' // SECURITY FIX: Require payment before full access
      });

      // Store verification code securely in database for later SMS verification
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await storage.createSmsVerification(
        email, // Use email as unique identifier
        firstName,
        lastName,
        formattedPhone,
        hashedPassword,
        verificationCode,
        new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
      );

      res.json({ 
        success: true, 
        userId,
        message: 'Account created successfully'
      });

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Send SMS verification code
  app.post('/api/auth/send-sms', async (req, res) => {
    try {
      console.log('📱 Send SMS request body:', req.body);
      const { phoneNumber, userId } = req.body;

      if (!phoneNumber || !userId) {
        console.log('❌ Missing SMS required fields:', { phoneNumber: !!phoneNumber, userId: !!userId });
        return res.status(400).json({ error: 'Phone number and user ID are required' });
      }

      console.log('📱 Generating SMS verification code for userId:', userId);
      
      // Look up user to get email for database verification storage
      const user = await storage.getUserById(userId);
      if (!user || !user.email) {
        return res.status(400).json({ error: 'User not found or missing email' });
      }

      // Generate new verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log('📱 Formatted phone number:', formattedPhone);

      // Store verification securely in database
      await storage.createSmsVerification(
        user.email,
        user.firstName || '',
        user.lastName || '', 
        formattedPhone,
        user.password || '', // Use existing user password hash
        verificationCode,
        new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
      );

      // Send SMS verification using Twilio
      try {
        const { SmsService } = await import('../core/sms-service');
        const smsService = new SmsService();
        
        await smsService.sendVerificationCode(formattedPhone, verificationCode);
        console.log(`✅ SMS verification code sent to ${formattedPhone}`);

        res.json({ 
          success: true, 
          message: 'Verification code sent to your phone',
          // Don't send verification code in production
          ...(process.env.NODE_ENV === 'development' && { verificationCode })
        });
      } catch (smsError) {
        console.error('❌ SMS sending failed:', smsError);
        // Fallback to console log in case SMS fails
        console.log(`📱 FALLBACK - SMS code for ${formattedPhone}: ${verificationCode}`);
        
        res.json({ 
          success: true, 
          message: 'Verification code sent',
          verificationCode // Include code when SMS fails
        });
      }

    } catch (error) {
      console.error('Send SMS error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Verify SMS code - protected with rate limiting
  app.post('/api/auth/verify-sms', smsVerificationLimiter, async (req, res) => {
    try {
      console.log('🔍 SMS verification request body:', req.body);
      const { userId, verificationCode } = req.body;

      if (!userId || !verificationCode) {
        console.log('❌ Missing required fields:', { userId: !!userId, verificationCode: !!verificationCode });
        return res.status(400).json({ error: 'User ID and verification code are required' });
      }

      console.log('🔍 Looking for pending verification for userId:', userId);
      
      // Get user to find their email for database lookup
      const user = await storage.getUserById(userId);
      if (!user || !user.email) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Get pending verification from secure database storage
      const pending = await storage.getSmsVerificationByEmail(user.email);
      if (!pending) {
        console.log('❌ No pending verification found for userId:', userId);
        return res.status(400).json({ error: 'No pending verification found' });
      }

      if (pending.expiresAt < new Date()) {
        await storage.deleteSmsVerification(user.email);
        return res.status(400).json({ error: 'Verification code expired' });
      }

      if (pending.verificationCode !== verificationCode) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Update user's phone verification status
      await storage.updateUser(userId, { phoneVerified: true });

      // Clean up pending verification from database
      await storage.deleteSmsVerification(user.email);

      res.json({
        success: true,
        message: 'Phone number verified successfully'
      });

    } catch (error) {
      console.error('Verify SMS error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // CRITICAL FIX: Add subscription status directly in auth routes to avoid conflicts
  app.get('/api/subscription/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      console.log('📊 Auth route handling subscription status for userId:', userId);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user subscription info from user record
      res.json({
        subscription: {
          plan: user.plan || 'free',
          stripeCustomerId: user.stripeCustomerId || null,
          stripeSubscriptionId: user.stripeSubscriptionId || null,
          trialStartDate: user.trialStartDate || null,
          trialEndDate: user.trialEndDate || null
        },
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('❌ Subscription status error:', error);
      res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
  });

  // New endpoint: Authenticate users after Stripe checkout
  app.post('/api/auth/stripe-login', async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }
      
      console.log(`🔐 Stripe login attempt with session ID: ${sessionId}`);
      
      // Get session details from Stripe
      const { stripeService } = await import('../core/stripe-service');
      const session = await stripeService.getSessionDetails(sessionId);
      
      if (!session) {
        return res.status(400).json({ error: 'Invalid session ID' });
      }
      
      const userEmail = session.metadata?.userEmail || session.customer_email;
      
      if (!userEmail) {
        return res.status(400).json({ error: 'No email found in session' });
      }
      
      console.log(`🔐 Looking up user with email: ${userEmail}`);
      
      // Find the user created by the webhook
      const user = await storage.getUserByEmail(userEmail);
      
      if (!user) {
        // User might not exist yet if webhook hasn't processed
        return res.status(404).json({ error: 'User not found. Please wait a moment and try again.' });
      }
      
      // Generate JWT token for the user
      const authToken = generateAuthToken(user.id, user.email || '', true);
      
      console.log(`✅ Stripe login successful for user: ${user.id} (${user.email})`);
      
      res.json({
        success: true,
        message: 'Authentication successful',
        authToken,
        user: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneVerified: true // Stripe users are considered verified
        }
      });
      
    } catch (error) {
      console.error('Stripe login error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Firebase authentication endpoint
  app.post('/api/auth/firebase-login', loginLimiter, async (req, res) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ error: 'Firebase ID token is required' });
      }

      // Verify the Firebase token
      const firebaseUser = await verifyFirebaseToken(idToken);
      
      if (!firebaseUser) {
        return res.status(401).json({ error: 'Invalid Firebase token' });
      }

      if (!firebaseUser.email) {
        return res.status(400).json({ error: 'Email is required for authentication' });
      }

      console.log(`🔥 Firebase login attempt for email: ${firebaseUser.email}`);

      // Check if user exists in our system
      let user = await storage.getUserByEmail(firebaseUser.email);

      if (!user) {
        // Create new user from Firebase data
        const userId = nanoid();
        
        // Extract first and last name from Firebase display name
        const displayName = firebaseUser.name || '';
        const nameParts = displayName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        user = await storage.createUser({
          id: userId,
          email: firebaseUser.email,
          firstName: firstName || 'User',
          lastName: lastName || '',
          password: '', // Firebase users don't need password
          phoneNumber: '', // Will be collected later if needed
          phoneVerified: firebaseUser.emailVerified || false,
          createdViaStripe: false,
          plan: 'pending_payment' // Require payment like other users
        });

        console.log(`✅ New Firebase user created: ${user.id} (${user.email})`);
      }

      // Check subscription status
      if (user.plan === 'pending_payment' && !isExemptUser(user.email)) {
        return res.status(403).json({
          requiresPayment: true,
          error: 'Payment required',
          email: user.email,
          userId: user.id
        });
      }

      // Generate JWT token for our system
      const authToken = generateAuthToken(user.id, user.email || '', true);

      console.log(`✅ Firebase login successful for user: ${user.id} (${user.email})`);

      res.json({
        success: true,
        message: 'Authentication successful',
        authToken,
        user: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneVerified: user.phoneVerified || firebaseUser.emailVerified || false
        }
      });

    } catch (error) {
      console.error('Firebase login error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Forgot Password endpoint - protected with rate limiting
  app.post('/api/auth/forgot-password', passwordResetLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return res.json({ 
          success: true, 
          message: 'If an account with that email exists, you will receive a password reset link.' 
        });
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to database
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpiresAt: resetExpiry
      });

      // Send reset email
      try {
        const { EmailService } = await import('../core/services');
        const emailService = new EmailService();
        
        const resetUrl = `${process.env.APP_URL || 'https://musobuddy.replit.app'}/auth/reset-password?token=${resetToken}`;
        
        await emailService.sendPasswordResetEmail(email, user.firstName || 'User', resetUrl);
        
        console.log(`✅ Password reset email sent to ${email}`);
      } catch (emailError) {
        console.error('❌ Failed to send reset email:', emailError);
        // Continue anyway - don't reveal email sending issues
      }

      res.json({
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link.'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Reset Password endpoint
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Find user with valid reset token
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null
      });

      console.log(`✅ Password reset successful for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Subscription watchdog endpoint - checks subscription status for periodic verification
  app.get('/api/subscription/watchdog-status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // STRICT: Only these 3 specific accounts bypass subscription checks
      const allowedBypassEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com', 'jake.stanley@musobuddy.com'];
      const isAdminCreated = allowedBypassEmails.includes(user.email) || user.createdByAdmin;
      
      // Check subscription validity
      const hasValidSubscription = user.isSubscribed && user.stripeCustomerId && user.tier !== 'free';

      res.json({
        hasValidSubscription,
        isAdminCreated,
        stripeCustomerId: user.stripeCustomerId,
        isSubscribed: user.isSubscribed,
        tier: user.tier,
        userId: user.id
      });

    } catch (error) {
      console.error('❌ Watchdog status error:', error);
      res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
  });

  // Periodic cleanup of expired verification codes for security hygiene
  setInterval(async () => {
    try {
      await storage.deleteExpiredSmsVerifications();
    } catch (error) {
      console.error('❌ Error cleaning up expired SMS verifications:', error);
    }
  }, 10 * 60 * 1000); // Clean up every 10 minutes

  console.log('✅ Clean authentication system configured with SMS and Stripe integration');
  console.log('🧹 Periodic cleanup enabled for expired verification codes');
}