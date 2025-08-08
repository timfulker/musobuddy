// Health Check Routes for System Monitoring
import { type Express } from "express";
import { db } from "../core/database";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
import { requireAdmin } from "../middleware/auth";

export function registerHealthRoutes(app: Express) {
  console.log('🏥 Setting up health check routes...');

  // Database health check
  app.get('/api/health/database', async (req, res) => {
    try {
      // Test database connectivity with a simple query
      const result = await db.query('SELECT 1 as test');
      
      if (result.rows && result.rows.length > 0) {
        res.json({
          status: 'healthy',
          message: 'Database connected',
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Database query returned no results');
      }
    } catch (error: any) {
      console.error('❌ Database health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        message: error.message || 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Email service health check
  app.get('/api/health/email', async (req, res) => {
    try {
      const emailService = new EmailService();
      
      // Check if Mailgun is configured
      const mailgunApiKey = process.env.MAILGUN_API_KEY;
      const mailgunDomain = process.env.MAILGUN_DOMAIN;
      
      if (!mailgunApiKey || !mailgunDomain) {
        throw new Error('Email service not configured');
      }
      
      // Simple validation that service is initialized
      res.json({
        status: 'healthy',
        message: 'Email service configured',
        provider: 'Mailgun',
        domain: mailgunDomain,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Email health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        message: error.message || 'Email service unavailable',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Cloud storage (R2) health check
  app.get('/api/health/storage', async (req, res) => {
    try {
      // Check if R2 credentials are configured
      const r2AccountId = process.env.R2_ACCOUNT_ID;
      const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
      const r2BucketName = process.env.R2_BUCKET_NAME;
      
      if (!r2AccountId || !r2AccessKey || !r2BucketName) {
        throw new Error('Cloud storage not configured');
      }
      
      res.json({
        status: 'healthy',
        message: 'Cloud storage configured',
        provider: 'Cloudflare R2',
        bucket: r2BucketName,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Storage health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        message: error.message || 'Cloud storage unavailable',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Authentication service health check
  app.get('/api/auth/verify', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      
      if (!token) {
        return res.status(401).json({
          status: 'unhealthy',
          message: 'No authentication token provided',
          timestamp: new Date().toISOString()
        });
      }
      
      // Import auth middleware functions
      const { verifyAuthToken } = await import('../middleware/auth');
      const decoded = verifyAuthToken(token);
      
      if (!decoded) {
        return res.status(401).json({
          status: 'unhealthy',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        status: 'healthy',
        message: 'Token valid',
        userId: decoded.userId,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Auth verification failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        message: error.message || 'Authentication service error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Combined system health check (admin only)
  app.get('/api/health/system', requireAdmin, async (req, res) => {
    const healthChecks = {
      database: { status: 'checking' },
      email: { status: 'checking' },
      storage: { status: 'checking' },
      authentication: { status: 'checking' }
    };
    
    // Check database
    try {
      await db.query('SELECT 1');
      healthChecks.database = { status: 'healthy' };
    } catch (error) {
      healthChecks.database = { status: 'unhealthy', error: 'Connection failed' };
    }
    
    // Check email
    try {
      if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
        healthChecks.email = { status: 'healthy' };
      } else {
        healthChecks.email = { status: 'unhealthy', error: 'Not configured' };
      }
    } catch (error) {
      healthChecks.email = { status: 'unhealthy', error: 'Service error' };
    }
    
    // Check storage
    try {
      if (process.env.R2_ACCESS_KEY_ID && process.env.R2_BUCKET_NAME) {
        healthChecks.storage = { status: 'healthy' };
      } else {
        healthChecks.storage = { status: 'unhealthy', error: 'Not configured' };
      }
    } catch (error) {
      healthChecks.storage = { status: 'unhealthy', error: 'Service error' };
    }
    
    // Check authentication
    try {
      if (process.env.SESSION_SECRET || process.env.JWT_SECRET) {
        healthChecks.authentication = { status: 'healthy' };
      } else {
        healthChecks.authentication = { status: 'unhealthy', error: 'Not configured' };
      }
    } catch (error) {
      healthChecks.authentication = { status: 'unhealthy', error: 'Service error' };
    }
    
    const overallStatus = Object.values(healthChecks).every(check => 
      (check as any).status === 'healthy'
    ) ? 'healthy' : 'degraded';
    
    res.json({
      status: overallStatus,
      services: healthChecks,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  console.log('✅ Health check routes configured');
}