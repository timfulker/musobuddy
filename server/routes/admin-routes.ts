import { type Express } from "express";
import { storage } from "../core/storage";
import bcrypt from 'bcrypt';
import { EmailService } from "../core/services";
import { sanitizeInput } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { db } from "../core/database";
import { users } from '../../shared/schema';
import { eq, and, desc, sql, gte, inArray } from 'drizzle-orm';
// API usage tracking removed - unlimited AI usage for all users

export function registerAdminRoutes(app: Express) {
  console.log('🔧 Setting up admin routes...');

  // API Cost Monitoring endpoint
  app.get('/api/admin/api-costs', requireAdmin, async (req: any, res) => {
    try {
      console.log('📊 Fetching API cost monitoring data...');
      
      // Get API configurations and status
      console.log('🔍 GOOGLE_MAPS_SERVER_KEY status:', {
        exists: !!process.env.GOOGLE_MAPS_SERVER_KEY,
        keyLength: process.env.GOOGLE_MAPS_SERVER_KEY?.length || 0
      });
      
      const apiStatus = {
        mailgun: {
          configured: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN),
          domain: process.env.MAILGUN_DOMAIN || 'enquiries.musobuddy.com',
          keyPresent: !!process.env.MAILGUN_API_KEY,
          estimated_monthly_emails: 0, // Will be calculated based on user activity
        },
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          keyPresent: !!process.env.OPENAI_API_KEY,
          estimated_monthly_tokens: 0, // Will be calculated based on AI usage
        },
        stripe: {
          configured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY),
          keyPresent: !!process.env.STRIPE_SECRET_KEY,
          webhook_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
        },
        cloudflareR2: {
          configured: !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY),
          bucket: process.env.R2_BUCKET_NAME || 'musobuddy-docs',
          keyPresent: !!process.env.R2_ACCESS_KEY_ID,
        },
        googleMaps: {
          configured: !!process.env.GOOGLE_MAPS_SERVER_KEY,
          keyPresent: !!process.env.GOOGLE_MAPS_SERVER_KEY,
        },
        twilio: {
          configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
          keyPresent: !!process.env.TWILIO_ACCOUNT_SID,
        },
        what3words: {
          configured: !!process.env.WHAT3WORDS_API_KEY,
          keyPresent: !!process.env.WHAT3WORDS_API_KEY,
        },
        anthropic: {
          configured: !!process.env.ANTHROPIC_API_KEY,
          keyPresent: !!process.env.ANTHROPIC_API_KEY,
        }
      };

      // Get usage estimates from database
      try {
        const totalUsers = await storage.getTotalUserCount();
        const totalBookings = await storage.getTotalBookingCount();
        const totalContracts = await storage.getTotalContractCount();
        const totalInvoices = await storage.getTotalInvoiceCount();

        // Estimate monthly API costs based on realistic user activity
        const estimates = {
          mailgun: {
            monthly_emails: totalUsers * 10 * 30, // 10 emails per user per day * 30 days
            estimated_cost: (() => {
              const monthlyEmails = totalUsers * 10 * 30;
              console.log(`🔍 Mailgun calculation: ${totalUsers} users × 10 × 30 = ${monthlyEmails} emails`);
              if (monthlyEmails <= 50000) {
                console.log(`✅ Mailgun: ${monthlyEmails} emails <= 50k, cost = $35.00`);
                return 35.00; // $35 minimum plan for up to 50k emails
              } else {
                // Over 50k emails: $35 base + $1.30 per 1,000 additional emails
                const overageEmails = monthlyEmails - 50000;
                const overageThousands = Math.ceil(overageEmails / 1000);
                const cost = parseFloat((35 + (overageThousands * 1.30)).toFixed(2));
                console.log(`📧 Mailgun: ${monthlyEmails} emails > 50k, overage = ${overageEmails}, cost = $${cost}`);
                return cost;
              }
            })(),
          },
          openai: {
            monthly_tokens: totalUsers * 2000, // More realistic: ~2K tokens per user per month
            estimated_cost: parseFloat((totalUsers * 2000 * 0.000002).toFixed(2)), // $0.002 per 1K tokens
          },
          cloudflareR2: {
            monthly_storage_gb: Math.ceil((totalInvoices + totalContracts) * 0.001), // ~1MB per document
            monthly_requests: totalUsers * 50, // ~50 requests per user per month
            estimated_cost: parseFloat((((totalInvoices + totalContracts) * 0.001 * 0.015) + (totalUsers * 50 * 0.0000036)).toFixed(2)),
          },
          googleMaps: {
            monthly_requests: totalUsers * 5, // ~5 map requests per user per month (realistic usage)
            estimated_cost: parseFloat((totalUsers * 5 * 0.005).toFixed(2)), // $0.005 per request
          },
          twilio: {
            monthly_sms: Math.ceil(totalUsers * 0.2), // Some users may need re-verification
            estimated_cost: parseFloat((totalUsers * 0.2 * 0.0075).toFixed(2)), // $0.0075 per SMS (updated pricing)
          },
          stripe: {
            monthly_transactions: Math.ceil(totalUsers * 0.1), // Most users pay monthly, some yearly
            estimated_cost: parseFloat((totalUsers * 0.1 * 0.30).toFixed(2)), // $0.30 per transaction
          },
          anthropic: {
            monthly_tokens: totalUsers * 500, // Conservative estimate for AI usage
            estimated_cost: parseFloat((totalUsers * 500 * 0.000008).toFixed(2)), // Claude Haiku pricing
          },
          what3words: {
            monthly_requests: totalUsers * 1, // ~1 what3words request per user per month
            estimated_cost: parseFloat((totalUsers * 1 * 0.002).toFixed(2)), // $0.002 per request
          },
          // Subscription fees for services
          subscriptions: {
            services: [
              { name: 'Replit Core', monthly_cost: 20.00 },
              { name: 'Replit Database (included)', monthly_cost: 0.00 },
              { name: 'Cloudflare Pro', monthly_cost: 20.00 }
            ],
            estimated_cost: 40.00 // Total subscription fees: $20 + $0 + $20
          }
        };

        apiStatus.mailgun.estimated_monthly_emails = estimates.mailgun.monthly_emails;
        apiStatus.openai.estimated_monthly_tokens = estimates.openai.monthly_tokens;
        
        // Calculate costs for 500 users as well for planning
        const mailgun500 = 500 * 10 * 30; // 150,000 emails
        const mailgunCost500 = mailgun500 <= 50000 ? 35 : 35 + Math.ceil((mailgun500 - 50000) / 1000) * 1.30;
        const totalCost500 = mailgunCost500 + (500 * 0.002 * 0.008) + (500 * 50 * 0.0000036) + (500 * 5 * 0.005) + (500 * 0.2 * 0.0075) + (500 * 0.1 * 0.30) + (500 * 500 * 0.000008) + (500 * 1 * 0.002) + 40;
        
        console.log(`🔍 SCALING PROJECTION: With 500 users, monthly API costs would be ~$${totalCost500.toFixed(2)} (Mailgun alone: $${mailgunCost500})`);
        console.log(`🔍 CURRENT USERS: ${totalUsers}, SUBSCRIPTION TOTAL: $${estimates.subscriptions.estimated_cost}`);

        res.json({
          success: true,
          data: {
            api_status: apiStatus,
            usage_estimates: estimates,
            total_estimated_monthly_cost: parseFloat((
              estimates.mailgun.estimated_cost + 
              estimates.openai.estimated_cost + 
              estimates.cloudflareR2.estimated_cost + 
              estimates.googleMaps.estimated_cost + 
              estimates.twilio.estimated_cost +
              estimates.stripe.estimated_cost +
              estimates.anthropic.estimated_cost +
              estimates.what3words.estimated_cost +
              estimates.subscriptions.estimated_cost
            ).toFixed(2)),
            user_metrics: {
              total_users: totalUsers,
              total_bookings: totalBookings,
              total_contracts: totalContracts,
              total_invoices: totalInvoices
            },
            last_updated: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error('❌ Error calculating usage estimates:', error);
        res.json({
          success: true,
          data: {
            api_status: apiStatus,
            usage_estimates: {},
            total_estimated_monthly_cost: 0,
            user_metrics: {},
            last_updated: new Date().toISOString(),
            error: 'Could not calculate usage estimates'
          }
        });
      }

    } catch (error: any) {
      console.error('❌ Failed to fetch API cost data:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch API cost monitoring data',
        details: error.message 
      });
    }
  });

  // Temporary diagnostic endpoint for R2 configuration (no auth required for debugging)
  app.get('/api/debug/r2-status', async (req: any, res) => {
    const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
    const envStatus = requiredEnvVars.reduce((acc, varName) => {
      acc[varName] = {
        present: !!process.env[varName],
        length: process.env[varName]?.length || 0
      };
      return acc;
    }, {} as any);

    res.json({
      environment: process.env.NODE_ENV,
      r2Status: envStatus,
      missingVars: requiredEnvVars.filter(varName => !process.env[varName])
    });
  });
  
  // Admin: Regenerate widget tokens for specific users
  app.post('/api/admin/regenerate-widget-tokens', requireAdmin, async (req: any, res) => {
    try {
      const { emails } = req.body;
      if (!emails || !Array.isArray(emails)) {
        return res.status(400).json({ error: 'Emails array is required' });
      }
      
      const results = [];
      const jwt = await import('jsonwebtoken');
      const QRCode = await import('qrcode');
      
      for (const email of emails) {
        try {
          // Get user by email
          const user = await storage.getUserByEmail(email);
          if (!user) {
            results.push({ email, error: 'User not found' });
            continue;
          }
          
          // Generate new widget token
          const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
          if (!secret) {
            results.push({ email, error: 'Server configuration error: No JWT secret' });
            continue;
          }
          
          const token = jwt.default.sign(
            { userId: user.id, type: 'widget' },
            secret,
            { expiresIn: '30d' }
          );
          
          // Use R2-hosted widget system
          const { uploadWidgetToR2 } = await import('../widget-system/widget-storage');
          const uploadResult = await uploadWidgetToR2(user.id.toString(), token);
          
          if (!uploadResult.success) {
            results.push({ email, error: `Failed to upload widget: ${uploadResult.error}` });
            continue;
          }
          
          const widgetUrl = uploadResult.url!;
          const qrCodeDataUrl = uploadResult.qrCodeUrl!;
          
          results.push({
            email,
            success: true,
            userId: user.id,
            widgetUrl,
            qrCode: qrCodeDataUrl
          });
          
          console.log(`✅ Regenerated widget token for ${email} (ID: ${user.id})`);
        } catch (error: any) {
          console.error(`❌ Failed to regenerate token for ${email}:`, error);
          results.push({ email, error: error.message });
        }
      }
      
      res.json({ results });
    } catch (error: any) {
      console.error('❌ Widget token regeneration failed:', error);
      res.status(500).json({ error: 'Failed to regenerate widget tokens' });
    }
  });

  // Admin: Reset user widget (clear widget URL and QR code)
  app.post('/api/admin/reset-user-widget', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Get user info
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Reset widget data
      await storage.resetUserWidget(userId);
      
      console.log(`✅ Reset widget for user ${userId} (${user.email})`);
      res.json({ 
        success: true, 
        message: `Widget reset for user ${user.email}`,
        userId: userId
      });
    } catch (error: any) {
      console.error('❌ Failed to reset user widget:', error);
      res.status(500).json({ error: 'Failed to reset user widget' });
    }
  });

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
      const [contracts, invoices, bookings, messageNotifications] = await Promise.all([
        storage.getContracts(userId),
        storage.getInvoices(userId),
        storage.getBookings(userId),
        storage.getMessageNotifications(userId)
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
          .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0),
        // Message notification stats
        totalMessages: messageNotifications.length,
        unreadMessages: messageNotifications.filter(m => !m.isRead).length
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

  // API Usage Statistics endpoint
  app.get('/api/admin/api-usage-stats', requireAdmin, async (req: any, res) => {
    try {
      // Get usage statistics from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const totalStats = await db
        .select({
          totalRequests: sql<number>`count(*)`,
          totalCost: sql<number>`sum(estimated_cost)`,
        })
        .from(apiUsageTracking)
        .where(gte(apiUsageTracking.createdAt, thirtyDaysAgo));

      // Service breakdown
      const serviceStats = await db
        .select({
          apiService: apiUsageTracking.apiService,
          requests: sql<number>`count(*)`,
          totalCost: sql<number>`sum(estimated_cost)`,
          avgResponseTime: sql<number>`avg(response_time)`,
        })
        .from(apiUsageTracking)
        .where(gte(apiUsageTracking.createdAt, thirtyDaysAgo))
        .groupBy(apiUsageTracking.apiService);

      // Top users by usage
      const topUsers = await db
        .select({
          userId: apiUsageTracking.userId,
          requests: sql<number>`count(*)`,
          cost: sql<number>`sum(estimated_cost)`,
        })
        .from(apiUsageTracking)
        .where(gte(apiUsageTracking.createdAt, thirtyDaysAgo))
        .groupBy(apiUsageTracking.userId)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

      // Get user names
      const userIds = topUsers.map(user => user.userId);
      let usersData = [];
      let usersMap = {};
      
      if (userIds.length > 0) {
        usersData = await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
          .from(users)
          .where(inArray(users.id, userIds));

        usersMap = usersData.reduce((acc, user) => {
          acc[user.id] = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
          return acc;
        }, {} as Record<string, string>);
      }

      const topUsersWithNames = topUsers.map(user => ({
        ...user,
        userName: usersMap[user.userId] || 'Unknown User'
      }));

      const serviceBreakdown = serviceStats.reduce((acc, service) => {
        acc[service.apiService] = {
          requests: service.requests,
          cost: service.totalCost,
          avgResponseTime: Math.round(service.avgResponseTime || 0)
        };
        return acc;
      }, {} as Record<string, any>);

      res.json({
        totalRequests: totalStats[0]?.totalRequests || 0,
        totalCost: totalStats[0]?.totalCost || 0,
        topUsers: topUsersWithNames,
        serviceBreakdown
      });

    } catch (error) {
      console.error('❌ Error fetching API usage stats:', error);
      res.status(500).json({ error: 'Failed to fetch API usage statistics' });
    }
  });

  // User API Usage Data endpoint
  app.get('/api/admin/api-usage-data', requireAdmin, async (req: any, res) => {
    try {
      // Get all users with their API limits
      const allUsers = await db.select().from(users);
      const allLimits = await db.select().from(apiUsageLimits);
      
      // Get usage data for the last 30 days for cost calculation
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentUsage = await db
        .select({
          userId: apiUsageTracking.userId,
          apiService: apiUsageTracking.apiService,
          totalCost: sql<number>`sum(estimated_cost)`,
          lastActivity: sql<Date>`max(created_at)`
        })
        .from(apiUsageTracking)
        .where(gte(apiUsageTracking.createdAt, thirtyDaysAgo))
        .groupBy(apiUsageTracking.userId, apiUsageTracking.apiService);

      const usageData = allUsers.reduce((acc, user) => {
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        const userLimits = allLimits.filter(limit => limit.userId === user.id);
        const userUsage = recentUsage.filter(usage => usage.userId === user.id);

        const services = userLimits.reduce((serviceAcc, limit) => {
          const usage = userUsage.find(u => u.apiService === limit.apiService);
          serviceAcc[limit.apiService] = {
            dailyUsage: limit.dailyUsage,
            dailyLimit: limit.dailyLimit,
            monthlyUsage: limit.monthlyUsage,
            monthlyLimit: limit.monthlyLimit,
            isBlocked: limit.isBlocked,
            blockReason: limit.blockReason,
            totalCost: usage?.totalCost || 0,
            lastActivity: usage?.lastActivity || null
          };
          return serviceAcc;
        }, {} as Record<string, any>);

        // API usage limits removed - unlimited AI usage for all users

        acc[user.id] = {
          userId: user.id,
          userName,
          services
        };
        return acc;
      }, {} as Record<string, any>);

      res.json(usageData);

    } catch (error) {
      console.error('❌ Error fetching API usage data:', error);
      res.status(500).json({ error: 'Failed to fetch API usage data' });
    }
  });

  // Update user API limits
  app.post('/api/admin/update-api-limits', requireAdmin, async (req: any, res) => {
    try {
      const { userId, service, dailyLimit, monthlyLimit } = req.body;

      if (!userId || !service || !dailyLimit || !monthlyLimit) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Update or create limits
      await db
        .insert(apiUsageLimits)
        .values({
          userId,
          apiService: service,
          dailyLimit: Number(dailyLimit),
          monthlyLimit: Number(monthlyLimit),
          dailyUsage: 0,
          monthlyUsage: 0,
          lastResetDaily: new Date(),
          lastResetMonthly: new Date(),
        })
        .onConflictDoUpdate({
          target: [apiUsageLimits.userId, apiUsageLimits.apiService],
          set: {
            dailyLimit: Number(dailyLimit),
            monthlyLimit: Number(monthlyLimit),
            updatedAt: new Date(),
          }
        });

      console.log(`✅ Updated API limits for user ${userId}, service ${service}: ${dailyLimit}/day, ${monthlyLimit}/month`);
      res.json({ success: true });

    } catch (error) {
      console.error('❌ Error updating API limits:', error);
      res.status(500).json({ error: 'Failed to update API limits' });
    }
  });

  // Block/unblock user API access
  app.post('/api/admin/block-user-api', requireAdmin, async (req: any, res) => {
    try {
      const { userId, service, isBlocked, blockReason } = req.body;

      if (!userId || !service) {
        return res.status(400).json({ error: 'Missing userId or service' });
      }

      await db
        .update(apiUsageLimits)
        .set({
          isBlocked: Boolean(isBlocked),
          blockReason: blockReason || null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(apiUsageLimits.userId, userId),
          eq(apiUsageLimits.apiService, service)
        ));

      console.log(`✅ ${isBlocked ? 'Blocked' : 'Unblocked'} user ${userId} for service ${service}${isBlocked ? `: ${blockReason}` : ''}`);
      res.json({ success: true });

    } catch (error) {
      console.error('❌ Error blocking/unblocking user:', error);
      res.status(500).json({ error: 'Failed to update user block status' });
    }
  });

  // Reset usage counters
  app.post('/api/admin/reset-api-usage', requireAdmin, async (req: any, res) => {
    try {
      const { userId, service, resetDaily, resetMonthly } = req.body;

      if (!userId || !service) {
        return res.status(400).json({ error: 'Missing userId or service' });
      }

      const updates: any = { updatedAt: new Date() };
      
      if (resetDaily) {
        updates.dailyUsage = 0;
        updates.lastResetDaily = new Date();
      }
      
      if (resetMonthly) {
        updates.monthlyUsage = 0;
        updates.lastResetMonthly = new Date();
      }

      await db
        .update(apiUsageLimits)
        .set(updates)
        .where(and(
          eq(apiUsageLimits.userId, userId),
          eq(apiUsageLimits.apiService, service)
        ));

      console.log(`✅ Reset ${resetDaily ? 'daily' : ''}${resetDaily && resetMonthly ? ' and ' : ''}${resetMonthly ? 'monthly' : ''} usage for user ${userId}, service ${service}`);
      res.json({ success: true });

    } catch (error) {
      console.error('❌ Error resetting usage counters:', error);
      res.status(500).json({ error: 'Failed to reset usage counters' });
    }
  });

  console.log('✅ Admin routes configured');
}