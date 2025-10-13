import { Request, Response, NextFunction } from 'express';
import { db } from '../core/database';
import { clientCommunications, bookings, userSettings, users } from '@shared/schema';
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { eq, desc, and } from 'drizzle-orm';
import { services } from '../core/services';

export function setupCommunicationRoutes(app: any) {
  // Save a communication record when an email/SMS is sent
  app.post('/api/communications', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
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
  app.get('/api/communications/client/:email', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
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
  app.get('/api/communications/booking/:bookingId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
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
  app.get('/api/communications', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
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
  app.get('/api/conversations/:bookingId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const bookingId = parseInt(req.params.bookingId);
      console.log(`🔍 Fetching conversation for booking ${bookingId}, user ${userId}`);
      
      // Import storage and cloud storage
      const { storage } = await import('../core/storage');
      const { downloadFile } = await import('../core/cloud-storage');
      
      // Get ALL message notifications for this booking (including dismissed ones for conversation view)
      const bookingMessages = await storage.getAllMessageNotificationsForBooking(userId, bookingId);
      
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
          console.log(`🔍 Processing message ${msg.id} with URL: ${msg.messageUrl}`);

          let content = 'Message content unavailable';
          
          // Check if messageUrl is a data URL (fallback storage)
          if (msg.messageUrl.startsWith('data:text/plain;base64,')) {
            try {
              const base64Content = msg.messageUrl.split(',')[1];
              content = Buffer.from(base64Content, 'base64').toString('utf-8');
              console.log(`✅ Retrieved message content from data URL fallback`);
            } catch (dataUrlError) {
              console.error(`❌ Failed to decode data URL:`, dataUrlError);
            }
          } else {
            // Download and parse HTML content from R2
            const downloadResult = await downloadFile(msg.messageUrl);

            if (!downloadResult.success) {
              console.error(`❌ Failed to download message from R2: ${msg.messageUrl}`, downloadResult.error);
              console.error(`❌ Download error details:`, downloadResult);
              
              // Check cloud storage configuration
              const { isCloudStorageConfigured } = await import('../core/cloud-storage');
              const isConfigured = isCloudStorageConfigured();
              console.error(`❌ Cloud storage configured: ${isConfigured}`);
              console.error(`❌ Environment variables: R2_ACCOUNT_ID=${!!process.env.R2_ACCOUNT_ID}, R2_ACCESS_KEY_ID=${!!process.env.R2_ACCESS_KEY_ID}, R2_SECRET_ACCESS_KEY=${!!process.env.R2_SECRET_ACCESS_KEY}, R2_BUCKET_NAME=${!!process.env.R2_BUCKET_NAME}`);
            }
            
            if (downloadResult.success && downloadResult.content) {
              // For client replies (messages with bookingId), show client's actual reply
              // Remove quoted/forwarded performer content
              const htmlContent = typeof downloadResult.content === 'string'
                ? downloadResult.content
                : downloadResult.content.toString('utf-8');
              console.log(`📧 Processing client reply for booking ${msg.bookingId}`);

              // Simple HTML to text conversion
              let rawText = htmlContent
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<\/div>/gi, '\n')
                .replace(/<\/tr>/gi, '\n')
                .replace(/<\/td>/gi, ' ')
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&\#(\d+);/g, (match, dec) => String.fromCharCode(dec))
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n\s*\n/g, '\n\n')
                .trim();

              // Enhanced email reply cleaning - remove quoted/forwarded content
              const lines = rawText.split(/\n+/);
              const meaningfulLines = [];
              let hitQuotedContent = false;

              for (const line of lines) {
                const cleanLine = line.trim();

                // Stop processing if we hit quoted content indicators
                if (cleanLine.startsWith('>') ||
                    cleanLine.includes('wrote:') ||
                    cleanLine.includes('From:') ||
                    cleanLine.includes('Sent:') ||
                    cleanLine.includes('Subject:') ||
                    cleanLine.includes('To:') ||
                    cleanLine.match(/^On .* wrote:/i) ||
                    cleanLine.match(/^On .* at .* wrote:/i) ||
                    cleanLine.match(/^-----Original Message-----/i) ||
                    cleanLine.match(/^----- Forwarded/i) ||
                    cleanLine.match(/^\d{1,2}\/\d{1,2}\/\d{4}.*wrote/i) ||
                    cleanLine.match(/^On \d/i) ||
                    cleanLine.match(/^Am \d/i) || // German "On"
                    cleanLine.match(/^Le \d/i) || // French "On"
                    cleanLine.includes('________________________________') ||
                    cleanLine.includes('===============') ||
                    cleanLine.includes('***************') ||
                    cleanLine.includes('Begin forwarded message') ||
                    cleanLine.includes('Forwarded message') ||
                    cleanLine.includes('Original message') ||
                    cleanLine.includes('wrote the following') ||
                    cleanLine.includes('Reply above this line') ||
                    cleanLine.includes('Sent from my iPhone') ||
                    cleanLine.includes('Sent from my iPad') ||
                    cleanLine.includes('Sent from Mail') ||
                    cleanLine.includes('Get Outlook') ||
                    cleanLine.match(/^<.*@.*>$/)) { // Email address only line
                  hitQuotedContent = true;
                  console.log(`📧 [REPLY-CLEAN] Hit quoted content marker: "${cleanLine.substring(0, 50)}..."`);
                  break;
                }

                // Skip header-like lines and common email signatures
                if (cleanLine &&
                    !cleanLine.startsWith('From:') &&
                    !cleanLine.startsWith('Subject:') &&
                    !cleanLine.startsWith('Date:') &&
                    !cleanLine.startsWith('To:') &&
                    !cleanLine.startsWith('Cc:') &&
                    !cleanLine.startsWith('Bcc:') &&
                    !cleanLine.startsWith('Sent:') &&
                    !cleanLine.startsWith('Reply-To:') &&
                    !cleanLine.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) &&
                    !cleanLine.match(/^mailto:/i) &&
                    !cleanLine.match(/^http[s]?:\/\//i) && // Skip standalone URLs
                    !cleanLine.match(/^View this email in your browser/i) &&
                    !cleanLine.match(/^Unsubscribe/i) &&
                    cleanLine.length > 3) {
                  meaningfulLines.push(cleanLine);
                }
              }

              console.log(`✅ Extracted client's actual reply (removed quoted content, found ${meaningfulLines.length} meaningful lines)`);
              if (meaningfulLines.length > 0) {
                console.log(`📧 First line: "${meaningfulLines[0].substring(0, 50)}..."`);
              }

              // Show only the client's actual reply, not quoted performer content
              content = meaningfulLines.length > 0 ? meaningfulLines.join('\n\n') : rawText.substring(0, 500);
            }
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
          // Add message with helpful error content instead of failing completely
          const errorContent = `Message content temporarily unavailable. 

This is a client reply that should display the complete message without AI parsing. 

The system is storing messages but having trouble retrieving them from cloud storage. 

Troubleshooting info:
- Message ID: ${msg.id}
- Storage URL: ${msg.messageUrl}
- Error: ${error.message || 'Unknown error'}

The Extract Details button below can be used once this issue is resolved.`;

          messages.push({
            id: `msg_${msg.id}`,
            bookingId: msg.bookingId,
            fromEmail: msg.senderEmail,
            toEmail: 'performer',
            subject: msg.subject,
            content: errorContent,
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
      
      // Auto-dismiss all undismissed notifications for this booking when conversation is viewed
      const undismissedNotifications = bookingMessages.filter(msg => !msg.isDismissed);
      if (undismissedNotifications.length > 0) {
        console.log(`🔄 Auto-dismissing ${undismissedNotifications.length} notifications for booking ${bookingId}`);
        const notificationIds = undismissedNotifications.map(msg => msg.id);
        
        // Dismiss all notifications for this booking
        await Promise.all(
          notificationIds.map(id => storage.dismissMessageNotification(id))
        );
        
        console.log(`✅ Auto-dismissed ${notificationIds.length} notifications for booking ${bookingId}`);
      }
      
      res.json({
        messages,
        unreadNotificationIds: [] // Always return empty since we just dismissed them
      });

    } catch (error) {
      console.error('❌ Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  // New endpoint for sending replies in conversation
  app.post('/api/conversations/reply', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('📧 [CONVERSATION-REPLY] Starting conversation reply process...');
      
      const userId = req.user?.id;
      console.log('📧 [CONVERSATION-REPLY] User ID from token:', userId);
      
      if (!userId) {
        console.log('❌ [CONVERSATION-REPLY] No user ID found in token');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { bookingId, content, recipientEmail, travelExpenses } = req.body;
      console.log('📧 [CONVERSATION-REPLY] Request body:', { bookingId, content: content?.substring(0, 50) + '...', recipientEmail, travelExpenses });

      if (!bookingId || !content || !recipientEmail) {
        console.log('❌ [CONVERSATION-REPLY] Missing required fields:', { bookingId: !!bookingId, content: !!content, recipientEmail: !!recipientEmail });
        return res.status(400).json({ error: 'Missing required fields: bookingId, content, recipientEmail' });
      }

      // Get booking details for client name
      console.log('📧 [CONVERSATION-REPLY] Fetching booking details...');
      const booking = await db
        .select({
          clientName: bookings.clientName,
          gigType: bookings.gigType,
          eventType: bookings.eventType,
          venue: bookings.venue,
          workflowStage: bookings.workflowStage
        })
        .from(bookings)
        .where(and(
          eq(bookings.id, bookingId),
          eq(bookings.userId, userId)
        ))
        .limit(1);

      console.log('📧 [CONVERSATION-REPLY] Booking query result:', booking.length > 0 ? {
        clientName: booking[0].clientName,
        gigType: booking[0].gigType,
        eventType: booking[0].eventType,
        venue: booking[0].venue,
        workflowStage: booking[0].workflowStage
      } : 'No booking found');

      if (!booking.length) {
        console.log('❌ [CONVERSATION-REPLY] Booking not found for ID:', bookingId, 'and user:', userId);
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Get user data for emailPrefix
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length || !user[0].emailPrefix) {
        console.log('❌ [CONVERSATION-REPLY] User emailPrefix not found for user:', userId);
        return res.status(400).json({ error: 'User email prefix not configured' });
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
      console.log('📧 [CONVERSATION-REPLY] Business email:', userSetting?.businessContactEmail || 'Not configured');

      if (!userSetting?.businessContactEmail) {
        console.log('❌ [CONVERSATION-REPLY] Business email not configured for user:', userId);
        return res.status(400).json({ error: 'Business email not configured in settings' });
      }

      // Update booking with travel expenses BEFORE sending email (so it always saves)
      if (travelExpenses && parseFloat(travelExpenses) > 0) {
        console.log(`💰 [CONVERSATION-REPLY] Updating booking ${bookingId} with travel expenses: £${travelExpenses}`);
        try {
          const travelUpdateResult = await db.update(bookings)
            .set({
              travelExpense: parseFloat(travelExpenses)    // Maps to travel_expense column in database
            })
            .where(and(
              eq(bookings.id, bookingId),
              eq(bookings.userId, userId)
            ))
            .returning({ updatedTravelExpense: bookings.travelExpense });
          
          console.log(`✅ Updated booking ${bookingId} with travel expenses: £${travelExpenses}`);
          console.log(`💰 Travel expenses update result:`, travelUpdateResult);
        } catch (travelError) {
          console.error(`❌ Failed to update travel expenses for booking ${bookingId}:`, travelError);
          // Continue with email sending even if travel expense update fails
        }
      } else {
        console.log(`ℹ️ No travel expenses provided or amount is 0, skipping booking update`);
      }

      // Create unique reply-to address with user ID and booking ID for proper routing
      const replyToAddress = `User${userId}-Booking${bookingId} <user${userId}-booking${bookingId}@mg.musobuddy.com>`;

      // Create a meaningful subject line from available booking data
      const bookingTitle = booking[0].gigType || booking[0].eventType || 'Event';
      const venueText = booking[0].venue ? ` at ${booking[0].venue}` : '';
      const subject = `Re: ${bookingTitle}${venueText}`;
      
      console.log(`📧 Setting up conversation reply with routing: ${replyToAddress}`);

      // Get theme color from settings (same logic as templates)
      const themeColor = userSetting?.themeAccentColor || userSetting?.theme_accent_color || '#667eea';
      
      // Calculate contrast for header text
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      };

      const getLuminance = (r: number, g: number, b: number) => {
        const rsRGB = r / 255;
        const gsRGB = g / 255;
        const bsRGB = b / 255;
        
        const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
        const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
        const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
        
        return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
      };

      const rgb = hexToRgb(themeColor);
      const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
      const textColor = luminance > 0.5 ? '#000000' : '#ffffff';
      
      const senderName = userSetting?.businessName || 
                        `${userSetting?.fullName || ''}`.trim() || 
                        userSetting?.businessContactEmail;
      
      // Function to convert text to properly formatted HTML paragraphs  
      const formatEmailContent = (text: string) => {
        return text
          .split(/\n\s*\n/) // Split on double line breaks for paragraphs
          .map(paragraph => paragraph.trim())
          .filter(paragraph => paragraph.length > 0)
          .map(paragraph => {
            // Convert single line breaks within paragraphs to <br> tags to preserve formatting
            const cleanParagraph = paragraph.replace(/\n/g, '<br>').trim();
            return `<p style="margin: 0 0 16px 0; line-height: 1.6;">${cleanParagraph}</p>`;
          })
          .join('');
      };

      // Use the exact same professional email template as the templates page
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="x-apple-disable-message-reformatting">
    <title>${subject}</title>
    <!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); line-height: 1.6;">
    <div style="max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12); border: 1px solid rgba(0,0,0,0.08);">
        
        <!-- Header with music note accent -->
        <div style="background: linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%); color: ${textColor}; padding: 32px 28px; text-align: center; position: relative;">
            <div style="position: absolute; top: 16px; right: 24px; font-size: 20px; opacity: 0.7;">♪</div>
            <div style="background: rgba(255,255,255,0.15); color: ${textColor}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; display: inline-block; margin-bottom: 12px; letter-spacing: 0.5px;">MusoBuddy</div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 400; line-height: 1.3; font-family: Georgia, 'Times New Roman', serif;">${subject}</h1>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 36px;">
            <div style="font-size: 16px; color: #2c3e50; line-height: 1.7;">
                ${formatEmailContent(content)}
            </div>
            
            
            <!-- Professional signature card -->
            <div style="margin-top: 40px; padding: 28px; background: linear-gradient(135deg, #fafbfc 0%, #f1f3f4 100%); border-radius: 12px; text-align: center; border: 1px solid #e8eaed;">
                <div style="width: 60px; height: 3px; background: ${themeColor}; margin: 0 auto 20px auto; border-radius: 2px;"></div>
                <div style="font-size: 20px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; font-family: Georgia, serif;">${senderName || 'MusoBuddy'}</div>
                <div style="color: #5f6368; font-size: 14px; margin-bottom: 16px; font-style: italic;">Professional Music Services</div>
                <div style="color: ${themeColor}; font-weight: 500; font-size: 15px; text-decoration: none;">${userSetting.businessContactEmail}</div>
            </div>
        </div>
        
        <!-- Clean footer -->
        <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: #95a5a6; padding: 20px; text-align: center;">
            <div style="font-size: 12px; opacity: 0.8;">Sent with ♪ via <span style="color: ${themeColor}; font-weight: 500;">MusoBuddy</span></div>
        </div>
    </div>
</body>
</html>`;

      // Send email via centralized email service with proper reply-to routing
      // Use personalized emailPrefix@enquiries.musobuddy.com for the from address
      const fromEmail = `${user[0].emailPrefix}@enquiries.musobuddy.com`;
      const fromName = userSetting.emailFromName || userSetting.businessName || 'MusoBuddy';

      try {
        const emailResult = await services.sendEmail({
          from: `${fromName} <${fromEmail}>`,
          to: recipientEmail,
          replyTo: replyToAddress,
          subject: subject,
          html: emailBody,
          headers: {
            'X-Mailgun-Variables': JSON.stringify({
              userId: userId,
              bookingId: bookingId,
              type: 'conversation_reply'
            })
          }
        });

        console.log(`📧 Conversation reply email data:`, {
          from: `${fromName} <${fromEmail}>`,
          to: recipientEmail,
          replyTo: replyToAddress,
          subject: subject
        });
        
        console.log(`🔍 [DEBUG] Expected reply-to format: User${userId}-Booking${bookingId} <user${userId}-booking${bookingId}@mg.musobuddy.com>`);
        console.log(`🔍 [DEBUG] Actual reply-to being sent: ${replyToAddress}`);

        console.log(`✅ Conversation reply email sent via email service:`, emailResult.messageId);
        
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
          mailgunMessageId: emailResult.messageId
        }).returning();

        // Mark all message notifications for this booking as read (user has responded)
        const { storage } = await import('../core/storage');
        await storage.markAllBookingMessageNotificationsAsRead(bookingId, userId);
        console.log(`✅ Marked all message notifications as read for booking ${bookingId}`);

        // Auto-advance workflow stage if this is the first response
        console.log(`🔍 Checking workflow stage for booking ${bookingId}: current stage = '${booking[0].workflowStage}'`);
        if (booking[0].workflowStage === 'initial') {
          console.log(`📝 Booking ${bookingId} is in 'initial' stage, advancing to 'negotiating'...`);
          const updateResult = await db.update(bookings)
            .set({ workflowStage: 'negotiating' })
            .where(and(
              eq(bookings.id, bookingId),
              eq(bookings.userId, userId)
            ))
            .returning({ updatedStage: bookings.workflowStage });
          console.log(`✨ Advanced booking ${bookingId} from 'initial' to 'negotiating' stage after first response`);
          console.log(`✅ Update result:`, updateResult);
        } else {
          console.log(`ℹ️ Booking ${bookingId} is already in '${booking[0].workflowStage}' stage, no auto-advance needed`);
        }


        console.log(`✅ Conversation reply sent and recorded: ${content.substring(0, 50)}... to ${recipientEmail}`);
        res.json({ success: true, communication, mailgunMessageId: emailResult.messageId });

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
  app.post('/api/conversations/ignore', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
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