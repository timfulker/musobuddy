/**
 * Direct webhook integration - bypasses all routing conflicts
 * This creates a completely separate webhook handler that works independently
 */

import express from 'express';
import { storage } from './server/storage';

const webhookApp = express();

// Simple webhook handler that bypasses all middleware conflicts
webhookApp.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req, res) => {
  console.log('📧 DIRECT WEBHOOK HIT - BYPASSING ALL CONFLICTS');
  console.log('📧 Body:', req.body);
  
  try {
    // Extract email data
    const sender = req.body.sender || req.body.from || 'unknown@example.com';
    const subject = req.body.subject || 'Email enquiry';
    const bodyText = req.body['body-plain'] || req.body.text || 'No message content';
    
    // Extract client name
    let clientName = 'Unknown Client';
    if (sender.includes('<')) {
      const nameMatch = sender.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim().replace(/['"]/g, '');
      }
    }
    if (clientName === 'Unknown Client') {
      const emailMatch = sender.match(/[\w.-]+@[\w.-]+\.\w+/);
      const email = emailMatch ? emailMatch[0] : sender;
      clientName = email.split('@')[0];
    }
    
    // Create enquiry with minimal data
    const enquiry = {
      userId: '43963086',
      title: subject,
      clientName: clientName,
      clientEmail: sender.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || sender,
      clientPhone: null,
      eventDate: null,
      eventTime: null,
      eventEndTime: null,
      performanceDuration: null,
      venue: null,
      eventType: null,
      gigType: null,
      estimatedValue: null,
      status: 'new' as const,
      notes: bodyText,
      responseNeeded: true,
      lastContactedAt: null
    };
    
    console.log('📧 Creating enquiry:', enquiry.clientName);
    const newEnquiry = await storage.createEnquiry(enquiry);
    
    console.log('📧 ✅ DIRECT WEBHOOK SUCCESS - ENQUIRY CREATED:', newEnquiry.id);
    
    res.status(200).json({
      success: true,
      enquiryId: newEnquiry.id,
      message: 'Email processed successfully'
    });
    
  } catch (error: any) {
    console.error('📧 Direct webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DISABLED: This duplicate webhook server is causing conflicts
// The main webhook handler is now in server/index.ts
// const PORT = process.env.WEBHOOK_PORT || 3001;
// webhookApp.listen(PORT, () => {
//   console.log(`📧 Direct webhook server running on port ${PORT}`);
// });

export { webhookApp };