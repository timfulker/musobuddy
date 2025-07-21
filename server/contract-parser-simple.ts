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
  quotedAmount?: number;
  equipmentRequirements?: string;
  specialRequirements?: string;
  eventType?: string;
  performanceDuration?: string;
}

export async function parseContractPDF(contractText: string): Promise<ContractData> {
  try {
    console.log('🔍 Starting Musicians Union optimized contract parsing...');
    console.log('📄 Contract text length:', contractText.length);

    if (!contractText || contractText.trim().length < 50) {
      throw new Error('Contract text is too short or empty');
    }

    // Import the optimized Musicians Union prompt
    const { buildMusiciansUnionPrompt } = await import('./musicians-union-field-mapping');
    const promptContent = buildMusiciansUnionPrompt(contractText);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", 
      max_tokens: 1024,
      system: "You are a specialized parser for Musicians' Union L2 contracts. Focus on accurate field mapping and data extraction using the provided field mapping rules. Return only valid JSON.",
      messages: [{
        role: 'user',
        content: promptContent
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

    // Clean string fields with enhanced validation to prevent Tim's data being used as client data
    const stringFields = ['clientName', 'clientEmail', 'clientPhone', 'clientAddress', 'venue', 'venueAddress', 'eventType', 'equipmentRequirements', 'specialRequirements', 'performanceDuration'];
    stringFields.forEach(field => {
      if (extractedData[field] && typeof extractedData[field] === 'string') {
        const cleaned = extractedData[field].trim();
        if (cleaned && cleaned !== 'null' && cleaned !== 'N/A' && cleaned !== 'Not specified') {
          
          // CRITICAL: Block Tim Fulker's name from being used as client
          if (field === 'clientName') {
            const normalizedName = cleaned.toLowerCase();
            if (normalizedName.includes('tim fulker') || normalizedName.includes('fulker')) {
              console.warn('🚫 BLOCKED: Tim Fulker detected as client name:', cleaned);
              return;
            }
          }
          
          // CRITICAL: Block Tim Fulker's address from being used as client address
          if (field === 'clientAddress') {
            const normalizedAddress = cleaned.toLowerCase();
            const timAddressMarkers = [
              '59', 'gloucester', 'bh7 6ja', 'dorset', 
              'tim fulker', 'fulker', 'saxdj.co.uk'
            ];
            
            const containsTimAddress = timAddressMarkers.some(marker => 
              normalizedAddress.includes(marker.toLowerCase())
            );
            
            if (containsTimAddress) {
              console.warn('🚫 BLOCKED: Tim Fulker\'s address detected as client address:', cleaned);
              return;
            }
          }
          
          // CRITICAL: Block Tim's email from being used as client email
          if (field === 'clientEmail') {
            const normalizedEmail = cleaned.toLowerCase();
            if (normalizedEmail.includes('timfulker') || normalizedEmail.includes('saxdj')) {
              console.warn('🚫 BLOCKED: Tim Fulker\'s email detected as client email:', cleaned);
              return;
            }
          }
          
          (cleanData as any)[field] = cleaned;
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
              (cleanData as any)[field] = normalizedTime;
            }
          } else {
            console.warn('⚠️ Invalid time format:', timeStr);
          }
        }
      }
    });

    // Enhanced fee field validation - handle both fee and quotedAmount
    ['fee', 'quotedAmount'].forEach(feeField => {
      if (extractedData[feeField] !== undefined && extractedData[feeField] !== null) {
        let feeNum: number;
        if (typeof extractedData[feeField] === 'number') {
          feeNum = extractedData[feeField];
        } else if (typeof extractedData[feeField] === 'string') {
          // Remove currency symbols and parse
          const feeStr = extractedData[feeField].replace(/[£$€,\s]/g, '');
          feeNum = parseFloat(feeStr);
        } else {
          feeNum = NaN;
        }

        if (!isNaN(feeNum) && feeNum > 0) {
          (cleanData as any)[feeField] = feeNum;
        }
      }
    });

    console.log('✅ Enhanced contract parsing completed successfully');
    console.log('📊 Extracted fields:', Object.keys(cleanData).filter(k => (cleanData as any)[k]).length);
    console.log('📋 Clean data:', cleanData);

    return cleanData;

  } catch (error: any) {
    console.error('❌ Enhanced contract parsing failed:', error);
    throw error;
  }
}

// Keep existing helper functions
export async function extractPDFText(buffer: Buffer): Promise<string> {
  try {
    console.log('📄 Extracting text from PDF buffer...');

    // Using pdf2json for text extraction

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
  } catch (error: any) {
    console.error('❌ PDF text extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message || error}`);
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