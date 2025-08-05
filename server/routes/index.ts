import type { Express } from "express";
import { registerAuthRoutes } from "./auth-routes";
import { registerContractRoutes } from "./contract-routes";
import { registerInvoiceRoutes } from "./invoice-routes";
import { registerBookingRoutes } from "./booking-routes";
import { registerSettingsRoutes } from "./settings-routes";
import { registerAdminRoutes } from "./admin-routes";

export async function registerRoutes(app: Express) {
  console.log('🔄 Registering all modular routes...');
  
  // Register all route modules
  await registerAuthRoutes(app);
  await registerContractRoutes(app);
  await registerInvoiceRoutes(app);
  await registerBookingRoutes(app);
  await registerSettingsRoutes(app);
  await registerAdminRoutes(app);
  
  console.log('✅ All modular routes registered successfully');
}