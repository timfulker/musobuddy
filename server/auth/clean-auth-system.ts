import { type Express } from "express";
import { storage } from "../core/storage.js";
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import { ENV } from '../core/environment.js';
import { stripeService } from '../core/stripe-service.js';

// JWT-based authentication to bypass session middleware issues
const JWT_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = '7d';

interface AuthToken {
  userId: string;
  email: string;
  isVerified: boolean;
  iat?: number;
  exp?: number;
}

// Generate JWT token
function generateAuthToken(userId: string, email: string, isVerified: boolean = true): string {
  return jwt.sign({ userId, email, isVerified }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyAuthToken(token: string): AuthToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthToken;
  } catch (error) {
    return null;
  }
}

// Authentication middleware using JWT instead of sessions
export const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.authToken;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = decoded;
  next();
};

// In-memory verification storage (replace with Redis in production)
const pendingVerifications = new Map<string, {
  userId: string;
  email: string;
  verificationCode: string;
  phoneNumber: string;
  expiresAt: Date;
}>();

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

// Send verification SMS (production Twilio integration)
async function sendVerificationSMS(phoneNumber: string, verificationCode: string) {
  const isProduction = ENV.isProduction || process.env.REPLIT_DEPLOYMENT;
  
  console.log('📱 SMS ATTEMPT:', {
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
      
      // Use dynamic import for Twilio
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
      
      // Fallback to development mode on SMS failure
      return {
        success: true,
        message: 'SMS temporarily unavailable - use code below',
        showCode: true,
        verificationCode: verificationCode,
        tempMessage: `SMS failed - use code: ${verificationCode}`
      };
    }
  } else {
    // Development mode - return code for display
    return {
      success: true,
      message: 'Development mode - use code below',
      showCode: true,
      verificationCode: verificationCode
    };
  }
}

