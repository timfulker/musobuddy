// auth-config.ts - Single configuration point for authentication
import { Express } from "express";

// Determine which auth system to use based on environment
const AUTH_MODE = process.env.AUTH_MODE || 'local'; // 'local' or 'replit'

export async function setupAuthentication(app: Express) {
  console.log(`🔐 Setting up authentication mode: ${AUTH_MODE}`);
  
  try {
    if (AUTH_MODE === 'replit') {
      // Use Replit OpenID Connect authentication
      console.log('🔧 Loading Replit authentication...');
      const { setupAuth: setupReplitAuth } = await import('./replitAuth');
      await setupReplitAuth(app);
      console.log('✅ Replit authentication configured');
    } else {
      // Use local username/password authentication
      console.log('🔧 Loading local authentication...');
      const { setupAuth: setupLocalAuth } = await import('./auth');
      await setupLocalAuth(app);
      console.log('✅ Local authentication configured');
    }
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    throw error;
  }
}

// Export auth mode for other parts of the app to use
export { AUTH_MODE };