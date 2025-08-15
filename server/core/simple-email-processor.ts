/**
 * Simple Email Processing System
 * Clean implementation without complex queues or retry logic
 */

import { parseBookingMessage } from '../ai/booking-message-parser';
import { storage } from './storage';

interface SimpleEmailData {
  from: string;
  subject: string;
  body: string;
  recipient: string;
  timestamp: Date;
}

export class SimpleEmailProcessor {
  /**
   * Process incoming email directly with AI parsing
   */
  static async processEmail(emailData: SimpleEmailData): Promise<{ success: boolean; bookingId?: number; error?: string }> {
    try {
      console.log('📧 Processing email:', {
        from: emailData.from,
        subject: emailData.subject,
        bodyLength: emailData.body.length
      });

      // Extract user from email prefix
      const emailPrefix = emailData.recipient.split('@')[0];
      const user = await storage.getUserByEmailPrefix(emailPrefix);
      
      if (!user) {
        console.log(`❌ No user found for email prefix: ${emailPrefix}`);
        return { success: false, error: 'User not found' };
      }

      // Parse with AI
      const parsedData = await parseBookingMessage(emailData.body, emailData.from, undefined, user.id);
      
      if (!parsedData.eventDate || !parsedData.venue || parsedData.confidence < 0.5) {
        // Store as unparseable message
        await storage.createUnparseableMessage({
          userId: user.id,
          fromContact: emailData.from,
          subject: emailData.subject,
          rawMessage: emailData.body,
          parsedData: JSON.stringify(parsedData),
          confidence: parsedData.confidence || 0
        });
        
        console.log('📝 Stored as unparseable message (low confidence or missing data)');
        return { success: true, error: 'Stored as unparseable message' };
      }

      // Create booking
      const booking = await storage.createBooking({
        userId: user.id,
        clientName: parsedData.clientName || emailData.from,
        clientEmail: parsedData.clientEmail || emailData.from,
        clientPhone: parsedData.clientPhone,
        venue: parsedData.venue,
        venueAddress: parsedData.venueAddress,
        eventDate: parsedData.eventDate,
        eventTime: parsedData.eventTime,
        eventType: parsedData.eventType || 'booking',
        status: 'inquiry',
        fee: parsedData.fee,
        message: emailData.body,
        aiConfidence: parsedData.confidence
      });

      console.log(`✅ Created booking #${booking.id} with ${Math.round(parsedData.confidence * 100)}% confidence`);
      return { success: true, bookingId: booking.id };

    } catch (error: any) {
      console.error('❌ Email processing error:', error);
      return { success: false, error: error.message };
    }
  }
}