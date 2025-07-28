import { type Express } from "express";
import path from "path";
import { storage } from "./storage";
import { createSessionMiddleware } from './session-config.js';
// ProductionAuthSystem removed - using direct route registration
import { generalApiRateLimit, slowDownMiddleware } from './rate-limiting.js';

// CLEAN AUTHENTICATION MIDDLEWARE
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    console.log('❌ Authentication required - no session userId');
    return res.status(401).json({ error: 'Authentication required' });
  }
  console.log(`✅ Authenticated request from user: ${req.session.userId}`);
  next();
};

export async function registerRoutes(app: Express) {
  // HARDENING: Apply general rate limiting and slow down protection
  console.log('🛡️ Setting up rate limiting protection...');
  app.use(generalApiRateLimit);
  app.use(slowDownMiddleware);
  
  // CRITICAL: Set up session middleware AFTER rate limiting
  console.log('📦 Registering session middleware...');
  const sessionMiddleware = createSessionMiddleware();
  app.use(sessionMiddleware);
  
  // CLEAN AUTHENTICATION ROUTES - Direct registration without separate class
  console.log('🔐 Setting up clean authentication routes...');
  
  // Admin login endpoint - direct implementation
  app.post('/api/auth/admin-login', async (req: any, res) => {
    const loginId = Date.now().toString();
    console.log(`🔐 [ADMIN-${loginId}] Clean admin login attempt`);
    
    try {
      const { email, password } = req.body;
      
      if (email === 'timfulker@gmail.com' && password === 'admin123') {
        const adminUser = await storage.getUserByEmail('timfulker@gmail.com');
        
        req.session.userId = adminUser?.id || '43963086';
        req.session.email = email;
        req.session.isAdmin = true;
        req.session.phoneVerified = true;
        
        // Save session with explicit callback handling
        req.session.save((err: any) => {
          if (err) {
            console.error(`❌ [ADMIN-${loginId}] Session save error:`, err);
            return res.status(500).json({ error: 'Session save failed' });
          }
          
          console.log(`✅ [ADMIN-${loginId}] Clean session saved: ${req.session.userId}`);
          
          return res.json({
            success: true,
            user: {
              id: req.session.userId,
              email: email,
              isAdmin: true,
              tier: 'admin',
              phoneVerified: true
            }
          });
        });
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error(`❌ [ADMIN-${loginId}] Clean login error:`, error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get current user endpoint - direct implementation
  app.get('/api/auth/user', (req: any, res) => {
    console.log(`👤 Clean auth check - Session:`, {
      userId: req.session?.userId,
      sessionId: req.sessionID,
      hasSession: !!req.session
    });
    
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
      id: req.session.userId,
      email: req.session.email,
      isAdmin: req.session.isAdmin || false,
      tier: 'admin',
      phoneVerified: req.session.phoneVerified || false
    });
  });

  // Logout endpoint - direct implementation
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('❌ Clean logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      console.log('✅ Clean logout successful');
      res.json({ success: true });
    });
  });
  
  console.log('✅ Clean authentication routes registered directly');

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
  // Authentication routes registered directly above

  // ===== USER MANAGEMENT ROUTES =====

  // ===== STRIPE ROUTES =====
  
  // Start trial (create Stripe checkout session) - REQUIRES AUTHENTICATION
  app.post('/api/auth/start-trial', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        console.log('❌ No userId in session for start-trial');
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('🚀 Backend: Starting trial for userId:', userId);
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (!user.phoneVerified) {
        return res.status(400).json({ error: 'Phone verification required' });
      }

      console.log('📋 Backend: User found and verified, creating checkout session...');

      const { StripeService } = await import('./stripe-service');
      const stripeService = new StripeService();
      
      const session = await stripeService.createTrialCheckoutSession(userId);
      
      console.log('✅ Backend: Checkout session created:', session.sessionId);
      res.json(session);
      
    } catch (error: any) {
      console.error('❌ Start trial error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
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

  // ===== NOTIFICATIONS API =====
  app.get('/api/notifications', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Return empty notifications array for now
      res.json([]);
    } catch (error: any) {
      console.error('❌ Notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // ===== SESSION RESTORATION API =====
  app.post('/api/auth/restore-session', async (req: any, res) => {
    try {
      console.log('🔄 Session restoration attempt:', {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        userId: req.session?.userId
      });

      // Check if session already exists and is valid
      if (req.session?.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          console.log('✅ Session already valid for user:', user.email);
          return res.json({ 
            success: true, 
            message: 'Session already valid',
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName
            }
          });
        }
      }

      console.log('❌ No valid session found for restoration');
      res.status(401).json({ success: false, error: 'No session to restore' });
      
    } catch (error: any) {
      console.error('❌ Session restoration error:', error);
      res.status(500).json({ success: false, error: 'Session restoration failed' });
    }
  });

  // ===== EMAIL SETUP API =====
  app.get('/api/email/my-address', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if user has email prefix set
      if (user.emailPrefix) {
        res.json({ 
          email: `leads+${user.emailPrefix}@mg.musobuddy.com`,
          needsSetup: false 
        });
      } else {
        res.json({ 
          email: null,
          needsSetup: true 
        });
      }
    } catch (error: any) {
      console.error('❌ Email address error:', error);
      res.status(500).json({ error: 'Failed to get email address' });
    }
  });

  app.post('/api/email/check-availability', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { prefix } = req.body;
      if (!prefix) {
        return res.status(400).json({ error: 'Prefix required' });
      }
      
      // Basic validation
      if (prefix.length < 2) {
        return res.json({ 
          available: false, 
          error: 'Prefix must be at least 2 characters' 
        });
      }
      
      if (!/^[a-z0-9]+$/.test(prefix)) {
        return res.json({ 
          available: false, 
          error: 'Prefix can only contain lowercase letters and numbers' 
        });
      }
      
      // Check if prefix is already taken
      const users = await storage.getAllUsers();
      const existingUser = users.find((u: any) => u.emailPrefix === prefix);
      
      if (existingUser) {
        // Suggest alternative
        const suggestion = `${prefix}${Math.floor(Math.random() * 99) + 1}`;
        return res.json({ 
          available: false, 
          error: 'This prefix is already taken',
          suggestion 
        });
      }
      
      res.json({ 
        available: true,
        fullEmail: `leads+${prefix}@mg.musobuddy.com`
      });
      
    } catch (error: any) {
      console.error('❌ Email availability error:', error);
      res.status(500).json({ error: 'Failed to check availability' });
    }
  });

  app.post('/api/email/assign-prefix', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { prefix } = req.body;
      if (!prefix) {
        return res.status(400).json({ error: 'Prefix required' });
      }
      
      // Double-check availability
      const users = await storage.getAllUsers();
      const existingUser = users.find((u: any) => u.emailPrefix === prefix);
      
      if (existingUser) {
        return res.status(409).json({ error: 'Prefix no longer available' });
      }
      
      // Assign prefix to user
      await storage.updateUser(userId, { emailPrefix: prefix });
      
      const fullEmail = `leads+${prefix}@mg.musobuddy.com`;
      
      res.json({ 
        success: true,
        email: fullEmail,
        prefix 
      });
      
    } catch (error: any) {
      console.error('❌ Email assignment error:', error);
      res.status(500).json({ error: 'Failed to assign email' });
    }
  });
  
  // ===== BOOKING ROUTES =====
  
  // Get all bookings for authenticated user - CLEAN IMPLEMENTATION
  app.get('/api/bookings', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        console.log('❌ No authenticated session for bookings request');
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const bookings = await storage.getBookings(userId);
      console.log(`📋 CLEAN: Retrieved ${bookings.length} bookings for authenticated user ${userId}`);
      res.json(bookings);
    } catch (error) {
      console.error('❌ Failed to fetch bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // Get individual booking
  app.get('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      res.json(booking);
    } catch (error) {
      console.error('❌ Failed to fetch booking:', error);
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  // Create new booking
  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const bookingData = {
        ...req.body,
        userId: req.session.userId
      };
      const newBooking = await storage.createBooking(bookingData);
      console.log(`✅ Created booking #${newBooking.id} for user ${req.session.userId}`);
      res.json(newBooking);
    } catch (error) {
      console.error('❌ Failed to create booking:', error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  // Update booking
  app.patch('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const updatedBooking = await storage.updateBooking(bookingId, req.body);
      if (!updatedBooking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      console.log(`✅ Updated booking #${bookingId} for user ${req.session.userId}`);
      res.json(updatedBooking);
    } catch (error) {
      console.error('❌ Failed to update booking:', error);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Delete booking
  app.delete('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      await storage.deleteBooking(bookingId);
      console.log(`✅ Deleted booking #${bookingId} for user ${req.session.userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Failed to delete booking:', error);
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // Conflicts endpoint - OPTIMIZED conflict detection
  app.get('/api/conflicts', isAuthenticated, async (req: any, res) => {
    try {
      const bookings = await storage.getBookings(req.session.userId);
      console.log(`🔍 OPTIMIZED CONFLICT DETECTION - Processing ${bookings.length} bookings`);
      
      // PERFORMANCE FIX: Only check active/upcoming bookings to reduce processing load
      const activeBookings = bookings.filter(booking => {
        const bookingDate = new Date(booking.eventDate);
        const today = new Date();
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        
        return booking.eventDate && 
               bookingDate >= oneYearAgo && 
               booking.status !== 'cancelled' && 
               booking.status !== 'completed';
      });
      
      console.log(`🔍 PERFORMANCE: Reduced from ${bookings.length} to ${activeBookings.length} active bookings`);
      
      const conflicts = [];
      
      // OPTIMIZED: Only check recent/upcoming bookings with time overlap logic
      for (let i = 0; i < activeBookings.length; i++) {
        const booking = activeBookings[i];
        
        if (!booking.eventDate || !booking.eventTime) continue;
        
        for (let j = i + 1; j < activeBookings.length; j++) {
          const other = activeBookings[j];
          
          if (!other.eventDate || !other.eventTime) continue;
          
          // Same date check
          const bookingDate = new Date(booking.eventDate).toDateString();
          const otherDate = new Date(other.eventDate).toDateString();
          if (otherDate !== bookingDate) continue; // Different dates, no conflict
          
          // Same date = conflict (severity determined by time overlap)
          let conflictSeverity = 'high';
          let conflictMessage = `Date conflict with ${other.clientName || 'Unknown Client'}`;
          
          // Check for time overlap if both have time information
          if (booking.eventTime && other.eventTime && booking.eventEndTime && other.eventEndTime) {
            try {
              const bookingStart = new Date(`${bookingDate} ${booking.eventTime}`);
              const bookingEnd = new Date(`${bookingDate} ${booking.eventEndTime}`);
              const otherStart = new Date(`${otherDate} ${other.eventTime}`);
              const otherEnd = new Date(`${otherDate} ${other.eventEndTime}`);
              
              const hasTimeOverlap = bookingStart < otherEnd && bookingEnd > otherStart;
              
              if (hasTimeOverlap) {
                conflictSeverity = 'high'; // Red - actual time overlap
                conflictMessage = `Time overlap with ${other.clientName || 'Unknown Client'}`;
              } else {
                conflictSeverity = 'medium'; // Amber - same date, different times
                conflictMessage = `Same date as ${other.clientName || 'Unknown Client'} but different times`;
              }
            } catch (error) {
              // If time parsing fails, default to date conflict
            }
          }
          
          conflicts.push({
            id: conflicts.length + 1,
            enquiryId: booking.id,
            conflictType: 'booking',
            conflictId: other.id,
            severity: conflictSeverity,
            message: conflictMessage,
            resolved: false
          });
        }
      }
      
      console.log(`🔍 OPTIMIZED CONFLICT DETECTION COMPLETE - Found ${conflicts.length} conflicts`);
      res.json(conflicts);
    } catch (error) {
      console.error('❌ Failed to fetch conflicts:', error);
      res.status(500).json({ error: 'Failed to fetch conflicts' });
    }
  });
  
  console.log('✅ Clean routes registered successfully');
}