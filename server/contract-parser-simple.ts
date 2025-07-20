import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ContractData {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  venue?: string;
  venueAddress?: string;
  eventDate?: string;
  eventTime?: string;
  eventEndTime?: string;
  fee?: number;
  equipmentRequirements?: string;
  specialRequirements?: string;
  eventType?: string;
  performanceDuration?: string;
}

export async function parseContractPDF(contractText: string): Promise<ContractData> {
  try {
    console.log('🔍 Starting enhanced contract parsing...');
    console.log('📄 Contract text length:', contractText.length);

    if (!contractText || contractText.trim().length < 50) {
      throw new Error('Contract text is too short or empty');
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are an expert at extracting client information from Musicians' Union contracts and performance agreements.

CRITICAL UNDERSTANDING OF MUSICIANS' UNION CONTRACT FORMAT:
- "between [NAME]" = this is the CLIENT/HIRER
- "of [ADDRESS]" following the client name = CLIENT ADDRESS
- "and [MUSICIAN NAME]" = this is the performer (usually Tim Fulker)
- "The Hirer engages the Musician to perform...at [VENUE]" = VENUE NAME
- In signature section: "Signed by the Hirer" = CLIENT information
- In signature section: "Signed by the Musician" = PERFORMER information (ignore this)

EXTRACTION RULES:
1. CLIENT NAME: Look for "between [NAME]" or "Signed by the Hirer: [NAME]"
2. CLIENT ADDRESS: Look for "of [ADDRESS]" after the client name
3. CLIENT CONTACT: Look in "Signed by the Hirer" section for phone/email
4. VENUE: Look for "to perform...at [VENUE NAME]" or venue mentioned in engagement details
5. VENUE ADDRESS: Often the same as client address, or mentioned separately
6. NEVER extract Tim Fulker's details as the client - he is the musician

Return ONLY valid JSON with no additional text or formatting.`,
      messages: [{
        role: 'user',
        content: `Extract the client/hirer information from this Musicians' Union contract:

${contractText}

Focus on these key areas:
1. "between [CLIENT NAME]" section
2. "of [CLIENT ADDRESS]" section  
3. "The Hirer engages the Musician to perform...at [VENUE]"
4. "Signed by the Hirer" section with contact details
5. Date/time/fee table

Return exactly this JSON structure:
{
  "clientName": "name of the HIRER (not Tim Fulker)",
  "clientEmail": "hirer's email from signature section",
  "clientPhone": "hirer's phone from signature section", 
  "clientAddress": "address following 'of' after client name",
  "venue": "venue name from engagement details",
  "venueAddress": "venue address if different from client address",
  "eventDate": "YYYY-MM-DD format",
  "eventTime": "HH:MM format start time",
  "eventEndTime": "HH:MM format end time",
  "fee": 260.00,
  "equipmentRequirements": "any equipment notes",
  "specialRequirements": "any special requirements",
  "eventType": "type of performance if mentioned",
  "performanceDuration": "duration in minutes or hours"
}`
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response type from AI');
    }

    console.log('🤖 Raw AI response:', content.text);

    // Extract JSON from response - handle various formats
    let jsonText = content.text.trim();

    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');

    // Find JSON object in the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in AI response:', content.text);
      throw new Error('No JSON object found in AI response');
    }

    let extractedData: any;
    try {
      extractedData = JSON.parse(jsonMatch[0]);
      console.log('✅ Successfully parsed JSON:', extractedData);
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.error('❌ Attempted to parse:', jsonMatch[0]);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Clean and validate the data with enhanced validation
    const cleanData: ContractData = {};

    // Clean string fields with better validation
    const stringFields = ['clientName', 'clientEmail', 'clientPhone', 'clientAddress', 'venue', 'venueAddress', 'eventType', 'equipmentRequirements', 'specialRequirements', 'performanceDuration'];
    stringFields.forEach(field => {
      if (extractedData[field] && typeof extractedData[field] === 'string') {
        const cleaned = extractedData[field].trim();
        if (cleaned && cleaned !== 'null' && cleaned !== 'N/A' && cleaned !== 'Not specified' && cleaned !== 'Tim Fulker') {
          // Extra validation: don't include Tim Fulker as client
          if (field === 'clientName' && cleaned.toLowerCase().includes('tim fulker')) {
            console.warn('⚠️ Skipping Tim Fulker as client name');
            return;
          }
          cleanData[field] = cleaned;
        }
      }
    });

    // Enhanced date field validation
    if (extractedData.eventDate && typeof extractedData.eventDate === 'string') {
      const dateStr = extractedData.eventDate.trim();
      if (dateStr && dateStr !== 'null' && dateStr !== 'N/A') {
        // Handle various date formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(dateStr)) {
          cleanData.eventDate = dateStr;
        } else {
          // Try to parse other date formats
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            cleanData.eventDate = parsedDate.toISOString().split('T')[0];
          } else {
            console.warn('⚠️ Invalid date format:', dateStr);
          }
        }
      }
    }

    // Enhanced time field validation
    ['eventTime', 'eventEndTime'].forEach(field => {
      if (extractedData[field] && typeof extractedData[field] === 'string') {
        const timeStr = extractedData[field].trim();
        if (timeStr && timeStr !== 'null' && timeStr !== 'N/A') {
          // Handle both HH:MM and HHMM formats
          let normalizedTime = timeStr;
          if (/^\d{4}$/.test(timeStr)) {
            // Convert HHMM to HH:MM
            normalizedTime = timeStr.slice(0, 2) + ':' + timeStr.slice(2);
          }

          const timeRegex = /^\d{1,2}:\d{2}$/;
          if (timeRegex.test(normalizedTime)) {
            const [hours, minutes] = normalizedTime.split(':').map(Number);
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
              cleanData[field] = normalizedTime;
            }
          } else {
            console.warn('⚠️ Invalid time format:', timeStr);
          }
        }
      }
    });

    // Enhanced fee field validation
    if (extractedData.fee !== undefined && extractedData.fee !== null) {
      let feeNum: number;
      if (typeof extractedData.fee === 'number') {
        feeNum = extractedData.fee;
      } else if (typeof extractedData.fee === 'string') {
        // Remove currency symbols and parse
        const feeStr = extractedData.fee.replace(/[£$€,\s]/g, '');
        feeNum = parseFloat(feeStr);
      } else {
        feeNum = NaN;
      }

      if (!isNaN(feeNum) && feeNum > 0) {
        cleanData.fee = feeNum;
      }
    }

    console.log('✅ Enhanced contract parsing completed successfully');
    console.log('📊 Extracted fields:', Object.keys(cleanData).filter(k => cleanData[k]).length);
    console.log('📋 Clean data:', cleanData);

    return cleanData;

  } catch (error) {
    console.error('❌ Enhanced contract parsing failed:', error);
    throw error;
  }
}

// Keep existing helper functions
export async function extractPDFText(buffer: Buffer): Promise<string> {
  try {
    console.log('📄 Extracting text from PDF buffer...');

    // Try pdf-parse first (more reliable)
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);
      const text = data.text.trim();
      console.log('✅ PDF text extracted successfully using pdf-parse');
      console.log('📊 Text length:', text.length);
      return text;
    } catch (pdfParseError) {
      console.warn('⚠️ pdf-parse failed, trying pdf2json:', pdfParseError.message);
    }

    // Fallback to pdf2json
    const PDFParser = (await import("pdf2json")).default;
    const pdfParser = new PDFParser();

    const parsePromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PDF parsing timeout'));
      }, 30000); // 30 second timeout

      pdfParser.on("pdfParser_dataError", (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        clearTimeout(timeout);
        try {
          let text = '';
          if (pdfData.Pages) {
            pdfData.Pages.forEach(page => {
              if (page.Texts) {
                page.Texts.forEach(textItem => {
                  if (textItem.R) {
                    textItem.R.forEach(textRun => {
                      if (textRun.T) {
                        text += decodeURIComponent(textRun.T) + ' ';
                      }
                    });
                  }
                });
              }
            });
          }
          resolve(text.trim());
        } catch (parseError) {
          reject(parseError);
        }
      });
    });

    pdfParser.parseBuffer(buffer);
    const text = await parsePromise;

    console.log('✅ PDF text extracted successfully using pdf2json');
    console.log('📊 Text length:', text.length);

    return text;
  } catch (error) {
    console.error('❌ PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

export async function parseContractFromBuffer(buffer: Buffer): Promise<ContractData> {
  try {
    console.log('🔄 Starting complete contract parsing from buffer...');

    // Extract text from PDF
    const contractText = await extractPDFText(buffer);

    if (!contractText || contractText.length < 50) {
      throw new Error('Extracted text is too short - PDF may be empty or image-based');
    }

    // Parse with enhanced AI
    const extractedData = await parseContractPDF(contractText);

    console.log('✅ Complete enhanced contract parsing successful');
    return extractedData;

  } catch (error) {
    console.error('❌ Complete enhanced contract parsing failed:', error);
    throw error;
  }
}