import { Request, Response, NextFunction } from 'express';
import { db } from '../core/database';
import { clientCommunications, bookings } from '@shared/schema';
import { requireAuth } from '../middleware/auth';
import { eq, desc, and } from 'drizzle-orm';

export function setupCommunicationRoutes(app: any) {
  // Save a communication record when an email/SMS is sent
  app.post('/api/communications', requireAuth, async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const {
        bookingId,
        clientName,
        clientEmail,
        communicationType = 'email',
        direction = 'outbound',
        templateId,
        templateName,
        templateCategory,
        subject,
        messageBody,
        attachments = []
      } = req.body;

      if (!clientName || !clientEmail || !messageBody) {
        return res.status(400).json({ error: 'Missing required fields: clientName, clientEmail, messageBody' });
      }

      // Insert communication record
      const [communication] = await db.insert(clientCommunications).values({
        userId,
        bookingId: bookingId || null,
        clientName,
        clientEmail,
        communicationType,
        direction,
        templateId: templateId || null,
        templateName: templateName || null,
        templateCategory: templateCategory || null,
        subject: subject || null,
        messageBody,
        attachments: JSON.stringify(attachments),
        deliveryStatus: 'sent'
      }).returning();

      console.log(`✅ Communication recorded: ${communicationType} to ${clientEmail}`);
      res.json({ success: true, communication });

    } catch (error) {
      console.error('❌ Error saving communication:', error);
      res.status(500).json({ error: 'Failed to save communication record' });
    }
  });

  // Get communication history for a client
  app.get('/api/communications/client/:email', requireAuth, async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const clientEmail = req.params.email;
      
      const communications = await db
        .select()
        .from(clientCommunications)
        .where(and(
          eq(clientCommunications.userId, userId),
          eq(clientCommunications.clientEmail, clientEmail)
        ))
        .orderBy(desc(clientCommunications.sentAt));

      res.json(communications);

    } catch (error) {
      console.error('❌ Error fetching client communications:', error);
      res.status(500).json({ error: 'Failed to fetch communications' });
    }
  });

  // Get communication history for a booking
  app.get('/api/communications/booking/:bookingId', requireAuth, async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        console.log('❌ No userId found in request');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const bookingId = parseInt(req.params.bookingId);
      console.log(`🔍 Fetching communications for booking ${bookingId}, user ${userId}`);
      
      const communications = await db
        .select()
        .from(clientCommunications)
        .where(and(
          eq(clientCommunications.userId, userId),
          eq(clientCommunications.bookingId, bookingId)
        ))
        .orderBy(desc(clientCommunications.sentAt));

      console.log(`✅ Found ${communications.length} communications for booking ${bookingId}`);
      res.json(communications);

    } catch (error) {
      console.error('❌ Error fetching booking communications:', error);
      res.status(500).json({ error: 'Failed to fetch communications' });
    }
  });

  // Get all communications for the authenticated user
  app.get('/api/communications', requireAuth, async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const communications = await db
        .select()
        .from(clientCommunications)
        .where(eq(clientCommunications.userId, userId))
        .orderBy(desc(clientCommunications.sentAt))
        .limit(limit)
        .offset(offset);

      res.json(communications);

    } catch (error) {
      console.error('❌ Error fetching communications:', error);
      res.status(500).json({ error: 'Failed to fetch communications' });
    }
  });

  console.log('✅ Communication routes configured');
}