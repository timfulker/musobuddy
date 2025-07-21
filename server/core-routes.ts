import { type Express, Request, Response } from 'express';
import { storage } from './storage';
import { authMiddleware } from './auth-middleware';
import { emailWebhookHandler } from './email-webhook';

export async function registerAllRoutes(app: Express) {
  console.log('🔧 Registering core routes...');
  
  // Email webhook (no auth required)
  app.post('/api/webhook/mailgun', emailWebhookHandler);
  
  // Authentication routes
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Simple password check for now
      if (user.password === password) {
        // Set session
        (req.session as any).userId = user.id;
        res.json({ user: { id: user.id, email: user.email, firstName: user.firstName } });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });
  
  app.get('/api/auth/user', async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      res.json({ user: { id: user.id, email: user.email, firstName: user.firstName } });
    } catch (error) {
      res.status(500).json({ message: 'Auth check failed' });
    }
  });
  
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: 'Logged out' });
    });
  });
  
  // Protected routes - all require authentication
  app.get('/api/bookings', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const bookings = await storage.getBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({ message: 'Failed to get bookings' });
    }
  });
  
  app.post('/api/bookings', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const booking = await storage.createBooking({ ...req.body, userId });
      res.json(booking);
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({ message: 'Failed to create booking' });
    }
  });
  
  app.get('/api/contracts', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const contracts = await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get contracts' });
    }
  });
  
  app.get('/api/invoices', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get invoices' });
    }
  });
  
  console.log('✅ Core routes registered');
}