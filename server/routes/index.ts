import type { Express } from "express";
import { setupAuthRoutes } from "./auth-clean";
import { registerContractRoutes } from "./contract-routes";
import { registerInvoiceRoutes } from "./invoice-routes";
import { registerBookingRoutes } from "./booking-routes";
import { registerSettingsRoutes } from "./settings-routes";
import { registerAdminRoutes } from "./admin-routes";
import { registerIsolatedRoutes } from "./isolated-routes";
import { registerStripeRoutes } from "./stripe-routes";
import { requireAuth } from '../middleware/auth';

export async function registerRoutes(app: Express) {
  console.log('🔄 Registering all modular routes...');
  
  // Setup clean JWT-based authentication (replaces session-based auth)
  setupAuthRoutes(app);
  
  // Register all route modules
  await registerContractRoutes(app);
  await registerInvoiceRoutes(app);
  await registerBookingRoutes(app);
  await registerSettingsRoutes(app);
  await registerAdminRoutes(app);
  registerStripeRoutes(app);
  
  // Register isolated routes for cloud compatibility  
  registerIsolatedRoutes(app);
  
  // Add missing endpoints to prevent 404s
  app.get('/api/conflicts', requireAuth, (req, res) => {
    res.json([]); // Empty conflicts for now
  });
  
  app.get('/api/conflicts/resolutions', requireAuth, (req, res) => {
    res.json([]); // Empty resolutions for now  
  });
  
  app.get('/api/compliance', requireAuth, (req, res) => {
    res.json([]); // Empty compliance for now
  });
  
  console.log('✅ All modular routes registered successfully');
}