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

  // Email preview endpoint for testing HTML templates
  app.get('/email-preview', (req, res) => {
    const emailPreview = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NEW SIMPLE EMAIL TEMPLATE</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #ddd;">
        <div style="background-color: #1e3a8a; color: #ffffff; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px;">Saxophone for your wedding at The Suncliff Hotel, Bournemouth</h1>
        </div>
        <div style="padding: 30px;">
            <p style="margin: 0 0 16px 0; line-height: 1.6;">Hi Tim,</p>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">Thank you for your inquiry about booking a saxophone player for your upcoming wedding at The Suncliff Hotel in Bournemouth on Friday, February 27th, 2026.</p>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">I'd be delighted to provide my professional saxophone services for your special day. As an experienced wedding musician, I can offer a range of packages to suit your needs:</p>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">2 hours of saxophone: £250<br>
            3 hours of saxophone: £310<br>
            4 hours of saxophone: £370</p>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">These packages can be customized to cover different segments of your wedding, such as the ceremony, drinks reception, wedding breakfast, and evening entertainment. I'm happy to work with you to create the perfect musical accompaniment for your celebration.</p>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">My saxophone setup includes high-quality equipment and I have full public liability insurance coverage. I'm also experienced in adapting to various venue requirements to ensure a seamless performance.</p>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">If you'd like to discuss further or have any other questions, please don't hesitate to let me know. I look forward to hearing from you and being a part of your special day.</p>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">Best regards,<br>
            Tim Fulker<br>
            Saxophone Musician<br>
            www.saxdj.co.uk<br>
            07764190034<br>
            timfulkermusic@gmail.com</p>
            
            <div style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border: 1px solid #eee;">
                <p style="margin: 0; text-align: center;"><strong>Tim Fulker</strong></p>
                <p style="margin: 5px 0 0 0; text-align: center; color: #666;">Professional Music Services</p>
                <p style="margin: 5px 0 0 0; text-align: center; color: #1e3a8a;">timfulkermusic@gmail.com</p>
            </div>
        </div>
        <div style="background-color: #333; color: #999; padding: 15px; text-align: center; font-size: 11px;">
            Sent via MusoBuddy Music Management
        </div>
    </div>
</body>
</html>`;
    res.send(emailPreview);
  });

  console.log('✅ Health check routes configured');
}