export function setupCleanAuth(app: Express) {
  console.log('🔐 Setting up clean JWT-based authentication...');

  // 1. Signup endpoint
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, password } = req.body;
      
      // Basic validation
      if (!firstName || !lastName || !email || !phoneNumber || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      
      console.log('🔐 Signup attempt for:', email);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user
      const userId = nanoid();
      const newUser = await storage.createUser({
        id: userId,
        email,
        firstName,
        lastName,
        phoneNumber,
        password: hashedPassword,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ User created:', newUser.email);
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification data
      pendingVerifications.set(email, {
        userId,
        email,
        verificationCode,
        phoneNumber,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });
      
      // Send SMS
      const smsResult = await sendVerificationSMS(phoneNumber, verificationCode);
      
      res.json({
        success: true,
        message: 'Account created successfully',
        nextStep: 'verify-phone',
        showVerificationCode: smsResult.showCode,
        verificationCode: smsResult.showCode ? smsResult.verificationCode : undefined
      });
      
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      res.status(500).json({ error: 'Signup failed', details: error.message });
    }
  });

  // 2. Phone verification endpoint
  app.post('/api/auth/verify-phone', async (req, res) => {
    try {
      const { email, verificationCode } = req.body;
      
      if (!email || !verificationCode) {
        return res.status(400).json({ error: 'Email and verification code required' });
      }
      
      // Get verification data
      const verificationData = pendingVerifications.get(email);
      if (!verificationData) {
        return res.status(400).json({ error: 'No pending verification found' });
      }
      
      // Check expiry
      if (new Date() > verificationData.expiresAt) {
        pendingVerifications.delete(email);
        return res.status(400).json({ error: 'Verification code expired' });
      }
      
      // Check code
      if (verificationData.verificationCode !== verificationCode) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }
      
      // Update user as verified
      await storage.updateUser(verificationData.userId, {
        isVerified: true,
        phoneVerified: true,
        updatedAt: new Date().toISOString()
      });
      
      // Generate auth token
      const authToken = generateAuthToken(verificationData.userId, email, true);
      
      // Set HTTP-only cookie
      res.cookie('authToken', authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      // Clean up verification data
      pendingVerifications.delete(email);
      
      console.log('✅ Phone verification successful for:', email);
      
      res.json({
        success: true,
        message: 'Phone verified successfully',
        authToken,
        user: {
          userId: verificationData.userId,
          email: email
        }
      });
      
    } catch (error: any) {
      console.error('❌ Phone verification error:', error);
      res.status(500).json({ error: 'Verification failed', details: error.message });
    }
  });

  // 3. Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      
      console.log('🔐 Login attempt for:', email);
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Check password
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate auth token
      const authToken = generateAuthToken(user.id, user.email, user.isVerified);
      
      // Set HTTP-only cookie
      res.cookie('authToken', authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      console.log('✅ Login successful for:', email);
      
      res.json({
        success: true,
        message: 'Login successful',
        authToken,
        user: {
          userId: user.id,
          email: user.email,
          isVerified: user.isVerified
        }
      });
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      res.status(500).json({ error: 'Login failed', details: error.message });
    }
  });

  // 4. User info endpoint
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        phoneVerified: user.phoneVerified,
        isAuthenticated: true
      });
      
    } catch (error: any) {
      console.error('❌ User info error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  });

  // 5. Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('authToken');
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // 6. Resend verification code
  app.post('/api/auth/resend-code', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }
      
      // Get verification data
      const verificationData = pendingVerifications.get(email);
      if (!verificationData) {
        return res.status(400).json({ error: 'No pending verification found' });
      }
      
      // Generate new code
      const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Update verification data
      verificationData.verificationCode = newVerificationCode;
      verificationData.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      pendingVerifications.set(email, verificationData);
      
      // Send SMS
      const smsResult = await sendVerificationSMS(verificationData.phoneNumber, newVerificationCode);
      
      res.json({
        success: true,
        message: 'New verification code sent',
        showVerificationCode: smsResult.showCode,
        verificationCode: smsResult.showCode ? smsResult.verificationCode : undefined
      });
      
    } catch (error: any) {
      console.error('❌ Resend code error:', error);
      res.status(500).json({ error: 'Failed to resend code' });
    }
  });

  // 7. Create trial checkout session (Stripe integration)
  app.post('/api/create-checkout-session', requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const { priceId } = req.body;
      
      const result = await stripeService.createTrialCheckoutSession(userId, priceId);
      
      res.json({
        success: true,
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl
      });
      
    } catch (error: any) {
      console.error('❌ Checkout session error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // 8. Handle payment success
  app.get('/payment-success', async (req, res) => {
    try {
      const { session_id } = req.query;
      
      if (!session_id) {
        return res.redirect('/pricing?error=missing_session');
      }
      
      const result = await stripeService.handlePaymentSuccess(session_id as string);
      
      if (result.success) {
        res.redirect('/trial-success');
      } else {
        res.redirect('/pricing?error=payment_failed');
      }
      
    } catch (error: any) {
      console.error('❌ Payment success error:', error);
      res.redirect('/pricing?error=processing_failed');
    }
  });

  // 9. Admin login (for testing)
  app.post('/api/auth/admin-login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Hardcoded admin credentials for testing
      if (email === 'timfulker@gmail.com' && password === 'admin123') {
        const authToken = generateAuthToken('43963086', 'timfulker@gmail.com', true);
        
        res.cookie('authToken', authToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        console.log('✅ Admin login successful');
        
        res.json({
          success: true,
          message: 'Admin login successful',
          authToken,
          user: {
            userId: '43963086',
            email: 'timfulker@gmail.com'
          }
        });
      } else {
        res.status(401).json({ error: 'Invalid admin credentials' });
      }
    } catch (error: any) {
      console.error('❌ Admin login error:', error);
      res.status(500).json({ error: 'Admin login failed' });
    }
  });

  console.log('✅ Clean authentication system configured with SMS and Stripe integration');
}