import { Request, Response, NextFunction } from 'express';
import { db } from '../core/database';
import { clientCommunications, bookings, userSettings } from '@shared/schema';
import { requireAuth } from '../middleware/auth';
import { eq, desc, and } from 'drizzle-orm';
import { services } from '../core/services';

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
            console.log(`🔍 Raw HTML content (first 500 chars): ${htmlContent.substring(0, 500)}`);
            
            // Remove HTML tags and decode entities
            let rawText = htmlContent
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/p>/gi, '\n\n')
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\s+/g, ' ')
              .trim();
            
            console.log(`🔍 After HTML removal (first 500 chars): ${rawText.substring(0, 500)}`);
            
            // Extract the actual reply content using a specific pattern for this email format
            // Look for content after "Booking ID: XXXX" and before "On [date] ... wrote:"
            const bookingReplyPattern = /Booking ID: \d+\s*(.*?)(?:On \d{1,2} \w+ \d{4} at \d{1,2}:\d{2}.+?[,<]|On \d{1,2}\/\d{1,2}\/\d{4}.+?wrote:)/s;
            const bookingMatch = rawText.match(bookingReplyPattern);
            
            console.log(`🔍 Testing booking reply pattern: ${bookingReplyPattern.toString()}`);
            console.log(`🔍 Pattern match result: ${bookingMatch ? 'FOUND' : 'NOT FOUND'}`);
            if (bookingMatch) {
              console.log(`🔍 Matched content: "${bookingMatch[1]}"`);
            }
            
            if (bookingMatch && bookingMatch[1].trim().length > 3) {
              content = bookingMatch[1].trim();
              console.log(`✅ Found booking reply content: ${content}`);
            } else {
              // Fallback: Try other patterns
              const replyPatterns = [
                // Look for content before "On [date/time] ... wrote:"
                /^(.*?)(?:On \d{1,2}\/\d{1,2}\/\d{4}.+?wrote:|On \d{1,2} \w+ \d{4}.+?wrote:)/s,
                // Look for content before quoted reply indicators
                /^(.*?)(?:> .+)/s,
                // Look for content before original message markers
                /^(.*?)(?:-----Original Message-----)/s,
                // Look for content before "From:" headers
                /^(.*?)(?:From: .+@.+)/s,
                // Look for content before timestamp patterns
                /^(.*?)(?:\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2})/s,
                // Simple pattern: everything before quoted content
                /^([^>]+?)(?:>.+)/s
              ];
              
              let foundMatch = false;
              for (const pattern of replyPatterns) {
                const match = rawText.match(pattern);
                if (match && match[1].trim().length > 3) {
                  content = match[1].trim();
                  foundMatch = true;
                  console.log(`✅ Found match with pattern: ${pattern.toString()}`);
                  console.log(`✅ Extracted content: ${content}`);
                  break;
                }
              }
              
              if (!foundMatch) {
                console.log(`⚠️ No patterns matched, using manual line extraction`);
                
                // If no pattern matched, check if there's meaningful content at the beginning
                const lines = rawText.split(/\n+/);
                const meaningfulLines = [];
                
                for (const line of lines) {
                  const cleanLine = line.trim();
                  // Skip if line looks like headers, footers, or quoted content
                  if (cleanLine && 
                      !cleanLine.startsWith('>') && 
                      !cleanLine.startsWith('From:') &&
                      !cleanLine.startsWith('Subject:') &&
                      !cleanLine.startsWith('Date:') &&
                      !cleanLine.startsWith('On ') &&
                      !cleanLine.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) &&
                      cleanLine.length > 3) {
                    meaningfulLines.push(cleanLine);
                  }
                  // Stop if we hit quoted content
                  if (cleanLine.startsWith('>') || cleanLine.includes('wrote:')) {
                    break;
                  }
                }
                
                if (meaningfulLines.length > 0) {
                  content = meaningfulLines.join('\n\n');
                  console.log(`✅ Extracted meaningful lines: ${content}`);
                } else {
                  content = rawText.length > 500 ? rawText.substring(0, 500) + '...' : rawText;
                  console.log(`⚠️ Using raw text: ${content}`);
                }
              }
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
                let rawContent = downloadResult.content
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
                
                // Extract content starting from "Dear" to skip headers/metadata
                const dearPattern = /(?:Dear\s+\w+|Hi\s+\w+|Hello\s+\w+),?\s*(.*)/s;
                const dearMatch = rawContent.match(dearPattern);
                
                if (dearMatch) {
                  // Include the greeting and the rest of the content
                  const greeting = rawContent.match(/(Dear\s+\w+|Hi\s+\w+|Hello\s+\w+),?/i);
                  content = greeting ? greeting[0] + ',\n\n' + dearMatch[1].trim() : dearMatch[0];
                  console.log(`✅ Extracted content starting from greeting: ${content.substring(0, 100)}...`);
                } else {
                  content = rawContent;
                  console.log(`⚠️ No greeting pattern found, using full content`);
                }
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
      
      // Include unread message notification IDs so frontend can show ignore button
      const unreadNotificationIds = bookingMessages
        .filter(msg => !msg.isRead)
        .map(msg => msg.id);
      
      res.json({
        messages,
        unreadNotificationIds
      });

    } catch (error) {
      console.error('❌ Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  // New endpoint for sending replies in conversation
  app.post('/api/conversations/reply', requireAuth, async (req: Request & { user?: any }, res: Response) => {
    try {
      console.log('📧 [CONVERSATION-REPLY] Starting conversation reply process...');
      
      const userId = req.user?.userId;
      console.log('📧 [CONVERSATION-REPLY] User ID from token:', userId);
      
      if (!userId) {
        console.log('❌ [CONVERSATION-REPLY] No user ID found in token');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { bookingId, content, recipientEmail } = req.body;
      console.log('📧 [CONVERSATION-REPLY] Request body:', { bookingId, content: content?.substring(0, 50) + '...', recipientEmail });

      if (!bookingId || !content || !recipientEmail) {
        console.log('❌ [CONVERSATION-REPLY] Missing required fields:', { bookingId: !!bookingId, content: !!content, recipientEmail: !!recipientEmail });
        return res.status(400).json({ error: 'Missing required fields: bookingId, content, recipientEmail' });
      }

      // Get booking details for client name
      console.log('📧 [CONVERSATION-REPLY] Fetching booking details...');
      const booking = await db
        .select({ clientName: bookings.clientName, title: bookings.title })
        .from(bookings)
        .where(and(
          eq(bookings.id, bookingId),
          eq(bookings.userId, userId)
        ))
        .limit(1);

      console.log('📧 [CONVERSATION-REPLY] Booking query result:', booking.length > 0 ? { clientName: booking[0].clientName, title: booking[0].title } : 'No booking found');

      if (!booking.length) {
        console.log('❌ [CONVERSATION-REPLY] Booking not found for ID:', bookingId, 'and user:', userId);
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Get user settings for sender info and email template
      console.log('📧 [CONVERSATION-REPLY] Fetching user settings...');
      const userSettingsResults = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      console.log('📧 [CONVERSATION-REPLY] User settings query result:', userSettingsResults.length > 0 ? 'Found' : 'Not found');
      const userSetting = userSettingsResults[0];
      console.log('📧 [CONVERSATION-REPLY] Business email:', userSetting?.businessEmail || 'Not configured');
      
      if (!userSetting?.businessEmail) {
        console.log('❌ [CONVERSATION-REPLY] Business email not configured for user:', userId);
        return res.status(400).json({ error: 'Business email not configured in settings' });
      }

      // Create unique reply-to address with user ID and booking ID for proper routing
      const replyToAddress = `${userId}-${bookingId}@enquiries.musobuddy.com`;
      const subject = `Re: ${booking[0].title}`;
      
      console.log(`📧 Setting up conversation reply with routing: ${replyToAddress}`);

      // The content is already AI-generated and formatted from the frontend
      // Just wrap it in the standard email template
      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .message {
              margin: 20px 0;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="message">${content.replace(/\n/g, '<br>')}</div>
          </div>
        </body>
        </html>
      `;

      // Send email via Mailgun with proper reply-to routing
      try {
        const { mailgun } = services;
        const mailgunData = {
          from: `${userSetting.emailFromName || userSetting.businessName || 'MusoBuddy'} <${userSetting.businessEmail}>`,
          to: recipientEmail,
          'reply-to': replyToAddress,
          subject: subject,
          html: emailBody,
          'h:X-Mailgun-Variables': JSON.stringify({
            userId: userId,
            bookingId: bookingId,
            type: 'conversation_reply'
          })
        };

        console.log(`📧 Mailgun conversation reply data:`, {
          from: mailgunData.from,
          to: mailgunData.to,
          replyTo: mailgunData['reply-to'],
          subject: mailgunData.subject,
          variables: mailgunData['h:X-Mailgun-Variables']
        });

        const mailgunResponse = await mailgun.messages.create('enquiries.musobuddy.com', mailgunData);
        console.log(`✅ Conversation reply email sent via Mailgun:`, mailgunResponse.id);
        
        // Record the communication with successful delivery
        const [communication] = await db.insert(clientCommunications).values({
          userId,
          bookingId,
          clientName: booking[0].clientName,
          clientEmail: recipientEmail,
          communicationType: 'email',
          direction: 'outbound',
          subject: subject,
          messageBody: content,
          deliveryStatus: 'delivered',
          mailgunId: mailgunResponse.id
        }).returning();

        // Mark all message notifications for this booking as read (user has responded)
        const { storage } = await import('../core/storage');
        await storage.markAllBookingMessageNotificationsAsRead(bookingId, userId);
        console.log(`✅ Marked all message notifications as read for booking ${bookingId}`);

        console.log(`✅ Conversation reply sent and recorded: ${content.substring(0, 50)}... to ${recipientEmail}`);
        res.json({ success: true, communication, mailgunId: mailgunResponse.id });

      } catch (mailgunError) {
        console.error('❌ Mailgun error sending conversation reply:', mailgunError);
        
        // Record the communication with failed delivery
        const [communication] = await db.insert(clientCommunications).values({
          userId,
          bookingId,
          clientName: booking[0].clientName,
          clientEmail: recipientEmail,
          communicationType: 'email',
          direction: 'outbound',
          subject: subject,
          messageBody: content,
          deliveryStatus: 'failed'
        }).returning();

        return res.status(500).json({ error: 'Failed to send email via Mailgun', communication });
      }

    } catch (error) {
      console.error('❌ Error sending conversation reply:', error);
      res.status(500).json({ error: 'Failed to send reply' });
    }
  });

  // New endpoint for ignoring messages (marks them as read without responding)
  app.post('/api/conversations/ignore', requireAuth, async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { bookingId } = req.body;

      if (!bookingId) {
        return res.status(400).json({ error: 'Missing required field: bookingId' });
      }

      // Mark all message notifications for this booking as read (user has chosen to ignore)
      const { storage } = await import('../core/storage');
      const result = await storage.markAllBookingMessageNotificationsAsRead(bookingId, userId);
      
      console.log(`✅ Ignored messages for booking ${bookingId} - marked ${result.length} notifications as read`);
      res.json({ success: true, markedAsRead: result.length });

    } catch (error) {
      console.error('❌ Error ignoring messages:', error);
      res.status(500).json({ error: 'Failed to ignore messages' });
    }
  });

  console.log('✅ Communication routes configured');
}