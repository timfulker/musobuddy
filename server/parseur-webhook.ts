import { Request, Response } from 'express';
import { storage } from './storage';

/**
 * Parseur webhook handler for structured email data
 * This receives clean, parsed data from Parseur instead of raw emails
 */
export async function handleParseurWebhook(req: Request, res: Response): Promise<void> {
  console.log('🎯 PARSEUR WEBHOOK RECEIVED');
  console.log('🎯 Headers:', req.headers);
  console.log('🎯 Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Parseur sends clean, structured data like:
    // {
    //   "client_name": "Sarah Johnson",
    //   "client_email": "sarah@example.com",
    //   "client_phone": "07123 456789",
    //   "event_date": "2025-08-15",
    //   "event_time": "19:00",
    //   "venue": "The Grand Hotel",
    //   "event_type": "Wedding",
    //   "message": "Looking for a saxophonist for our wedding reception..."
    // }
    
    const {
      client_name,
      client_email,
      client_phone,
      event_date,
      event_time,
      venue,
      event_type,
      gig_type,
      message,
      subject,
      estimated_value
    } = req.body;

    // Create enquiry from structured Parseur data
    const enquiry = {
      userId: '43963086', // Your user ID
      title: subject || `New enquiry from ${client_name || 'Unknown Client'}`,
      clientName: client_name || 'Unknown Client',
      clientEmail: client_email || 'unknown@example.com',
      clientPhone: client_phone || null,
      eventDate: event_date ? new Date(event_date) : null,
      eventTime: event_time || null,
      eventEndTime: null,
      performanceDuration: null,
      venue: venue || null,
      eventType: event_type || null,
      gigType: gig_type || null,
      estimatedValue: estimated_value ? parseFloat(estimated_value) : null,
      notes: message || 'No message provided',
      source: 'Parseur Email Forwarding',
      status: 'new' as const,
      followUpDate: null,
      priority: 'medium' as const
    };

    console.log('🎯 Creating enquiry:', enquiry);
    
    const newEnquiry = await storage.createEnquiry(enquiry);
    
    console.log('🎯 ✅ ENQUIRY CREATED SUCCESSFULLY!');
    console.log('🎯 Enquiry ID:', newEnquiry.id);
    
    res.status(200).json({
      success: true,
      message: 'Parseur webhook processed successfully',
      enquiryId: newEnquiry.id,
      clientName: enquiry.clientName,
      processing: 'parseur-structured-data'
    });
    
  } catch (error: any) {
    console.error('🎯 PARSEUR WEBHOOK ERROR:', error.message);
    console.error('🎯 Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Parseur webhook processing failed',
      details: error.message
    });
  }
}