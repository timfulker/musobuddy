import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function parseContractPDF(contractText: string): Promise<any> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are an expert at extracting client information from Musicians Union contracts. Extract ONLY the CLIENT/HIRER details, NOT the musician details. Tim Fulker is the MUSICIAN - ignore his details.`,
      messages: [{
        role: 'user',
        content: `Extract the following information from this contract and return ONLY valid JSON:

${contractText}

Return exactly this JSON structure:
{
  "clientName": "client or hirer name",
  "clientEmail": "client email if found",
  "clientPhone": "client phone if found", 
  "venue": "event venue name",
  "venueAddress": "venue address if found",
  "eventDate": "YYYY-MM-DD format",
  "eventTime": "HH:MM format start time",
  "eventEndTime": "HH:MM format end time",
  "fee": 150.00,
  "eventType": "type of event"
}`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response from AI');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    // Clean and validate the data
    const cleanData: any = {};
    
    if (extractedData.clientName && typeof extractedData.clientName === 'string') {
      cleanData.clientName = extractedData.clientName.trim();
    }
    if (extractedData.clientEmail && typeof extractedData.clientEmail === 'string') {
      cleanData.clientEmail = extractedData.clientEmail.trim();
    }
    if (extractedData.clientPhone && typeof extractedData.clientPhone === 'string') {
      cleanData.clientPhone = extractedData.clientPhone.trim();
    }
    if (extractedData.venue && typeof extractedData.venue === 'string') {
      cleanData.venue = extractedData.venue.trim();
    }
    if (extractedData.venueAddress && typeof extractedData.venueAddress === 'string') {
      cleanData.venueAddress = extractedData.venueAddress.trim();
    }
    if (extractedData.eventDate && typeof extractedData.eventDate === 'string') {
      cleanData.eventDate = extractedData.eventDate.trim();
    }
    if (extractedData.eventTime && typeof extractedData.eventTime === 'string') {
      cleanData.eventTime = extractedData.eventTime.trim();
    }
    if (extractedData.eventEndTime && typeof extractedData.eventEndTime === 'string') {
      cleanData.eventEndTime = extractedData.eventEndTime.trim();
    }
    if (extractedData.fee && !isNaN(parseFloat(extractedData.fee))) {
      cleanData.fee = parseFloat(extractedData.fee);
    }
    if (extractedData.eventType && typeof extractedData.eventType === 'string') {
      cleanData.eventType = extractedData.eventType.trim();
    }

    console.log('✅ Successfully extracted contract data:', cleanData);
    return cleanData;
    
  } catch (error) {
    console.error('❌ Contract parsing failed:', error);
    throw error;
  }
}