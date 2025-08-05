import { type Express } from "express";
import { storage } from "./core/storage";
import { authRateLimit, smsRateLimit, emailRateLimit, generalRateLimit } from './middleware/rateLimiting';
import { validateBody, sanitizeInput } from './middleware/validation';
import { asyncHandler } from './middleware/errorHandler';
import { z } from 'zod';

// Consolidated authentication middleware
const isAuthenticated = async (req: any, res: any, next: any) => {
  const sessionUserId = req.session?.userId;
  
  console.log('🔍 Auth check:', {
    sessionId: req.sessionID,
    userId: sessionUserId,
    path: req.path
  });
  
  if (!sessionUserId || (typeof sessionUserId === 'string' && sessionUserId.trim() === '')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const userId = typeof sessionUserId === 'string' ? parseInt(sessionUserId) : sessionUserId;
    const user = await storage.getUserById(userId);
    
    if (!user) {
      req.session.destroy((err: any) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    req.user = user;
    next();
    
  } catch (error: any) {
    console.error('❌ Authentication validation error:', error);
    return res.status(500).json({ error: 'Authentication validation failed' });
  }
};

export async function registerRoutes(app: Express) {
  console.log('🔄 Setting up consolidated routes...');

  // Import authentication logic
  const authModule = await import('./core/auth-rebuilt');
  await authModule.setupAuthRoutes(app);

  // CONTRACTS - Business Critical Routes
  console.log('📋 Setting up contract routes...');
  
  app.get('/api/contracts', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const contracts = await storage.getContracts(userId);
    res.json(contracts);
  }));

  app.get('/api/contracts/:id', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const contractId = parseInt(req.params.id);
    const contract = await storage.getContract(contractId, userId);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    res.json(contract);
  }));

  // CRITICAL: Isolated contract R2 URL endpoint
  app.get('/api/isolated/contracts/:id/r2-url', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const contractId = parseInt(req.params.id);
    
    console.log(`🔍 R2 URL request for contract ${contractId} by user ${userId}`);
    
    const contract = await storage.getContract(contractId, userId);
    if (!contract) {
      console.log(`❌ Contract ${contractId} not found for user ${userId}`);
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    console.log(`📄 Contract found:`, { 
      id: contract.id, 
      contractNumber: contract.contractNumber,
      r2Key: contract.r2Key,
      cloudStorageUrl: contract.cloudStorageUrl 
    });
    
    if (contract.r2Key || contract.cloudStorageUrl) {
      // Try r2Key first, then cloudStorageUrl as fallback
      let r2Url;
      if (contract.r2Key) {
        r2Url = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/${contract.r2Key}`;
      } else if (contract.cloudStorageUrl) {
        r2Url = contract.cloudStorageUrl;
      }
      
      console.log(`✅ Returning R2 URL: ${r2Url}`);
      res.json({ url: r2Url });
    } else {
      console.log(`❌ No R2 key or cloud storage URL for contract ${contractId}`);
      res.status(404).json({ error: 'Contract PDF not available' });
    }
  }));

  app.get('/api/contracts/:id/download', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const contractId = parseInt(req.params.id);
    const contract = await storage.getContract(contractId, userId);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Generate and return PDF
    const { generateContractPDF } = await import('./unified-contract-pdf');
    const userSettings = await storage.getUserSettings(userId);
    const pdfBuffer = await generateContractPDF(contract, userSettings);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contract-${contract.contractNumber}.pdf"`);
    res.send(pdfBuffer);
  }));

  // BOOKINGS
  console.log('📅 Setting up booking routes...');
  
  app.get('/api/bookings', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const bookings = await storage.getBookings(userId);
    res.json(bookings);
  }));

  app.post('/api/bookings', isAuthenticated, validateBody(z.object({
    title: z.string().min(1),
    clientName: z.string().min(1),
    clientEmail: z.string().email().optional(),
    clientPhone: z.string().optional(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    venue: z.string().min(1),
    fee: z.number().optional(),
    status: z.enum(['confirmed', 'pending', 'cancelled']).default('pending'),
    notes: z.string().optional(),
    gigType: z.string().optional(),
    setupTime: z.string().optional(),
    soundCheckTime: z.string().optional()
  })), asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const booking = await storage.createBooking({ ...req.body, userId });
    res.status(201).json(booking);
  }));

  // INVOICES
  console.log('💰 Setting up invoice routes...');
  
  app.get('/api/invoices', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const invoices = await storage.getInvoices(userId);
    res.json(invoices);
  }));

  // SETTINGS
  console.log('⚙️ Setting up settings routes...');
  
  app.get('/api/settings', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const settings = await storage.getUserSettings(userId);
    res.json(settings);
  }));

  // DASHBOARD
  app.get('/api/dashboard/stats', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const stats = await storage.getDashboardStats(userId);
    res.json(stats);
  }));

  // MISSING ENDPOINTS THAT WERE CAUSING 404s
  app.get('/api/conflicts', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.id;
    const conflicts = await storage.getBookingConflicts(userId, 0);
    res.json(conflicts || []);
  }));

  app.get('/api/conflicts/resolutions', isAuthenticated, asyncHandler(async (req: any, res) => {
    res.json([]);
  }));

  app.get('/api/compliance', isAuthenticated, asyncHandler(async (req: any, res) => {
    res.json([]);
  }));

  console.log('✅ All consolidated routes registered successfully');
}