import { type Express, type Request, type Response, type NextFunction } from "express";
import { storage } from "../core/storage";
import { validateBody, validateQuery, schemas, sanitizeInput } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isVerified: boolean;
  };
}

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Rate limiting middleware placeholder
const generalApiRateLimit = (req: Request, res: Response, next: NextFunction) => {
  next();
};

// Subscription middleware placeholder
const requireSubscriptionOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export function registerBookingRoutes(app: Express) {
  console.log('📅 Setting up booking routes...');

  // Get all bookings for authenticated user (requires subscription)
  app.get('/api/bookings', requireAuth, requireSubscriptionOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const bookings = await storage.getBookings(userId);
      console.log(`✅ Retrieved ${bookings.length} bookings for user ${userId}`);
      res.json(bookings);
    } catch (error) {
      console.error('❌ Failed to fetch bookings:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  // Create new booking (requires subscription)
  app.post('/api/bookings', 
    requireAuth,
    requireSubscriptionOrAdmin,
    generalApiRateLimit,
    sanitizeInput,
    validateBody(schemas.createBooking),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.user?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        const bookingData = {
          userId,
          clientName: req.body.clientName,
          clientEmail: req.body.clientEmail || null,
          clientPhone: req.body.clientPhone || null,
          venue: req.body.venue || null,
          venueAddress: req.body.venueAddress || null,
          eventDate: req.body.eventDate,
          eventTime: req.body.eventTime || null,
          eventEndTime: req.body.eventEndTime || null,
          fee: req.body.fee || null,
          deposit: req.body.deposit || "0.00",
          status: req.body.status || 'new',
          notes: req.body.notes || null,
          gigType: req.body.gigType || null,
          equipmentRequirements: req.body.equipmentRequirements || null,
          specialRequirements: req.body.specialRequirements || null
        };
        
        const newBooking = await storage.createBooking(bookingData);
        console.log(`✅ Created booking #${newBooking.id} for user ${userId}`);
        res.json(newBooking);
        
      } catch (error: any) {
        console.error('❌ Failed to create booking:', error);
        res.status(500).json({ 
          error: 'Failed to create booking',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    })
  );

  // Update booking
  app.patch('/api/bookings/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Verify ownership
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking || existingBooking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      const updatedBooking = await storage.updateBooking(bookingId, req.body, userId);
      console.log(`✅ Updated booking #${bookingId} for user ${userId}`);
      res.json(updatedBooking);
      
    } catch (error) {
      console.error('❌ Failed to update booking:', error);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Delete booking
  app.delete('/api/bookings/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Verify ownership
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking || existingBooking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      await storage.deleteBooking(bookingId, userId);
      console.log(`✅ Deleted booking #${bookingId} for user ${userId}`);
      res.json({ success: true });
      
    } catch (error) {
      console.error('❌ Failed to delete booking:', error);
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // Get individual booking
  app.get('/api/bookings/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      res.json(booking);
      
    } catch (error) {
      console.error('❌ Failed to fetch booking:', error);
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  // Bulk delete bookings
  app.post('/api/bookings/bulk-delete', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bookingIds } = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ error: 'Booking IDs array is required' });
      }
      
      // Verify all bookings belong to the authenticated user
      const verificationPromises = bookingIds.map(async (bookingId: number) => {
        const booking = await storage.getBooking(bookingId);
        if (!booking) {
          throw new Error(`Booking #${bookingId} not found`);
        }
        if (booking.userId !== userId) {
          throw new Error(`Access denied to booking #${bookingId}`);
        }
        return booking;
      });
      
      try {
        await Promise.all(verificationPromises);
      } catch (verificationError: any) {
        return res.status(403).json({ error: verificationError.message });
      }
      
      const deletePromises = bookingIds.map((bookingId: number) => 
        storage.deleteBooking(bookingId, userId)
      );
      
      await Promise.all(deletePromises);
      
      res.json({ 
        success: true, 
        deletedCount: bookingIds.length,
        message: `Successfully deleted ${bookingIds.length} booking${bookingIds.length !== 1 ? 's' : ''}` 
      });
      
    } catch (error: any) {
      console.error('❌ Bulk delete failed:', error);
      res.status(500).json({ 
        error: 'Failed to delete bookings', 
        details: error.message 
      });
    }
  });

  // Widget endpoints for external booking forms
  console.log('🔧 Setting up widget endpoints...');

  // CORS middleware for widget endpoints (allow Cloudflare R2 and other origins)
  const widgetCorsHandler = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for widgets
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  };

  // Verify widget token
  app.get('/api/widget/verify/:token', widgetCorsHandler, async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const user = await storage.getUserByQuickAddToken(token);
      
      if (!user) {
        return res.json({ valid: false });
      }
      
      res.json({ 
        valid: true, 
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
      });
    } catch (error) {
      console.error('❌ Widget token verification failed:', error);
      res.json({ valid: false });
    }
  });

  // Handle OPTIONS preflight for widget endpoints
  app.options('/api/widget/verify/:token', widgetCorsHandler);
  app.options('/api/widget/hybrid-submit', widgetCorsHandler);

  // Hybrid widget form submission (combines natural language + structured data)
  app.post('/api/widget/hybrid-submit', widgetCorsHandler, async (req: Request, res: Response) => {
    try {
      const { messageText, clientName, clientContact, eventDate, venue, token } = req.body;
      
      if (!messageText || !clientName || !clientContact || !token) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Verify widget token and get user
      const user = await storage.getUserByQuickAddToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid widget token' });
      }
      
      // Parse the message using AI to extract additional details
      const { parseBookingMessage } = await import('../ai/booking-message-parser');
      const parsedData = await parseBookingMessage(messageText, clientContact, venue);
      
      // Determine contact details (email vs phone)
      let clientEmail = parsedData.clientEmail;
      let clientPhone = parsedData.clientPhone;
      
      if (!clientEmail && !clientPhone) {
        // Determine from clientContact field
        if (clientContact.includes('@')) {
          clientEmail = clientContact;
        } else if (/\d{10,}/.test(clientContact)) {
          clientPhone = clientContact;
        }
      }
      
      // Create booking with combined data (form data takes precedence over AI parsed data)
      const bookingData = {
        userId: user.id,
        clientName: clientName || parsedData.clientName || 'Unknown Client',
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        venue: venue || parsedData.venue || null,
        venueAddress: parsedData.venueAddress || null,
        eventDate: eventDate || parsedData.eventDate || null,
        eventTime: parsedData.eventTime || null,
        eventEndTime: parsedData.eventEndTime || null,
        fee: parsedData.fee || null,
        deposit: parsedData.deposit || null,
        status: 'new',
        notes: messageText,
        gigType: parsedData.eventType || null,
        equipmentRequirements: null,
        specialRequirements: parsedData.specialRequirements || null
      };
      
      const newBooking = await storage.createBooking(bookingData);
      console.log(`✅ Widget created booking #${newBooking.id} for user ${user.id} (AI confidence: ${parsedData.confidence})`);
      
      // Send notification email to the musician if they have settings
      try {
        const userSettings = await storage.getSettings(user.id);
        if (userSettings?.businessEmail || user.email) {
          const { EmailService } = await import('../core/services');
          const emailService = new EmailService();
          
          const businessName = userSettings?.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'MusoBuddy User';
          const subject = `New Booking Request - ${businessName}`;
          const emailBody = `
<h2>New Booking Request</h2>
<p><strong>From:</strong> ${clientName}</p>
<p><strong>Contact:</strong> ${clientEmail || clientPhone || 'Not provided'}</p>
<p><strong>Event Date:</strong> ${eventDate || parsedData.eventDate || 'Not specified'}</p>
<p><strong>Venue:</strong> ${venue || parsedData.venue || 'Not specified'}</p>
<p><strong>Event Type:</strong> ${parsedData.eventType || 'Not specified'}</p>

<h3>Original Message:</h3>
<blockquote style="border-left: 4px solid #667eea; padding-left: 16px; margin: 16px 0;">
${messageText.replace(/\n/g, '<br>')}
</blockquote>

<p><strong>AI Confidence:</strong> ${Math.round(parsedData.confidence * 100)}%</p>
<p><em>This booking request was submitted via your MusoBuddy booking widget.</em></p>
          `;
          
          await emailService.sendEmail(
            userSettings?.businessEmail || user.email!
          );
          
          console.log(`✅ Notification email sent for booking #${newBooking.id}`);
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send notification email:', emailError);
        // Don't fail the request if email fails
      }
      
      res.json({ 
        success: true, 
        bookingId: newBooking.id,
        confidence: parsedData.confidence,
        message: 'Booking request received successfully'
      });
      
    } catch (error: any) {
      console.error('❌ Widget booking creation failed:', error);
      res.status(500).json({ 
        error: 'Failed to process booking request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Add missing QR code generation endpoint for production compatibility
  app.post('/api/generate-qr-code', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Generate widget token for the user
      const jwt = await import('jsonwebtoken');
      const token = jwt.default.sign(
        { userId, type: 'widget' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );
      
      const widgetUrl = `${process.env.APP_URL || 'https://www.musobuddy.com'}/widget?token=${encodeURIComponent(token)}`;
      
      // Import QRCode library
      const QRCode = await import('qrcode');
      const qrCode = await QRCode.default.toDataURL(widgetUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0000',
          light: '#FFFF'
        }
      });
      
      res.json({ qrCode, widgetUrl });
    } catch (error) {
      console.error('QR code generation error:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  console.log('✅ Booking routes configured');
}