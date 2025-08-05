import { type Express } from "express";
import { storage } from "../core/storage";
import { authRateLimit } from '../middleware/rateLimiting';
import { validateBody, sanitizeInput } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

// Simple working signup that bypasses session middleware conflicts
export function registerSimpleAuth(app: Express) {
  console.log('🔐 Setting up simple auth routes...');

  // Working signup endpoint
  app.post('/api/auth/simple-signup', 
    authRateLimit,
    sanitizeInput,
    validateBody(z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email('Invalid email format'),
      phoneNumber: z.string().min(10, 'Valid phone number is required'),
      password: z.string().min(6, 'Password must be at least 6 characters')
    })),
    asyncHandler(async (req: any, res) => {
      try {
        const { firstName, lastName, email, phoneNumber, password } = req.body;
        
        console.log('🔐 Simple signup attempt for:', email);
        
        // Check if user already exists
        const existingUser = await storage.findUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ error: 'User already exists' });
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
        
        console.log('✅ User created successfully:', newUser.email);
        
        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store verification in temporary storage (bypass session)
        const verificationData = {
          userId,
          email,
          verificationCode,
          phoneNumber,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        };
        
        // Use simple in-memory storage for verification
        global.pendingVerifications = global.pendingVerifications || new Map();
        global.pendingVerifications.set(email, verificationData);
        
        // Send SMS verification (development mode shows code)
        const isProduction = process.env.NODE_ENV === 'production' && process.env.REPLIT_DEPLOYMENT;
        
        if (!isProduction) {
          return res.json({
            success: true,
            message: 'Account created successfully',
            showVerificationCode: true,
            verificationCode: verificationCode,
            nextStep: 'verify-phone'
          });
        } else {
          // TODO: Send actual SMS in production
          return res.json({
            success: true,
            message: 'Account created successfully. Check your phone for verification code.',
            nextStep: 'verify-phone'
          });
        }
        
      } catch (error: any) {
        console.error('❌ Simple signup error:', error);
        res.status(500).json({ error: 'Signup failed', details: error.message });
      }
    })
  );

  // Simple phone verification
  app.post('/api/auth/verify-phone',
    authRateLimit,
    sanitizeInput,
    validateBody(z.object({
      email: z.string().email(),
      verificationCode: z.string().length(6)
    })),
    asyncHandler(async (req: any, res) => {
      try {
        const { email, verificationCode } = req.body;
        
        // Get verification data
        const pendingVerifications = global.pendingVerifications || new Map();
        const verificationData = pendingVerifications.get(email);
        
        if (!verificationData) {
          return res.status(400).json({ error: 'No pending verification found' });
        }
        
        // Check expiry
        if (new Date() > new Date(verificationData.expiresAt)) {
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
        
        // Create session manually
        req.session = req.session || {};
        req.session.userId = verificationData.userId;
        req.session.email = email;
        req.session.isAuthenticated = true;
        req.session.phoneVerified = true;
        
        // Clean up verification data
        pendingVerifications.delete(email);
        
        console.log('✅ Phone verification successful for:', email);
        
        res.json({
          success: true,
          message: 'Phone verified successfully',
          userId: verificationData.userId,
          email: email
        });
        
      } catch (error: any) {
        console.error('❌ Phone verification error:', error);
        res.status(500).json({ error: 'Verification failed', details: error.message });
      }
    })
  );

  console.log('✅ Simple auth routes configured');
}