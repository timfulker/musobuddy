/**
 * Test AI parsing on the Encore email that was received
 */

import { OpenAI } from 'openai';

const apiKey = process.env.OPENAI_INSTRUMENT_MAPPING_KEY;
console.log('API Key available:', !!apiKey);

if (!apiKey) {
  console.error('❌ No API key available');
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

async function testAIParsing() {
  const subject = "Fwd: wedding enquiry";
  const body = `Kind Regards

Tim

Tim Fulker
timfulker@gmail.com
---------- Forwarded message ----------
From: Tim Fulker <timfulker@gmail.com>
Date: 16 Jul 2025 at 18:32 +0100
To: leads@mg.musobuddy.com
Subject: wedding enquiry

> Hi Tim, are you available for a wedding on November 24 in Swindon?
>
> Kind Regards
>
> Tim
>
> Tim Fulker
> timfulker@gmail.com`;
  
  console.log('🧪 Testing AI parsing...');
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

Extract:
- eventDate: The actual event/performance date in YYYY-MM-DD format (e.g., "August 19" = "2025-08-19")
- eventTime: Start time if mentioned (null if not specified)
- venue: Location/venue name including city/area (e.g., "Cornwall")
- eventType: wedding, birthday, corporate, party, celebration, private event, etc.
- gigType: sax, saxophone, jazz, piano, guitar, dj, band, violin, drums, etc.
- clientPhone: UK phone number if mentioned
- estimatedValue: Budget/price range if mentioned (e.g., "£260-£450", "£300", "budget of £500")
- applyNowLink: URL if this is a booking platform email (null for direct enquiries)

Return valid JSON only:`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: `You are parsing emails in July 2025. Extract structured information from musician booking enquiries. Return JSON only.` 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.1
    });

    const aiResult = JSON.parse(response.choices[0].message.content || '{}');
    console.log('✅ AI parsing successful!');
    console.log('🤖 Result:', JSON.stringify(aiResult, null, 2));
    
    return aiResult;
  } catch (error) {
    console.error('❌ AI parsing failed:', error.message);
    console.error('❌ Full error:', error);
    return null;
  }
}

testAIParsing().then(result => {
  if (result) {
    console.log('✅ Test completed successfully');
    console.log('📊 Final result:', result);
  } else {
    console.log('❌ Test failed');
  }
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});