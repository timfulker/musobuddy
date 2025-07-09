import { type Express, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface User {
  id: string;
  email: string;
  name: string;
  businessName?: string;
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

// Hash password utility
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

// Verify password utility
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      name: user.name,
      subscriptionTier: user.subscriptionTier 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Authentication middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.header('Authorization')?.replace('Bearer ', '') || 
                req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token.' });
  }

  (req as AuthenticatedRequest).user = decoded;
  next();
}

// Setup production authentication routes
export function setupProductionAuth(app: Express) {
  // User registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, businessName } = req.body;

      // Validate input
      if (!email || !password || !name) {
        return res.status(400).json({ message: 'Email, password, and name are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        businessName,
        subscriptionTier: 'free'
      });

      // Generate token
      const token = generateToken(user);

      // Set secure cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'strict'
      });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          businessName: user.businessName,
          subscriptionTier: user.subscriptionTier
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // User login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = generateToken(user);

      // Set secure cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'strict'
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          businessName: user.businessName,
          subscriptionTier: user.subscriptionTier
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // User logout
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ message: 'Logged out successfully' });
  });

  // Get current user
  app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const fullUser = await storage.getUser(user.id);
      
      res.json({
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        businessName: fullUser.businessName,
        subscriptionTier: fullUser.subscriptionTier
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Password reset request
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // In production, send email with reset link
      // For now, return success message
      res.json({ message: 'Password reset email sent' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
}

// Subscription tier check middleware
export function requireSubscription(tier: 'premium' | 'enterprise') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    
    if (user.subscriptionTier === 'free' && tier !== 'free') {
      return res.status(403).json({ 
        message: 'This feature requires a premium subscription',
        requiredTier: tier,
        currentTier: user.subscriptionTier
      });
    }
    
    if (user.subscriptionTier === 'premium' && tier === 'enterprise') {
      return res.status(403).json({ 
        message: 'This feature requires an enterprise subscription',
        requiredTier: tier,
        currentTier: user.subscriptionTier
      });
    }
    
    next();
  };
}