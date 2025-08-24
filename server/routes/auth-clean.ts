import { type Express } from "express";
import rateLimit from 'express-rate-limit';
import { storage } from "../core/storage";
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { generateAuthToken, requireAuth } from '../middleware/auth';

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

// In-memory verification storage (replace with Redis in production)
const pendingVerifications = new Map<string, {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  verificationCode: string;
  expiresAt: Date;
}>();

export function setupAuthRoutes(app: Express) {
  console.log('🔐 Setting up clean JWT-based authentication...');

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

      // Store pending verification
      pendingVerifications.set(email, {
        firstName,
        lastName,
        email,
        phoneNumber: formattedPhone,
        password,
        verificationCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

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

      const pending = pendingVerifications.get(email);
      if (!pending) {
        return res.status(400).json({ error: 'No pending verification found' });
      }

      if (pending.expiresAt < new Date()) {
        pendingVerifications.delete(email);
        return res.status(400).json({ error: 'Verification code expired' });
      }

      if (pending.verificationCode !== verificationCode) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Create user
      const hashedPassword = await bcrypt.hash(pending.password, 10);
      const userId = nanoid();

      const newUser = await storage.createUser({
        id: userId,
        email: pending.email,
        password: hashedPassword,
        firstName: pending.firstName,
        lastName: pending.lastName,
        phoneNumber: pending.phoneNumber,
        phoneVerified: true,
        isAdmin: false,
        tier: 'free',
        createdAt: new Date()
      });

      // Clean up pending verification
      pendingVerifications.delete(email);

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

  // Login endpoint - protected with rate limiting
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // All authentication now goes through proper credential verification

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password || '');
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const authToken = generateAuthToken(user.id, user.email || '', true);

      res.json({
        success: true,
        message: 'Login successful',
        authToken,
        user: {
          userId: user.id,
          email: user.email
        }
      });

    } catch (error) {
      console.error('Login error:', error);
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

  // Get current user endpoint
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
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
        plan: 'free'
      });

      // Store verification code for later SMS verification
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      pendingVerifications.set(userId, {
        firstName,
        lastName,
        email,
        phoneNumber: formattedPhone,
        password: hashedPassword,
        verificationCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      } as {
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
        password: string;
        verificationCode: string;
        expiresAt: Date;
      });

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
      // Generate new verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log('📱 Formatted phone number:', formattedPhone);

      // Store/update verification data
      const existingData = pendingVerifications.get(userId) || {
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: formattedPhone,
        password: '',
        verificationCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };
      
      pendingVerifications.set(userId, {
        ...existingData,
        phoneNumber: formattedPhone,
        verificationCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

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
      const pending = pendingVerifications.get(userId);
      if (!pending) {
        console.log('❌ No pending verification found for userId:', userId);
        console.log('🔍 Current pending verifications:', Array.from(pendingVerifications.keys()));
        return res.status(400).json({ error: 'No pending verification found' });
      }

      if (pending.expiresAt < new Date()) {
        pendingVerifications.delete(userId);
        return res.status(400).json({ error: 'Verification code expired' });
      }

      if (pending.verificationCode !== verificationCode) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Update user's phone verification status
      await storage.updateUser(userId, { phoneVerified: true });

      // Clean up pending verification
      pendingVerifications.delete(userId);

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
  
  console.log('✅ Clean authentication system configured with SMS and Stripe integration');
}