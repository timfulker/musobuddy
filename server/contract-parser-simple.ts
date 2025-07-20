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
    console.log('🔍 Starting contract parsing...');
    console.log('📄 Contract text length:', contractText.length);

    if (!contractText || contractText.trim().length < 50) {
      throw new Error('Contract text is too short or empty');
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are an expert at extracting client information from performance contracts, especially Musicians Union contracts.

CRITICAL RULES:
1. Extract the CLIENT/HIRER details, NOT the musician/performer details
2. Tim Fulker is the MUSICIAN/PERFORMER - do NOT extract his details as the client
3. Look for the person or organization HIRING the musician
4. The client is who is PAYING for the performance
5. Event details should be from the contract's performance information
6. Fee should be the total performance fee in GBP (remove currency symbols and convert to number)
7. If you cannot find specific information, use null
8. Be very careful to distinguish between client and performer information

Return ONLY valid JSON with no additional text or formatting.`,
      messages: [{
        role: 'user',
        content: `Extract the following information from this performance contract:

${contractText}

Return exactly this JSON structure with no additional text:
{
  "clientName": "name of client/hirer (not the musician)",
  "clientEmail": "client email if found or null",
  "clientPhone": "client phone if found or null",
  "clientAddress": "client address if found or null",
  "venue": "event venue name or null",
  "venueAddress": "venue address if found or null",
  "eventDate": "YYYY-MM-DD format or null",
  "eventTime": "HH:MM format start time or null",
  "eventEndTime": "HH:MM format end time or null",
  "fee": 150.00,
  "equipmentRequirements": "equipment details or null",
  "specialRequirements": "special requirements or null",
  "eventType": "type of event or null",
  "performanceDuration": "duration in minutes as string or null"
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

    // Clean and validate the data
    const cleanData: ContractData = {};

    // Clean string fields
    const stringFields = ['clientName', 'clientEmail', 'clientPhone', 'clientAddress', 'venue', 'venueAddress', 'eventType', 'equipmentRequirements', 'specialRequirements', 'performanceDuration'];
    stringFields.forEach(field => {
      if (extractedData[field] && typeof extractedData[field] === 'string') {
        const cleaned = extractedData[field].trim();
        if (cleaned && cleaned !== 'null' && cleaned !== 'N/A' && cleaned !== 'Not specified') {
          cleanData[field] = cleaned;
        }
      }
    });

    // Clean date field
    if (extractedData.eventDate && typeof extractedData.eventDate === 'string') {
      const dateStr = extractedData.eventDate.trim();
      if (dateStr && dateStr !== 'null' && dateStr !== 'N/A') {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(dateStr)) {
          cleanData.eventDate = dateStr;
        } else {
          console.warn('⚠️ Invalid date format:', dateStr);
        }
      }
    }

    // Clean time fields
    ['eventTime', 'eventEndTime'].forEach(field => {
      if (extractedData[field] && typeof extractedData[field] === 'string') {
        const timeStr = extractedData[field].trim();
        if (timeStr && timeStr !== 'null' && timeStr !== 'N/A') {
          // Validate time format
          const timeRegex = /^\d{1,2}:\d{2}$/;
          if (timeRegex.test(timeStr)) {
            cleanData[field] = timeStr;
          } else {
            console.warn('⚠️ Invalid time format:', timeStr);
          }
        }
      }
    });

    // Clean fee field
    if (extractedData.fee !== undefined && extractedData.fee !== null) {
      let feeValue: number;
      if (typeof extractedData.fee === 'number') {
        feeValue = extractedData.fee;
      } else if (typeof extractedData.fee === 'string') {
        // Remove currency symbols and parse
        const feeStr = extractedData.fee.replace(/[£$€,\s]/g, '');
        feeValue = parseFloat(feeStr);
      } else {
        feeValue = NaN;
      }

      if (!isNaN(feeValue) && feeValue > 0) {
        cleanData.fee = feeValue;
      }
    }

    console.log('✅ Contract parsing completed successfully');
    console.log('📊 Extracted fields:', Object.keys(cleanData).filter(k => cleanData[k]).length);
    console.log('📋 Clean data:', cleanData);

    return cleanData;

  } catch (error) {
    console.error('❌ Contract parsing failed:', error);
    throw error;
  }
}

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

    // Parse with AI
    const extractedData = await parseContractPDF(contractText);

    console.log('✅ Complete contract parsing successful');
    return extractedData;

  } catch (error) {
    console.error('❌ Complete contract parsing failed:', error);
    throw error;
  }
}