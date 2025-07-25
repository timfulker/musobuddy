import { type Express } from "express";
import bcrypt from "bcrypt";
import { storage } from "../core/storage";

// Bulletproof authentication system - designed for production stability
export async function setupSimpleAuth(app: Express): Promise<void> {
  console.log('🔐 Setting up bulletproof authentication system...');

  // Simple session-based authentication middleware
  app.use(async (req: any, res, next) => {
    try {
      // Check for valid session with user ID
      if (req.session?.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          req.user = user;
        }
      }
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      next(); // Continue even if auth check fails
    }
  });

  console.log('✅ Bulletproof authentication setup complete');
}

// Production-ready authentication middleware
export function requireAuth(req: any, res: any, next: any) {
  if (req.user) {
    return next();
  }
  
  // Always return JSON for API calls
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Redirect browser requests to login
  return res.redirect('/login');
}

// Admin access middleware
export function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.isAdmin) {
    return next();
  }
  
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  return res.redirect('/login');
}

// Login route handler
export async function handleLogin(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email and password required' };
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    const isValid = await bcrypt.compare(password, user.password || '');
    if (!isValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    return { 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tier: user.tier,
        isAdmin: user.isAdmin
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
  }
}