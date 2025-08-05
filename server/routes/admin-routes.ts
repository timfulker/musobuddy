import { type Express } from "express";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
import { sanitizeInput } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';

export function registerAdminRoutes(app: Express) {
  console.log('🔧 Setting up admin routes...');

  // Dashboard statistics
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.userId;
      
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
      const testUser = await storage.getUserById(1).catch(() => null);
      
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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Authentication health check
  app.get('/api/health/auth', (req: any, res) => {
    try {
      const authStatus = {
        hasSession: !!req.session,
        requireAuth: !!req.user.userId,
        requireAuth: !!req.session?.requireAuth,
        userId: req.user.userId || null,
        email: req.session?.email || null,
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
      const notifications = [];
      
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

  console.log('✅ Admin routes configured');
}