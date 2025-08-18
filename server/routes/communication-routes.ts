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

  // New endpoint for conversation page - get messages formatted for UI
  app.get('/api/conversations/:bookingId', requireAuth, async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const bookingId = parseInt(req.params.bookingId);
      console.log(`🔍 Fetching conversation for booking ${bookingId}, user ${userId}`);
      
      // Import storage and cloud storage
      const { storage } = await import('../core/storage');
      const { downloadFile } = await import('../core/cloud-storage');
      
      // Get message notifications for this booking (these have messageUrl fields)
      const messageNotifications = await storage.getMessageNotifications(userId);
      const bookingMessages = messageNotifications.filter(msg => msg.bookingId === bookingId);
      
      // Also get communications from clientCommunications table (outbound messages)
      const communications = await db
        .select()
        .from(clientCommunications)
        .where(and(
          eq(clientCommunications.userId, userId),
          eq(clientCommunications.bookingId, bookingId)
        ))
        .orderBy(clientCommunications.sentAt);

      const messages: any[] = [];
      
      // Process message notifications (incoming messages with HTML content in R2)
      for (const msg of bookingMessages) {
        try {
          // Download and parse HTML content from R2
          const downloadResult = await downloadFile(msg.messageUrl);
          let content = 'Message content unavailable';
          
          if (downloadResult.success && downloadResult.content) {
            // Extract text content from HTML and parse to get only the new reply
            const htmlContent = downloadResult.content;
            
            // Remove HTML tags and decode entities
            let rawText = htmlContent
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\s+/g, ' ')
              .trim();
            
            // Remove common email headers and footers first
            rawText = rawText
              .replace(/^Client Reply - Re: .+$/gm, '')
              .replace(/^BOOKING REPLY$/gm, '')
              .replace(/^From: .+$/gm, '')
              .replace(/^Subject: .+$/gm, '')
              .replace(/^Date: .+$/gm, '')
              .replace(/^To: .+$/gm, '')
              .replace(/^Booking ID: .+$/gm, '')
              .trim();
            
            // Try to extract only the new reply content by removing quoted text
            // Look for common email reply patterns
            const replyPatterns = [
              /^(.*?)(?:On .+? wrote:|From: .+?|Date: .+?|\d+\/\d+\/\d+.+?wrote:)/s,
              /^(.*?)(?:-----Original Message-----)/s,
              /^(.*?)(?:> .+)/s,  // Lines starting with >
              /^(.*?)(?:\n\n.+? <.+?@.+?> wrote:)/s,
              /^(.*?)(?:On \d+\/\d+\/\d+.+?wrote:)/s
            ];
            
            let foundMatch = false;
            for (const pattern of replyPatterns) {
              const match = rawText.match(pattern);
              if (match && match[1].trim().length > 5) {
                content = match[1].trim();
                foundMatch = true;
                break;
              }
            }
            
            // If no pattern matched, use the full text but clean it up
            if (!foundMatch) {
              content = rawText.length > 500 ? rawText.substring(0, 500) + '...' : rawText;
            }
            
            // Add proper formatting
            content = content
              .replace(/([.!?])\s+/g, '$1\n\n')  // Add line breaks after sentences
              .replace(/\s{2,}/g, ' ')  // Remove multiple spaces
              .replace(/\n{3,}/g, '\n\n')  // Limit to double line breaks
              .trim();
          }
          
          messages.push({
            id: `msg_${msg.id}`,
            bookingId: msg.bookingId,
            fromEmail: msg.senderEmail,
            toEmail: 'performer',
            subject: msg.subject,
            content: content,
            messageType: 'incoming',
            sentAt: msg.createdAt,
            isRead: msg.isRead
          });
        } catch (error) {
          console.error(`❌ Error processing message ${msg.id}:`, error);
          // Add message with error content instead of failing completely
          messages.push({
            id: `msg_${msg.id}`,
            bookingId: msg.bookingId,
            fromEmail: msg.senderEmail,
            toEmail: 'performer',
            subject: msg.subject,
            content: 'Error loading message content',
            messageType: 'incoming',
            sentAt: msg.createdAt,
            isRead: msg.isRead
          });
        }
      }

      // Process outbound communications - download content from R2 if messageBody is a URL
      for (const comm of communications) {
        let content = comm.messageBody || 'No content';
        
        // Check if messageBody contains an R2 URL and download the content
        if (content.includes('r2.dev') || content.includes('https://')) {
          try {
            // Extract the R2 key from the URL
            const urlMatch = content.match(/https:\/\/[^\/]+\.r2\.dev\/(.+?)(?:\s|$)/);
            if (urlMatch) {
              const r2Key = urlMatch[1];
              console.log(`📥 Downloading outbound message content from R2: ${r2Key}`);
              const downloadResult = await downloadFile(r2Key);
              
              if (downloadResult.success && downloadResult.content) {
                // Extract text content from HTML and format properly
                content = downloadResult.content
                  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                  .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                  .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to line breaks
                  .replace(/<\/p>/gi, '\n\n')     // Convert </p> to paragraph breaks
                  .replace(/<[^>]*>/g, '')        // Remove remaining HTML tags
                  .replace(/&nbsp;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/\s{2,}/g, ' ')        // Remove multiple spaces but keep line breaks
                  .replace(/\n{3,}/g, '\n\n')    // Limit to double line breaks
                  .trim();
              }
            }
          } catch (error) {
            console.error(`❌ Error downloading outbound message content:`, error);
          }
        }
        
        messages.push({
          id: `comm_${comm.id}`,
          bookingId: comm.bookingId,
          fromEmail: 'performer',
          toEmail: comm.clientEmail,
          subject: comm.subject,
          content: content,
          messageType: 'outgoing',
          sentAt: comm.sentAt,
          isRead: true
        });
      }

      // Sort all messages by date
      messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

      console.log(`✅ Found ${messages.length} conversation messages for booking ${bookingId} (${bookingMessages.length} incoming, ${communications.length} outgoing)`);
      res.json(messages);

    } catch (error) {
      console.error('❌ Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  // New endpoint for sending replies in conversation
  app.post('/api/conversations/reply', requireAuth, async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { bookingId, content, recipientEmail } = req.body;

      if (!bookingId || !content || !recipientEmail) {
        return res.status(400).json({ error: 'Missing required fields: bookingId, content, recipientEmail' });
      }

      // Get booking details for client name
      const booking = await db
        .select({ clientName: bookings.clientName, title: bookings.title })
        .from(bookings)
        .where(and(
          eq(bookings.id, bookingId),
          eq(bookings.userId, userId)
        ))
        .limit(1);

      if (!booking.length) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Record the communication
      const [communication] = await db.insert(clientCommunications).values({
        userId,
        bookingId,
        clientName: booking[0].clientName,
        clientEmail: recipientEmail,
        communicationType: 'email',
        direction: 'outbound',
        subject: `Re: ${booking[0].title}`,
        messageBody: content,
        deliveryStatus: 'sent'
      }).returning();

      // TODO: Actually send the email via Mailgun here
      // For now, we're just recording the communication
      
      console.log(`✅ Conversation reply recorded: ${content.substring(0, 50)}... to ${recipientEmail}`);
      res.json({ success: true, communication });

    } catch (error) {
      console.error('❌ Error sending conversation reply:', error);
      res.status(500).json({ error: 'Failed to send reply' });
    }
  });

  console.log('✅ Communication routes configured');
}