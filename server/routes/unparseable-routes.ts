import type { Express } from "express";
import { requireAuth } from '../middleware/auth';
import { storage } from '../core/storage';

export function registerUnparseableRoutes(app: Express) {
  console.log('📧 Setting up unparseable message routes...');

  // Get all unparseable messages
  app.get('/api/unparseable-messages', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.userId;
      
      console.log('🔍 [UNPARSEABLE-API] API called for user:', userId);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const messages = await storage.getUnparseableMessages(userId);
      
      console.log('🔍 [UNPARSEABLE-API] Retrieved', messages?.length || 0, 'messages');
      if (messages && messages.length > 0) {
        console.log('🔍 [UNPARSEABLE-API] First message:', {
          id: messages[0].id,
          status: messages[0].status,
          from: messages[0].fromContact
        });
      }
      
      res.json(messages);

    } catch (error) {
      console.error('❌ Error fetching unparseable messages:', error);
      res.status(500).json({ error: 'Failed to fetch unparseable messages' });
    }
  });

  // Mark message as reviewed
  app.patch('/api/unparseable-messages/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const messageId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { status, reviewNotes } = req.body;
      
      await storage.updateUnparseableMessage(messageId, {
        status,
        reviewNotes,
        reviewedAt: new Date()
      });
      
      res.json({ 
        message: 'Message updated successfully',
        messageId,
        status,
        reviewNotes
      });

    } catch (error) {
      console.error('❌ Error reviewing message:', error);
      res.status(500).json({ error: 'Failed to review message' });
    }
  });

  // Convert message to booking
  app.post('/api/unparseable-messages/:id/convert', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const messageId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { reviewNotes } = req.body;
      
      // Get the message details
      const message = await storage.getUnparseableMessage(messageId);
      if (!message || message.userId !== userId) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      // Extract client info from message
      const emailMatch = message.fromContact.match(/<(.+)>/);
      const clientEmail = emailMatch ? emailMatch[1] : message.fromContact;
      const clientName = message.fromContact.replace(/<.*>/, '').trim();
      
      // Create booking from message
      const booking = await storage.createBooking({
        userId: userId,
        title: "Manual Entry from Review",
        clientName: clientName,
        clientEmail: clientEmail,
        clientPhone: null,
        eventDate: null, // No date available
        eventTime: null,
        eventEndTime: null,
        performanceDuration: null,
        venue: null,
        venueAddress: null,
        clientAddress: null,
        eventType: null,
        gigType: null,
        fee: null,
        equipmentRequirements: null,
        specialRequirements: null,
        estimatedValue: null,
        status: "new",
        notes: message.rawMessage,
        originalEmailContent: message.rawMessage,
        applyNowLink: null,
        responseNeeded: true,
        lastContactedAt: null,
        hasConflicts: false,
        conflictCount: 0,
        quotedAmount: null,
        depositAmount: null,
        finalAmount: null
      });
      
      // Update message as converted
      await storage.updateUnparseableMessage(messageId, {
        status: 'converted',
        reviewNotes,
        convertedToBookingId: booking.id,
        reviewedAt: new Date()
      });
      
      res.json({ 
        message: 'Message converted to booking successfully',
        messageId,
        bookingId: booking.id,
        reviewNotes
      });

    } catch (error) {
      console.error('❌ Error converting message:', error);
      res.status(500).json({ error: 'Failed to convert message' });
    }
  });

  // Delete message
  app.delete('/api/unparseable-messages/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const messageId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify ownership before deleting
      const message = await storage.getUnparseableMessage(messageId);
      if (!message || message.userId !== userId) {
        return res.status(404).json({ error: 'Message not found' });
      }

      await storage.deleteUnparseableMessage(messageId);
      
      res.json({ 
        message: 'Message deleted successfully',
        messageId
      });

    } catch (error) {
      console.error('❌ Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  console.log('✅ Unparseable message routes configured');
}