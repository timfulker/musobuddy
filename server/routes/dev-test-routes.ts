import { Router } from 'express';
import { parseBookingMessage } from '../ai/booking-message-parser';

const router = Router();

// Sample Encore email content for testing
const SAMPLE_ENCORE_EMAIL = `---------- Forwarded message ---------
From: Tim Fulker <timfulker@gmail.com>
Date: Sun, Sep 21, 2025 at 2:30 PM
Subject: Fwd: Saxophonist needed for corporate event in Oxford
To: timfulkermusic@enquiries.musobuddy.com

£260 - £450

Saxophonist needed for corporate event in Oxford

Thursday
23
Oct 2025

Corporate event    4.00pm for 2 hours

Oxford, Oxfordshire (OX1)

Apply now button would be here...

Encore Musicians notification
`;

// Development email parsing test endpoint
router.post('/api/dev/test-email-parsing', async (req, res) => {
  try {
    console.log('🧪 [DEV-TEST] Starting email parsing test...');

    // Use provided email content or default sample
    const emailContent = req.body.emailContent || SAMPLE_ENCORE_EMAIL;
    const subject = req.body.subject || 'Saxophonist needed for corporate event in Oxford';
    const clientContact = req.body.clientContact || 'test@example.com';

    console.log('📧 [DEV-TEST] Testing with email content:', emailContent.substring(0, 200) + '...');

    // Parse the email
    const startTime = Date.now();
    const result = await parseBookingMessage(emailContent, clientContact, undefined, 'test-user', subject);
    const parseTime = Date.now() - startTime;

    console.log('✅ [DEV-TEST] Parsing completed in', parseTime, 'ms');
    console.log('📊 [DEV-TEST] Result:', result);

    // Return detailed test results
    res.json({
      success: true,
      parseTimeMs: parseTime,
      result: result,
      testData: {
        emailLength: emailContent.length,
        subject: subject,
        clientContact: clientContact
      }
    });

  } catch (error) {
    console.error('❌ [DEV-TEST] Email parsing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Quick test endpoint with predefined Encore email
router.get('/api/dev/test-encore-parsing', async (req, res) => {
  try {
    console.log('🎵 [DEV-TEST] Testing Encore email parsing...');

    const result = await parseBookingMessage(
      SAMPLE_ENCORE_EMAIL,
      'test@example.com',
      undefined,
      'test-user',
      'Saxophonist needed for corporate event in Oxford'
    );

    res.json({
      success: true,
      message: 'Encore email parsing test completed',
      expectedData: {
        clientName: 'Encore Musicians',
        eventDate: '2025-10-23',
        fee: 260,
        eventTime: '16:00',
        eventEndTime: '18:00',
        venueAddress: 'Oxford, Oxfordshire',
        eventType: 'Corporate Event'
      },
      actualResult: result
    });

  } catch (error) {
    console.error('❌ [DEV-TEST] Encore parsing test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint for debugging email preprocessing
router.post('/api/dev/test-email-cleaning', (req, res) => {
  try {
    const emailContent = req.body.emailContent || SAMPLE_ENCORE_EMAIL;

    // Import the cleaning function (we'll need to export it)
    const { cleanForwardedEmail } = require('../ai/booking-message-parser');
    const cleaned = cleanForwardedEmail ? cleanForwardedEmail(emailContent) : 'Function not available';

    res.json({
      success: true,
      original: {
        content: emailContent,
        length: emailContent.length
      },
      cleaned: {
        content: cleaned,
        length: typeof cleaned === 'string' ? cleaned.length : 0
      },
      removed: emailContent.length - (typeof cleaned === 'string' ? cleaned.length : 0)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;