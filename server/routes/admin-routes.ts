import { type Express } from "express";
import { storage } from "../core/storage";
import bcrypt from 'bcrypt';
import { EmailService } from "../core/services";
import { sanitizeInput } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';

export function registerAdminRoutes(app: Express) {
  console.log('🔧 Setting up admin routes...');

  // Admin overview statistics
  app.get('/api/admin/overview', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get actual system-wide statistics from database
      const [allUsers, allBookings, allContracts, allInvoices] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllBookings(),
        storage.getAllContracts(),
        storage.getAllInvoices()
      ]);

      const overview = {
        totalUsers: allUsers.length,
        totalBookings: allBookings.length,
        totalContracts: allContracts.length,
        totalInvoices: allInvoices.length,
        systemHealth: 'healthy',
        databaseStatus: 'connected'
      };

      console.log(`✅ Generated admin overview for user ${userId}`);
      res.json(overview);
      
    } catch (error) {
      console.error('❌ Failed to generate admin overview:', error);
      res.status(500).json({ error: 'Failed to generate admin overview' });
    }
  });

  // Admin users list
  app.get('/api/admin/users', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get all users from database
      const users = await storage.getAllUsers();

      console.log(`✅ Retrieved ${users.length} users from database`);
      res.json(users);
      
    } catch (error) {
      console.error('❌ Failed to get users:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // Dashboard statistics
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get all data for the user
      const [contracts, invoices, bookings] = await Promise.all([
        storage.getContracts(userId),
        storage.getInvoices(userId),
        storage.getBookings(userId)
      ]);
      
      // Calculate statistics
      const stats = {
        totalContracts: contracts.length,
        signedContracts: contracts.filter(c => c.status === 'signed').length,
        pendingContracts: contracts.filter(c => c.status === 'sent').length,
        totalInvoices: invoices.length,
        paidInvoices: invoices.filter(i => i.status === 'paid').length,
        overdueInvoices: invoices.filter(i => {
          if (i.status === 'paid') return false;
          return new Date(i.dueDate) < new Date();
        }).length,
        totalBookings: bookings.length,
        confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
        pendingBookings: bookings.filter(b => b.status === 'new' || b.status === 'in progress').length,
        totalRevenue: invoices
          .filter(i => i.status === 'paid')
          .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0),
        pendingRevenue: invoices
          .filter(i => i.status !== 'paid')
          .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0)
      };
      
      console.log(`✅ Generated dashboard stats for user ${userId}`);
      res.json(stats);
      
    } catch (error) {
      console.error('❌ Failed to generate dashboard stats:', error);
      res.status(500).json({ error: 'Failed to generate dashboard statistics' });
    }
  });

  // System health check
  app.get('/api/health/system', async (req: any, res) => {
    try {
      // Test database connection
      const testUser = await storage.getUserById("1").catch(() => null);
      
      // Test email service (without sending)
      const emailService = new EmailService();
      const emailConfigured = !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
      
      // Test cloud storage
      const cloudConfigured = !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID);
      
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: { status: 'connected', message: 'Database connection successful' },
          email: { 
            status: emailConfigured ? 'configured' : 'not_configured', 
            message: emailConfigured ? 'Email service configured' : 'Email service not configured' 
          },
          cloudStorage: { 
            status: cloudConfigured ? 'configured' : 'not_configured', 
            message: cloudConfigured ? 'Cloud storage configured' : 'Cloud storage not configured' 
          }
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isProduction: !!process.env.REPLIT_DEPLOYMENT
        }
      };
      
      res.json(healthStatus);
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // Authentication health check
  app.get('/api/health/auth', (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const authStatus = {
        isAuthenticated: !!userId,
        userId: userId || null,
        timestamp: new Date().toISOString()
      };
      
      res.json(authStatus);
      
    } catch (error) {
      console.error('❌ Auth health check failed:', error);
      res.status(500).json({
        error: 'Auth health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Notifications (placeholder)
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      // This could be expanded to include real notifications
      // For now, return empty array
      const notifications: any[] = [];
      
      res.json(notifications);
      
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // Test endpoints for development
  if (process.env.NODE_ENV === 'development') {
    // Test CORS
    app.get('/api/test-cors', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.json({ 
        message: 'CORS test successful', 
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
      });
    });

    app.post('/api/test-cors', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.json({ 
        message: 'CORS POST test successful', 
        body: req.body,
        timestamp: new Date().toISOString()
      });
    });

    // Simple test route
    app.get('/test-route', (req, res) => {
      res.json({ 
        message: 'Test route working', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      });
    });
  }

  // Admin create user
  app.post('/api/admin/users', requireAdmin, sanitizeInput, asyncHandler(async (req: any, res: any) => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { email, firstName, lastName, password, tier, isAdmin, isBetaTester, phoneVerified } = req.body;

      if (!email || !firstName) {
        return res.status(400).json({ error: 'Email and first name are required' });
      }

      // Generate a temporary password if not provided
      const finalPassword = password || `temp${Math.random().toString(36).slice(2, 10)}`;

      // Hash password before creating user
      const hashedPassword = await bcrypt.hash(finalPassword, 10);
      
      // Generate user ID - proper format matching existing users
      const userId = Date.now().toString();
      
      // Create new user with admin privileges (bypass verification if specified)
      const newUser = await storage.createUser({
        id: userId,
        email,
        password: hashedPassword,
        firstName: firstName,
        lastName: lastName || '',
        tier: tier || 'free',
        isAdmin: isAdmin || false,
        phoneVerified: phoneVerified || false
      });

      console.log(`✅ Admin ${adminId} created new user: ${email}`);
      res.json({ success: true, user: newUser });
      
    } catch (error: any) {
      console.error('❌ DETAILED USER CREATION ERROR:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        requestBody: req.body
      });
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      res.status(500).json({ 
        error: 'Failed to create user',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }));

  // Admin update user
  app.patch('/api/admin/users/:id', requireAdmin, sanitizeInput, asyncHandler(async (req: any, res: any) => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const updates = req.body;

      const updatedUser = await storage.updateUser(id, updates);
      
      console.log(`✅ Admin ${adminId} updated user: ${id}`);
      res.json({ success: true, user: updatedUser });
      
    } catch (error: any) {
      console.error('❌ Failed to update user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }));

  // Admin delete user
  app.delete('/api/admin/users/:id', requireAdmin, asyncHandler(async (req: any, res: any) => {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (id === adminId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await storage.deleteUserAccount(id);
      
      console.log(`✅ Admin ${adminId} deleted user: ${id}`);
      res.json({ success: true });
      
    } catch (error: any) {
      console.error('❌ Failed to delete user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }));

  console.log('✅ Admin routes configured');
}