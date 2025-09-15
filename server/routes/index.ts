import type { Express } from "express";
import { registerContractRoutes } from "./contract-routes";
import { registerInvoiceRoutes } from "./invoice-routes";
import { registerBookingRoutes } from "./booking-routes";
import { registerSettingsRoutes } from "./settings-routes";
import { registerAdminRoutes } from "./admin-routes";
import { setupAdminDatabaseRoutes } from "./admin-database-routes";
import { registerIsolatedRoutes } from "./isolated-routes";
// import { registerStripeRoutes } from "./stripe-routes"; // REMOVED - Stripe integration disabled
import { registerClientRoutes } from "./client-routes";
import { registerFeedbackRoutes } from "./feedback-routes";
import { registerUnparseableRoutes } from "./unparseable-routes";
import { registerComplianceRoutes } from "./compliance-routes";
import { registerHealthRoutes } from "./health-routes";
import { registerClientPortalRoutes } from "./client-portal-routes";
import { setupCollaborativeFormRoutes } from "./collaborative-form-routes";
import { setupRegeneratePortalRoutes } from "./regenerate-portal";
import { registerMapsRoutes } from "./maps-routes";
import { setupWhat3WordsRoutes } from "./what3words-routes";
import { registerGoogleCalendarRoutes } from "./google-calendar-routes";
import { registerCalendarImportRoutes } from "./calendar-import-routes";
import { registerOnboardingRoutes } from "./onboarding-routes";
import { setupAuthRoutes } from "./auth-clean";
import { registerNotificationRoutes } from "./notification-routes";
import { messageNotificationRoutes } from "./message-notification-routes";
import { setupCommunicationRoutes } from "./communication-routes";
import { setupBookingCollaborationRoutes } from "./booking-collaboration-routes";
import blockedDatesRoutes from "./blocked-dates-routes";
import documentRoutes from "./document-routes";
import { registerSupportChatRoutes } from "./support-chat-routes";
// AI token routes removed - unlimited AI usage for all users

import { authenticate, type AuthenticatedRequest } from '../middleware/simple-auth';
import { storage } from "../core/storage";
import { safeDbCall, developmentFallbacks } from '../utils/development-helpers';

