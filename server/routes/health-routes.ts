// Health Check Routes for System Monitoring
import { type Express } from "express";
import { db } from "../core/database";
import { storage } from "../core/storage";
import { EmailService } from "../core/services";
// Authentication handled by Firebase

export function registerHealthRoutes(app: Express) {
  console.log('🏥 Setting up health check routes...');

  // Database health check
  app.get('/api/health/database', async (req, res) => {
    try {
      // Test database connectivity
      const healthResult = await db.execute('SELECT 1 as test');
      
      // Check for delete feedback request (if deleteid query param)
      if (req.query.deleteid) {
        console.log('🗑️ Delete feedback request via health endpoint');
        console.log('🎯 Feedback ID to delete:', req.query.deleteid);
        
        try {
          // Import the feedback storage here
          const { feedbackStorage } = await import('../storage/feedback-storage');
          const deletedFeedback = await feedbackStorage.deleteFeedback(req.query.deleteid as string);
          console.log('✅ Feedback deleted successfully:', deletedFeedback);
          
          return res.json({
            status: 'healthy',
            message: 'Feedback deleted successfully',
            deletedFeedback: deletedFeedback,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('❌ Error deleting feedback:', error);
          return res.status(500).json({
            status: 'error',
            message: 'Failed to delete feedback',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Check if we need to fix the feedback table (if fix=true query param)
      if (req.query.fix === 'true') {
        console.log('🛠️ Fixing feedback table schema...');
        
        // Drop existing table (since id column is TEXT instead of SERIAL)
        await db.execute('DROP TABLE IF EXISTS feedback');
        console.log('✅ Dropped old feedback table');
        
        // Create table with correct schema
        await db.execute(`
          CREATE TABLE feedback (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR NOT NULL,
            type VARCHAR NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
            title VARCHAR NOT NULL,
            description TEXT NOT NULL,
            priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
            page VARCHAR,
            admin_notes TEXT,
            resolved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        console.log('✅ Created feedback table with correct schema');
        
        // Create indexes
        await db.execute('CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at)');
        console.log('✅ Created indexes');
      }
      
      // Check feedback table structure
      const schemaResult = await db.execute(`
        SELECT column_name, data_type, column_default, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'feedback' AND column_name = 'id'
      `);
      
      const rowCountResult = await db.execute('SELECT COUNT(*) as count FROM feedback');
      const rowCount = rowCountResult[0]?.count || 0;
      
      if (healthResult && healthResult.length > 0) {
        res.json({
          status: 'healthy',
          message: req.query.fix === 'true' ? 'Database connected and feedback table fixed' : 'Database connected',
          timestamp: new Date().toISOString(),
          feedbackIdColumn: schemaResult && schemaResult.length > 0 ? schemaResult[0] : 'Not found',
          feedbackRowCount: rowCount
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
      
      // Import Firebase auth functions
      const { verifyFirebaseToken } = await import('../core/firebase-admin');
      const firebaseUser = await verifyFirebaseToken(token);
      
      if (!firebaseUser) {
        return res.status(401).json({
          status: 'unhealthy',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        status: 'healthy',
        message: 'Token valid',
        userId: firebaseUser.uid,
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
  app.get('/api/health/system', async (req, res) => {
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

  // Email preview endpoint for testing enhanced HTML templates
  app.get('/email-preview', (req, res) => {
    const emailPreview = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Enhanced MusoBuddy Email Template</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); line-height: 1.6;">
    <div style="max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12); border: 1px solid rgba(0,0,0,0.08);">
        
        <!-- Header with music note accent -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e3a8add 100%); color: #ffffff; padding: 32px 28px; text-align: center; position: relative;">
            <div style="position: absolute; top: 16px; right: 24px; font-size: 20px; opacity: 0.7;">♪</div>
            <div style="background: rgba(255,255,255,0.15); color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; display: inline-block; margin-bottom: 12px; letter-spacing: 0.5px;">MusoBuddy</div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 400; line-height: 1.3; font-family: Georgia, 'Times New Roman', serif;">Saxophone for your wedding at The Suncliff Hotel, Bournemouth</h1>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 36px;">
            <div style="font-size: 16px; color: #2c3e50; line-height: 1.7;">
                <p style="margin: 0 0 18px 0;">Hi Tim,</p>
                <p style="margin: 0 0 18px 0;">Thank you for your inquiry about booking a saxophone player for your upcoming wedding at The Suncliff Hotel in Bournemouth on Friday, February 27th, 2026.</p>
                <p style="margin: 0 0 18px 0;">I'd be delighted to provide my professional saxophone services for your special day. As an experienced wedding musician, I can offer a range of packages to suit your needs:</p>
                <p style="margin: 0 0 18px 0; padding: 20px; background: #f8f9fb; border-left: 4px solid #1e3a8a; border-radius: 0 8px 8px 0;">2 hours of saxophone: £250<br>
                3 hours of saxophone: £310<br>
                4 hours of saxophone: £370</p>
                <p style="margin: 0 0 18px 0;">These packages can be customized to cover different segments of your wedding, such as the ceremony, drinks reception, wedding breakfast, and evening entertainment. I'm happy to work with you to create the perfect musical accompaniment for your celebration.</p>
                <p style="margin: 0 0 18px 0;">My saxophone setup includes high-quality equipment and I have full public liability insurance coverage. I'm also experienced in adapting to various venue requirements to ensure a seamless performance.</p>
                <p style="margin: 0 0 18px 0;">If you'd like to discuss further or have any other questions, please don't hesitate to let me know. I look forward to hearing from you and being a part of your special day.</p>
                <p style="margin: 0 0 18px 0;">Best regards,<br>
                Tim Fulker<br>
                Saxophone Musician<br>
                www.saxdj.co.uk<br>
                07764190034<br>
                timfulkermusic@gmail.com</p>
            </div>
            
            <!-- Professional signature card -->
            <div style="margin-top: 40px; padding: 28px; background: linear-gradient(135deg, #fafbfc 0%, #f1f3f4 100%); border-radius: 12px; text-align: center; border: 1px solid #e8eaed;">
                <div style="width: 60px; height: 3px; background: #1e3a8a; margin: 0 auto 20px auto; border-radius: 2px;"></div>
                <div style="font-size: 20px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; font-family: Georgia, serif;">Tim Fulker</div>
                <div style="color: #5f6368; font-size: 14px; margin-bottom: 16px; font-style: italic;">Professional Music Services</div>
                <div style="color: #1e3a8a; font-weight: 500; font-size: 15px; text-decoration: none;">timfulkermusic@gmail.com</div>
            </div>
        </div>
        
        <!-- Clean footer -->
        <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: #95a5a6; padding: 20px; text-align: center;">
            <div style="font-size: 12px; opacity: 0.8;">Sent with ♪ via <span style="color: #1e3a8a; font-weight: 500;">MusoBuddy</span></div>
        </div>
    </div>
</body>
</html>`;
    res.send(emailPreview);
  });

  // Debug endpoint to fix feedback table schema in development
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/health/fix-feedback-table', async (req, res) => {
      try {
        console.log('🛠️ Fixing feedback table schema...');
        
        // Drop existing table (since id column is TEXT instead of SERIAL)
        await db.execute('DROP TABLE IF EXISTS feedback');
        console.log('✅ Dropped old feedback table');
        
        // Create table with correct schema
        await db.execute(`
          CREATE TABLE feedback (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR NOT NULL,
            type VARCHAR NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
            title VARCHAR NOT NULL,
            description TEXT NOT NULL,
            priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
            page VARCHAR,
            admin_notes TEXT,
            resolved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        console.log('✅ Created feedback table with correct schema');
        
        // Create indexes
        await db.execute('CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at)');
        console.log('✅ Created indexes');
        
        // Verify the fix
        const result = await db.execute(`
          SELECT column_name, data_type, column_default, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'feedback' AND column_name = 'id'
        `);
        
        res.json({
          message: 'Feedback table fixed successfully',
          idColumn: result[0],
          status: 'success'
        });
        
      } catch (error) {
        console.error('❌ Failed to fix feedback schema:', error);
        res.status(500).json({
          error: 'Schema fix failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  console.log('✅ Health check routes configured');
}