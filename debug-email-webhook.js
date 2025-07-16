/**
 * Debug email webhook to identify why emails aren't creating enquiries
 */

import { storage } from './server/storage.js';

async function debugEmailWebhook() {
  console.log('🔍 Debugging email webhook system...');
  
  try {
    // 1. Check if there are any recent enquiries
    const recentEnquiries = await storage.getBookings('43963086');
    console.log(`📊 Total bookings/enquiries in system: ${recentEnquiries.length}`);
    
    if (recentEnquiries.length > 0) {
      const mostRecent = recentEnquiries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      console.log(`📅 Most recent enquiry: ${mostRecent.title} (${mostRecent.createdAt.toISOString()})`);
    }
    
    // 2. Check if OpenAI API key is configured
    const hasOpenAIKey = !!process.env.OPENAI_EMAIL_PARSING_KEY;
    console.log(`🤖 OpenAI Email Parsing Key configured: ${hasOpenAIKey}`);
    
    // 3. Test webhook endpoint accessibility
    console.log('📡 Webhook endpoint should be accessible at: https://musobuddy.replit.app/api/webhook/mailgun');
    
    // 4. Check Mailgun configuration
    console.log('📧 Mailgun configuration status:');
    console.log('   - Domain: mg.musobuddy.com');
    console.log('   - Expected route: leads@musobuddy.com → webhook');
    console.log('   - Production URL: https://musobuddy.replit.app/api/webhook/mailgun');
    
    // 5. Check if there are any test enquiries we can create
    console.log('🧪 Testing enquiry creation directly...');
    
    const testEnquiry = {
      userId: '43963086',
      title: 'Test Email Webhook Debug',
      clientName: 'Debug Test',
      clientEmail: 'debug@test.com',
      clientPhone: '07123456789',
      eventDate: '2025-08-15',
      eventTime: '2:00 PM',
      eventEndTime: null,
      performanceDuration: null,
      venue: 'Test Venue',
      eventType: 'wedding',
      gigType: 'saxophone',
      estimatedValue: '£300-£400',
      status: 'new',
      notes: 'Debug test enquiry to verify system is working',
      originalEmailContent: 'Debug test email content',
      applyNowLink: null,
      responseNeeded: true,
      lastContactedAt: null,
      hasConflicts: false,
      conflictCount: 0
    };
    
    const createdEnquiry = await storage.createBooking(testEnquiry);
    console.log(`✅ Test enquiry created successfully: #${createdEnquiry.id}`);
    
    // Clean up test enquiry
    await storage.deleteBooking(createdEnquiry.id, '43963086');
    console.log('🧹 Test enquiry cleaned up');
    
    console.log('\n📋 DEBUG SUMMARY:');
    console.log('✅ Database connection working');
    console.log('✅ Storage layer working');
    console.log('✅ Enquiry creation working');
    console.log(hasOpenAIKey ? '✅ OpenAI API key configured' : '❌ OpenAI API key missing');
    console.log('🔍 Issue likely in: Email routing or webhook handler');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugEmailWebhook().catch(console.error);