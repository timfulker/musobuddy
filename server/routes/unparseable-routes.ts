import type { Express } from "express";
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { storage } from '../core/storage';
import { parseBookingMessage } from '../ai/booking-message-parser';

export function registerUnparseableRoutes(app: Express) {
  console.log('📧 Setting up unparseable message routes...');

  // Get all unparseable messages
  app.get('/api/unparseable-messages', authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      
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
  app.patch('/api/unparseable-messages/:id', authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
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

  // Convert message to booking (manual)
  app.post('/api/unparseable-messages/:id/convert', authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
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
      
      // Create dateless booking from message
      const booking = await storage.createBooking({
        userId: userId,
        title: `${clientName} - Inquiry (Date TBC)`,
        clientName: clientName,
        clientEmail: clientEmail,
        clientPhone: null,
        eventDate: null, // Dateless booking
        eventTime: null,
        eventEndTime: null,
        performanceDuration: null,
        venue: null,
        venueAddress: null,
        clientAddress: null,
        eventType: "inquiry", // Mark as inquiry type
        gigType: null,
        fee: null,
        equipmentRequirements: null,
        specialRequirements: null,
        estimatedValue: null,
        status: "new",
        notes: `Original inquiry: ${message.rawMessage}`,
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
        reviewNotes: reviewNotes || 'Manually converted to booking',
        reviewedAt: new Date()
      });
      
      res.json({ 
        success: true,
        booking,
        message: 'Message converted to booking successfully'
      });

    } catch (error) {
      console.error('❌ Error converting message:', error);
      res.status(500).json({ error: 'Failed to convert message' });
    }
  });

  // Reprocess message through AI
  app.post('/api/unparseable-messages/:id/reprocess', authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      const messageId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`🤖 Reprocessing message #${messageId} through AI for user ${userId}`);
      
      // Get the message details
      const message = await storage.getUnparseableMessage(messageId);
      if (!message || message.userId !== userId) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      // Get user for AI context
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log(`🤖 Parsing message content: ${message.rawMessage?.substring(0, 100)}...`);
      
      // Parse through AI with improved prompting
      const parsedData = await parseBookingMessage(
        message.rawMessage || '',
        message.fromContact,
        null,
        userId,
        message.subject || ''
      );
      
      console.log(`✅ AI parsing complete:`, {
        hasEventDate: !!parsedData.eventDate,
        eventDateValue: parsedData.eventDate,
        clientName: parsedData.clientName,
        venue: parsedData.venue,
        confidence: parsedData.confidence
      });
      
      // Create booking from parsed data
      const booking = await storage.createBooking({
        userId: userId,
        title: parsedData.eventType || "Booking from Review Message",
        clientName: parsedData.clientName || message.fromContact.replace(/<.*>/, '').trim(),
        clientEmail: parsedData.clientEmail || (message.fromContact.match(/<(.+)>/)?.[1] || message.fromContact),
        clientPhone: parsedData.clientPhone || null,
        eventDate: parsedData.eventDate || null,
        eventTime: parsedData.eventTime || null,
        eventEndTime: parsedData.eventEndTime || null,
        performanceDuration: parsedData.performanceDuration || null,
        venue: parsedData.venue || null,
        venueAddress: parsedData.venueAddress || null,
        clientAddress: parsedData.clientAddress || null,
        eventType: parsedData.eventType || null,
        gigType: parsedData.gigType || null,
        fee: parsedData.fee || null,
        equipmentRequirements: parsedData.equipmentRequirements || null,
        specialRequirements: parsedData.specialRequirements || null,
        estimatedValue: parsedData.estimatedValue || null,
        status: parsedData.isPriceEnquiry ? "quoted" : "new",
        notes: parsedData.message || message.rawMessage,
        originalEmailContent: message.rawMessage,
        applyNowLink: parsedData.applyNowLink || null,
        responseNeeded: true,
        lastContactedAt: null,
        hasConflicts: false,
        conflictCount: 0,
        quotedAmount: parsedData.quotedPrice || null,
        depositAmount: parsedData.deposit || null,
        finalAmount: parsedData.fee || null
      });
      
      // Update message as converted
      await storage.updateUnparseableMessage(messageId, {
        status: 'converted',
        reviewNotes: `AI reprocessed and converted to booking #${booking.id}`,
        convertedToBookingId: booking.id,
        reviewedAt: new Date()
      });
      
      res.json({ 
        message: 'Message converted to booking successfully',
        messageId,
        bookingId: booking.id
      });

    } catch (error) {
      console.error('❌ Error converting message:', error);
      res.status(500).json({ error: 'Failed to convert message' });
    }
  });

  // Link message to existing booking
  app.post('/api/unparseable-messages/:id/link', authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      const messageId = parseInt(req.params.id);
      const { bookingId } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get the unparseable message
      const message = await storage.getUnparseableMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Verify the booking belongs to the user
      const booking = await storage.getBooking(bookingId);
      
      if (!booking || booking.userId !== userId) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Extract client info from the message
      const emailMatch = message.fromContact?.match(/[\w.-]+@[\w.-]+\.\w+/);
      const clientEmail = emailMatch ? emailMatch[0] : '';
      
      let clientName = 'Unknown';
      if (message.fromContact?.includes('<')) {
        const nameMatch = message.fromContact.match(/^([^<]+)/);
        if (nameMatch) clientName = nameMatch[1].trim();
      } else if (clientEmail) {
        clientName = clientEmail.split('@')[0];
      }

      // Note: Message is now linked to booking and can be accessed via the unparseable messages system

      // Update the unparseable message as converted
      await storage.updateUnparseableMessage(messageId, {
        status: 'converted',
        convertedToBookingId: bookingId,
        reviewNotes: `Manually linked to booking #${bookingId}`,
        reviewedAt: new Date()
      });

      res.json({ 
        message: 'Message successfully linked to booking',
        bookingId,
        messageId
      });

    } catch (error) {
      console.error('❌ Error linking message to booking:', error);
      res.status(500).json({ error: 'Failed to link message to booking' });
    }
  });

  // Delete message
  app.delete('/api/unparseable-messages/:id', authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
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