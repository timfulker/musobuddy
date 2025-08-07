import type { Express } from "express";
import { setupAuthRoutes } from "./auth-clean";
import { registerContractRoutes } from "./contract-routes";
import { registerInvoiceRoutes } from "./invoice-routes";
import { registerBookingRoutes } from "./booking-routes";
import { registerSettingsRoutes } from "./settings-routes";
import { registerAdminRoutes } from "./admin-routes";
import { registerIsolatedRoutes } from "./isolated-routes";
import { registerStripeRoutes } from "./stripe-routes";
import { registerClientRoutes } from "./client-routes";
import { registerFeedbackRoutes } from "./feedback-routes";
import { registerUnparseableRoutes } from "./unparseable-routes";
import { registerComplianceRoutes } from "./compliance-routes";
import { registerHealthRoutes } from "./health-routes";
import { requireAuth } from '../middleware/auth';

export async function registerRoutes(app: Express) {
  console.log('🔄 Registering all modular routes...');
  
  // Setup clean JWT-based authentication (replaces session-based auth)
  setupAuthRoutes(app);
  
  // CRITICAL FIX: Register Stripe routes FIRST to prevent conflicts
  console.log('🔥 PRIORITY: Registering Stripe routes first to avoid conflicts...');
  registerStripeRoutes(app);
  
  // Register all other route modules
  await registerContractRoutes(app);
  await registerInvoiceRoutes(app);
  await registerBookingRoutes(app);
  await registerSettingsRoutes(app);
  registerComplianceRoutes(app);
  await registerAdminRoutes(app);
  
  // Register missing API routes to fix 404 errors
  registerClientRoutes(app);
  registerFeedbackRoutes(app);
  registerUnparseableRoutes(app);
  
  // Register isolated routes for cloud compatibility  
  registerIsolatedRoutes(app);
  
  // Register health monitoring routes
  registerHealthRoutes(app);
  
  // Add missing endpoints to prevent 404s
  app.get('/api/conflicts', requireAuth, (req, res) => {
    res.json([]); // Empty conflicts for now
  });
  
  app.get('/api/conflicts/resolutions', requireAuth, (req, res) => {
    res.json([]); // Empty resolutions for now  
  });
  
  // Compliance routes now handled by registerComplianceRoutes

  // Dashboard stats endpoint
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Return basic stats - implement as needed
      res.json({
        totalBookings: 0,
        totalContracts: 0,
        totalInvoices: 0,
        revenue: 0
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });
  
  console.log('✅ All modular routes registered successfully');
}