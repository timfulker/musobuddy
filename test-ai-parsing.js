/**
 * Test AI parsing on the Encore email that was received
 */

import { OpenAI } from 'openai';

const emailParsingAI = new OpenAI({ 
  apiKey: process.env.OPENAI_EMAIL_PARSING_KEY 
});

async function testAIParsing() {
  const subject = "Fwd: Job Alert: £260-450, Saxophonist needed for wedding drinks reception in Gwennap [E2YY8]";
  const body = `
Kind Regards

Tim

Tim Fulker
timfulker@gmail.com
---------- Forwarded message ----------
From: Encore Musicians <notification@encoremusicians.com>
Date: 16 Jul 2025 at 16:59 +0100
To: timfulkermusic@gmail.com
Subject: Job Alert: £260-450, Saxophonist needed for wedding drinks reception in Gwennap [E2YY8]

> Alert settings
> Friday
> 05
> Sep 2025
> £260 - £450
> Saxophonist needed for wedding drinks reception in Gwennap
> Wedding 3:00pm - 5:00pm
> Gwennap, Redruth, Cornwall (TR16)
> Hi Tim,
> Read the job description below:
> We're looking for a Saxophonist for our wedding reception. We want the vibe to be upbeat, and we like pop music.
> Booking timeline: ASAP! I need to book as soon as possible.
> Apply now
> View job
> You received this job alert because it matches your profile's settings:
> Matching genre: Pop Edit
> Above your minimum fee: £1 Edit
> Within your location radius: 281 miles of Howitt Rd, Belsize Park, London NW3, UK Edit
> Not the right job for you?
> Update your settings or turn off job alerts.
> Applying for jobs is faster with our app!
> Got a question?
> Hi! I'm George, and I'm here to help.
> Visit our help centre
> help@encoremusicians.com
> Copyright © 2025 1015 Ltd. All rights reserved.
> Sent from our secret hideout at 275 New North Road, London N1 7AA.Visit encoremusicians.com Unsubscribe
`;

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

CRITICAL INSTRUCTIONS FOR ENCORE EMAILS:
1. ENCORE DATE PARSING: Look for date patterns like "Friday 05 Sep 2025" or "Friday\\n05\\nSep 2025" - convert to YYYY-MM-DD format
2. ENCORE VENUE EXTRACTION: Look for location patterns like "Gwennap, Redruth, Cornwall (TR16)" - extract the full location
3. ENCORE BUDGET: Look for "£260 - £450" or "£260-£450" format in the email
4. ENCORE TIME: Look for time patterns like "3:00pm - 5:00pm" or "Wedding 3:00pm - 5:00pm"
5. ENCORE GIG TYPE: Look for instrument requirements like "Saxophonist needed" or "Saxophonist"
6. ENCORE EVENT TYPE: Look for event types like "wedding drinks reception" or "Wedding"
7. ENCORE APPLY NOW: Extract job ID from subject [E2YY8] and create URL: https://encoremusicians.com/jobs/E2YY8?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow

Extract:
- eventDate: The actual event/performance date in YYYY-MM-DD format (e.g., "Friday 05 Sep 2025" = "2025-09-05")
- eventTime: Start time if mentioned (e.g., "3:00pm - 5:00pm")
- venue: Location/venue name including city/area (e.g., "Gwennap, Redruth, Cornwall (TR16)")
- eventType: wedding, birthday, corporate, party, celebration, private event, etc.
- gigType: sax, saxophone, jazz, piano, guitar, dj, band, violin, drums, etc.
- clientPhone: UK phone number if mentioned
- estimatedValue: Budget/price range if mentioned (e.g., "£260-£450", "£300", "budget of £500")
- applyNowLink: For Encore emails, extract job ID from subject and create URL as specified above

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
      max_tokens: 300,
      temperature: 0.1
    });

    const aiResult = JSON.parse(response.choices[0].message.content || '{}');
    console.log('🤖 AI parsing result:', JSON.stringify(aiResult, null, 2));
    
    return aiResult;
  } catch (error) {
    console.error('🤖 AI parsing failed:', error);
    return null;
  }
}

testAIParsing().then(result => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});