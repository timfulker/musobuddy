/**
 * Update the existing booking with AI parsing
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { bookings } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import { OpenAI } from 'openai';

// Database connection
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_EMAIL_PARSING_KEY
});

async function updateBookingWithAI() {
  try {
    // Get the latest booking (the simple wedding enquiry)
    const latestBooking = await db
      .select()
      .from(bookings)
      .orderBy(bookings.createdAt)
      .limit(1);

    if (!latestBooking.length) {
      console.log('No bookings found');
      return;
    }

    const booking = latestBooking[0];
    console.log('🔍 Processing booking:', booking.id, booking.title);

    // Extract subject and body from the booking
    const subject = booking.title || '';
    const body = booking.notes || '';

    console.log('📧 Subject:', subject);
    console.log('📧 Body:', body);

    // Use AI to parse the email
    const prompt = `Parse this email enquiry for a musician/performer and extract structured information. Return JSON only.

Email Subject: "${subject}"
Email Body: "${body}"

CURRENT CONTEXT:
- Today's date: ${new Date().toISOString().split('T')[0]}
- Current year: 2025
- Current month: 7
- Current day: 16

INSTRUCTIONS:
1. Extract event date: "August 19" should be interpreted as "August 19, 2025" (current year) = "2025-08-19"
2. Extract venue: "Cornwall" is the location
3. Extract event type: "wedding" is mentioned
4. Extract gig type: Context suggests musician/performer

Extract:
- eventDate: The actual event/performance date in YYYY-MM-DD format
- eventTime: Start time if mentioned (null if not specified)
- venue: Location/venue name
- eventType: Type of event
- gigType: Instrument or performance type (null if not specified)
- clientPhone: Phone number if mentioned (null if not found)
- estimatedValue: Budget/price if mentioned (null if not found)
- applyNowLink: URL if this is a booking platform email (null for direct enquiries)

Return valid JSON only:`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: "You are parsing emails in July 2025. Extract structured information from musician booking enquiries. Return JSON only." 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.1
    });

    const aiResult = JSON.parse(response.choices[0].message.content || '{}');
    console.log('✅ AI parsing result:', aiResult);

    // Update the booking with AI-parsed data
    await db
      .update(bookings)
      .set({
        eventDate: aiResult.eventDate || null,
        eventTime: aiResult.eventTime || null,
        venue: aiResult.venue || null,
        eventType: aiResult.eventType || null,
        gigType: aiResult.gigType || null,
        clientPhone: aiResult.clientPhone || null,
        estimatedValue: aiResult.estimatedValue || null,
        applyNowLink: aiResult.applyNowLink || null,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, booking.id));

    console.log('✅ Booking updated with AI-parsed data');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateBookingWithAI().then(() => {
  console.log('✅ Update completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Update failed:', error);
  process.exit(1);
});