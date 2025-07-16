/**
 * Test AI parsing on the simple wedding email
 */

import { OpenAI } from 'openai';

// Use the actual API key from environment
const apiKey = process.env.OPENAI_EMAIL_PARSING_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_EMAIL_PARSING_KEY not found');
  process.exit(1);
}

const emailParsingAI = new OpenAI({ apiKey });

async function testSimpleEmail() {
  const subject = "wedding enquiry";
  const body = `Hi Tim, are you available to play a wedding on August 19 in Cornwall?

Kind Regards

Tim

Tim Fulker
timfulker@gmail.com`;

  console.log('🧪 Testing AI parsing with simple email...');
  console.log('📧 Subject:', subject);
  console.log('📧 Body:', body);

  try {
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    
    const prompt = `Parse this email enquiry for a musician/performer and extract structured information. Return JSON only.

Email Subject: "${subject}"
Email Body: "${body}"

CURRENT CONTEXT:
- Today's date: ${new Date().toISOString().split('T')[0]}
- Current year: ${currentYear}
- Current month: ${currentDate.getMonth() + 1}
- Current day: ${currentDate.getDate()}

INSTRUCTIONS:
1. Extract event date: "August 19" should be interpreted as "August 19, 2025" (current year) = "2025-08-19"
2. Extract venue: "Cornwall" is the location
3. Extract event type: "wedding" is mentioned
4. Extract gig type: Context suggests musician/performer (not specific instrument)

Extract:
- eventDate: The actual event/performance date in YYYY-MM-DD format (e.g., "August 19" = "2025-08-19")
- eventTime: Start time if mentioned (null if not specified)
- venue: Location/venue name (e.g., "Cornwall")
- eventType: Type of event (e.g., "wedding")
- gigType: Instrument or performance type (null if not specified)
- clientPhone: Phone number if mentioned (null if not found)
- estimatedValue: Budget/price if mentioned (null if not found)
- applyNowLink: URL if this is a booking platform email (null for direct enquiries)

Return valid JSON only:`;

    const response = await emailParsingAI.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: `You are parsing emails in July 2025. Extract structured information from musician booking enquiries. Return JSON only.` 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.1
    });

    const aiResult = JSON.parse(response.choices[0].message.content || '{}');
    console.log('✅ AI parsing successful!');
    console.log('🤖 Result:', JSON.stringify(aiResult, null, 2));
    
    return aiResult;
  } catch (error) {
    console.error('❌ AI parsing failed:', error.message);
    return null;
  }
}

testSimpleEmail().then(result => {
  if (result) {
    console.log('✅ Test completed successfully');
  } else {
    console.log('❌ Test failed');
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});