import { type Express } from "express";
import path from "path";
import { storage } from "./storage";
// import { authMonitor } from "./auth-monitor";

// Middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

export async function registerRoutes(app: Express) {
  // ===== SYSTEM HEALTH & MONITORING =====
  app.get('/api/health/auth', (req, res) => {
    res.json({ status: 'healthy', message: 'Auth system operational' });
  });

  app.get('/api/health/system', async (req, res) => {
    res.json({ status: 'healthy', message: 'System operational' });
  });

  // ===== TEST ROUTES =====
  app.get('/test-login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'test-direct-login.html'));
  });

  // ===== AUTHENTICATION ROUTES =====
  // Authentication routes are now handled by ProductionAuthSystem

  // ===== SIGNUP ROUTES =====
  // Signup routes are now handled by ProductionAuthSystem

  // ===== STRIPE ROUTES =====
  
  // Create Stripe checkout session (AUTHENTICATED)
  app.post('/api/create-checkout-session', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: 'Price ID required' });
      }

      console.log('🛒 Creating checkout session for user:', userId, 'priceId:', priceId);

      const { StripeService } = await import('./stripe-service');
      const stripeService = new StripeService();
      
      const session = await stripeService.createTrialCheckoutSession(userId, priceId);
      
      console.log('✅ Checkout session created:', session.sessionId);
      res.json(session);
      
    } catch (error: any) {
      console.error('❌ Checkout session error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get subscription status (AUTHENTICATED)
  app.get('/api/subscription/status', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { StripeService } = await import('./stripe-service');
      const stripeService = new StripeService();
      
      const status = await stripeService.getSubscriptionStatus(userId);
      res.json(status);
      
    } catch (error: any) {
      console.error('❌ Subscription status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== BOOKING ROUTES =====
  
  console.log('✅ Clean routes registered successfully');
}