export async function registerRoutes(app: Express) {
  console.log('🔄 [CENTRAL-ROUTER] Starting route registration...');
  
  // CRITICAL FIX: Register authentication routes FIRST
  console.log('🔐 [CENTRAL-ROUTER] PRIORITY: Registering authentication routes first...');
  try {
    setupAuthRoutes(app);
    console.log('✅ [CENTRAL-ROUTER] Authentication routes registered successfully');
  } catch (error) {
    console.error('❌ [CENTRAL-ROUTER] Failed to register auth routes:', error);
  }
  
  // STRIPE INTEGRATION REMOVED - Will be reimplemented
  // console.log('🔥 PRIORITY: Registering Stripe routes second to avoid conflicts...');
  // registerStripeRoutes(app);
  
  // Register all other route modules with individual error handling
  console.log('🔄 [CENTRAL-ROUTER] Registering core business logic routes...');
  
  try {
    console.log('📋 [CENTRAL-ROUTER] Registering contract routes...');
    await registerContractRoutes(app);
    console.log('✅ [CENTRAL-ROUTER] Contract routes registered successfully');
  } catch (error) {
    console.error('❌ [CENTRAL-ROUTER] Failed to register contract routes:', error);
  }
  
  try {
    console.log('💰 [CENTRAL-ROUTER] Registering invoice routes...');
    await registerInvoiceRoutes(app);
    console.log('✅ [CENTRAL-ROUTER] Invoice routes registered successfully');
  } catch (error) {
    console.error('❌ [CENTRAL-ROUTER] Failed to register invoice routes:', error);
  }
  
  try {
    console.log('📅 [CENTRAL-ROUTER] Registering booking routes...');
    await registerBookingRoutes(app);
    console.log('✅ [CENTRAL-ROUTER] Booking routes registered successfully');
  } catch (error) {
    console.error('❌ [CENTRAL-ROUTER] Failed to register booking routes:', error);
  }
  
  // Register document management routes with error handling
  try {
    console.log('📄 [CENTRAL-ROUTER] Registering document routes...');
    app.use('/api', documentRoutes);
    console.log('✅ [CENTRAL-ROUTER] Document routes registered successfully');
  } catch (error) {
    console.error('❌ [CENTRAL-ROUTER] Failed to register document routes:', error);
  }
  
  try {
    console.log('⚙️ [CENTRAL-ROUTER] Registering settings routes...');
    await registerSettingsRoutes(app);
    console.log('✅ [CENTRAL-ROUTER] Settings routes registered successfully');
  } catch (error) {
    console.error('❌ [CENTRAL-ROUTER] Failed to register settings routes:', error);
  }
  
  try {
    console.log('📋 [CENTRAL-ROUTER] Registering compliance routes...');
    registerComplianceRoutes(app);
    console.log('✅ [CENTRAL-ROUTER] Compliance routes registered successfully');
  } catch (error) {
    console.error('❌ [CENTRAL-ROUTER] Failed to register compliance routes:', error);
  }
  
  try {
    console.log('👑 [CENTRAL-ROUTER] Registering admin routes...');
    await registerAdminRoutes(app);
    console.log('✅ [CENTRAL-ROUTER] Admin routes registered successfully');
  } catch (error) {
    console.error('❌ [CENTRAL-ROUTER] Failed to register admin routes:', error);
  }
  
  try {
    console.log('🗄️ [CENTRAL-ROUTER] Registering admin database routes...');
    setupAdminDatabaseRoutes(app);
    console.log('✅ [CENTRAL-ROUTER] Admin database routes registered successfully');
  } catch (error) {
    console.error('❌ [CENTRAL-ROUTER] Failed to register admin database routes:', error);
  }
  
  // Register missing API routes to fix 404 errors
  registerClientRoutes(app);
  registerFeedbackRoutes(app);
  registerUnparseableRoutes(app);
  registerClientPortalRoutes(app);
  setupCollaborativeFormRoutes(app);
  setupRegeneratePortalRoutes(app);
  
  // Register isolated routes for cloud compatibility  
  registerIsolatedRoutes(app);
  
  // Register health monitoring routes
  registerHealthRoutes(app);
  
  // Register Google Maps routes
  registerMapsRoutes(app);
  
  // Register what3words routes
  setupWhat3WordsRoutes(app);

  // Register Google Calendar routes
  registerGoogleCalendarRoutes(app);
  
  // Register calendar import routes
  registerCalendarImportRoutes(app);
  
  // Register onboarding routes  
  registerOnboardingRoutes(app);
  
  // Register notification routes
  registerNotificationRoutes(app);
  
  // Register message notification routes
  app.use('/api', messageNotificationRoutes);
  
  // Register communication history routes
  setupCommunicationRoutes(app);
  
  // Register booking collaboration routes
  setupBookingCollaborationRoutes(app);
  
  
  // Register blocked dates routes
  app.use('/api/blocked-dates', blockedDatesRoutes);
  
  // Register support chat routes
  registerSupportChatRoutes(app);
  
  // Register AI token management routes
  // AI token routes removed - unlimited AI usage for all users
  
  // Conflict management endpoints
  app.get('/api/conflicts', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`🔍 Fetching conflicts for user ${userId}`);
      
      // Get real conflicts from booking storage with development fallback
      const conflicts = await safeDbCall(
        () => storage.getAllUserConflicts(userId), 
        [], 
        'getAllUserConflicts'
      );
      console.log(`✅ Found ${conflicts.length} conflicts for user ${userId}`);
      res.json(conflicts);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      res.status(500).json({ error: 'Failed to fetch conflicts' });
    }
  });
  
  app.get('/api/conflicts/resolutions', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`🔍 Fetching conflict resolutions for user ${userId}`);
      
      // Get conflict resolutions with development fallback
      const resolutions = await safeDbCall(
        () => storage.getConflictResolutions(userId), 
        [], 
        'getConflictResolutions'
      );
      console.log(`✅ Found ${resolutions?.length || 0} resolutions for user ${userId}`);
      res.json(resolutions || []);
    } catch (error) {
      console.error('Error fetching conflict resolutions:', error);
      res.status(500).json({ error: 'Failed to fetch conflict resolutions' });
    }
  });
  
  // Conflict resolution endpoint
  app.post('/api/conflicts/resolve', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const { bookingIds, resolution, notes } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length < 2) {
        return res.status(400).json({ error: 'At least 2 booking IDs are required' });
      }
      
      // Save conflict resolution
      const resolvedConflict = await storage.saveConflictResolution({
        userId,
        bookingIds: JSON.stringify(bookingIds),
        resolution: resolution || 'resolved',
        notes: notes || 'Conflict resolved via UI',
        resolvedAt: new Date().toISOString()
      });
      
      console.log(`✅ Conflict resolved for user ${userId}, bookings: ${bookingIds.join(', ')}`);
      
      res.json({ 
        success: true, 
        message: 'Conflict resolved successfully', 
        conflict: resolvedConflict 
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      res.status(500).json({ error: 'Failed to resolve conflict' });
    }
  });
  
  // Compliance routes now handled by registerComplianceRoutes

  // Dashboard stats endpoint
  app.get('/api/dashboard/stats', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get actual stats from storage - wrapping each in try/catch to handle failures gracefully
      let newBookings = 0;
      let reviewMessages = 0;
      let overdueInvoices = 0;
      let unreadClientMessages = 0;
      let monthlyRevenue = 0;
      let activeBookings = 0;
      let pendingInvoices = 0;
      
      try {
        newBookings = await storage.getNewBookingsCount(userId);
      } catch (e) {
        console.error('Error getting new bookings count:', e);
      }
      
      try {
        reviewMessages = await storage.getUnparseableMessagesCount(userId);
      } catch (e) {
        console.error('Error getting review messages count:', e);
      }
      
      try {
        overdueInvoices = await storage.getOverdueInvoicesCount(userId);
      } catch (e) {
        console.error('Error getting overdue invoices count:', e);
      }
      
      try {
        unreadClientMessages = await storage.getUnreadMessageNotificationsCount(userId);
      } catch (e) {
        console.error('Error getting unread messages count:', e);
      }
      
      try {
        monthlyRevenue = await storage.getMonthlyRevenue(userId);
      } catch (e) {
        console.error('Error getting monthly revenue:', e);
      }
      
      try {
        activeBookings = await storage.getActiveBookingsCount(userId);
      } catch (e) {
        console.error('Error getting active bookings count:', e);
      }
      
      try {
        pendingInvoices = await storage.getPendingInvoicesAmount(userId);
      } catch (e) {
        console.error('Error getting pending invoices amount:', e);
      }
      
      const totalMessages = (parseInt(unreadClientMessages) || 0) + (parseInt(reviewMessages) || 0);
      
      res.json({
        monthlyRevenue: monthlyRevenue || 0,
        activeBookings: activeBookings || 0,
        pendingInvoices: pendingInvoices || 0,
        overdueInvoices: overdueInvoices || 0,
        enquiriesRequiringResponse: parseInt(newBookings) || 0,
        totalMessages: totalMessages,
        unreadMessages: parseInt(unreadClientMessages) || 0
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });
  
  console.log('✅ All modular routes registered successfully');
}