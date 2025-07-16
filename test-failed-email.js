/**
 * Test the exact email that failed to parse
 */

import { OpenAI } from 'openai';

const apiKey = process.env.OPENAI_EMAIL_PARSING_KEY;
console.log('API Key available:', !!apiKey);

if (!apiKey) {
  console.error('❌ No API key available');
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

async function testFailedEmail() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  const processedSubject = "wedding booking";
  const processedBody = `Hi Tim,
Are you available to play at our wedding next February 8th in Southampton

Kind Regards

Tim

Tim Fulker
timfulker@gmail.com
`;

  const prompt = `Parse this email enquiry for a musician/performer and extract structured information. Return JSON only.

Email Subject: "${processedSubject}"
Email Body: "${processedBody}"

CURRENT CONTEXT:
- Today's date: ${new Date().toISOString().split('T')[0]}
- Current year: ${currentYear}
- Current month: ${currentDate.getMonth() + 1}
- Current day: ${currentDate.getDate()}

GENERAL INSTRUCTIONS:
- Find the ACTUAL EVENT DATE - look for "Sunday 24 Aug 2025", "Aug 24", "24 Aug 2025" etc. NOT email send dates like "13 Jul 2025 at 15:42"
- RELATIVE DATE PARSING: For relative dates like "next Saturday", "next Friday", calculate from today's date (${new Date().toISOString().split('T')[0]}) within the current year (${currentYear}) unless explicitly stated otherwise. For "next February" or "next [month]", if the month has already passed this year, use the next year (e.g., "next February" in July 2025 means February 2026).
- Find the ACTUAL VENUE - look for location names like "Bognor Regis", "Brighton", city names, NOT email addresses or timestamps
- Find BUDGET/PRICE information - look for "£260-£450", "£300", price ranges in the email content

Extract:
- eventDate: The actual event/performance date in YYYY-MM-DD format (e.g., "Sunday 24 Aug 2025" = "2025-08-24", "14th July 2026" = "2026-07-14")
- eventTime: Start time if mentioned (e.g., "1:00pm - 3:00pm", "7:30pm")
- venue: Location/venue name including city/area (e.g., "Bognor Regis", "Brighton Hotel", "London venue")
- eventType: wedding, birthday, corporate, party, celebration, private event, etc.
- gigType: sax, saxophone, jazz, piano, guitar, dj, band, violin, drums, etc.
- clientPhone: UK phone number if mentioned
- estimatedValue: Budget/price range if mentioned (e.g., "£260-£450", "£300", "budget of £500")
- applyNowLink: Return null if not an Encore email

Return valid JSON only:`;

  try {
    console.log('🧪 Testing failed email parsing...');
    console.log('📧 Subject:', processedSubject);
    console.log('📧 Body:', processedBody);
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: `You are parsing emails in July 2025. When someone says "next year", they mean 2026. Current year is ${currentYear}. Next year is ${currentYear + 1}. For relative dates like "next Saturday", "next Friday", calculate from today's date (${new Date().toISOString().split('T')[0]}) within the current year (${currentYear}) unless explicitly stated otherwise. If the email says "next Saturday" and today is July 13, 2025, "next Saturday" would be July 19, 2025 (not 2026).` 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.1
    });

    console.log('✅ AI parsing successful!');
    console.log('🤖 Raw response:', response.choices[0].message.content);
    
    const aiResult = JSON.parse(response.choices[0].message.content || '{}');
    console.log('🤖 Parsed result:', aiResult);
    
  } catch (error) {
    console.error('❌ AI parsing failed:', error);
  }
}

testFailedEmail();
