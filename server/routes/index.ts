import type { Express } from "express";
import { setupAuthRoutes } from "./auth-clean";
import { registerContractRoutes } from "./contract-routes";
import { registerInvoiceRoutes } from "./invoice-routes";
import { registerBookingRoutes } from "./booking-routes";
import { registerSettingsRoutes } from "./settings-routes";
import { registerAdminRoutes } from "./admin-routes";

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
  
  console.log('✅ All modular routes registered successfully');
}