import { parseContractFromBuffer, extractPDFText, parseContractPDF } from './contract-parser-simple';

interface ContractParsingResult {
  success: boolean;
  data: any;
  confidence: number;
  message: string;
  fieldsExtracted: number;
  textLength?: number;
  error?: string;
}

interface BookingUpdateResult {
  updated: boolean;
  fieldsUpdated: string[];
  fieldsUpdatedCount: number;
}

export class ContractService {
  private storage: any;

  constructor(storage: any) {
    this.storage = storage;
  }

  /**
   * Parse contract from PDF buffer
   */
  async parseContract(
    pdfBuffer: Buffer, 
    userId: string
  ): Promise<ContractParsingResult> {
    try {
      console.log('🔄 Starting contract parsing service...');
      console.log('👤 User ID:', userId);
      console.log('📊 Buffer size:', pdfBuffer.length);

      // Extract text from PDF
      let contractText: string;
      try {
        contractText = await extractPDFText(pdfBuffer);
        console.log('📄 Text extracted successfully, length:', contractText.length);
      } catch (extractError) {
        console.error('❌ PDF text extraction failed:', extractError);
        return {
          success: false,
          data: {},
          confidence: 0,
          fieldsExtracted: 0,
          message: 'Failed to extract text from PDF',
          error: 'PDF_EXTRACTION_FAILED'
        };
      }

      if (!contractText || contractText.trim().length < 50) {
        return {
          success: false,
          data: {},
          confidence: 0,
          fieldsExtracted: 0,
          textLength: contractText.length,
          message: 'PDF contains insufficient text content',
          error: 'INSUFFICIENT_TEXT'
        };
      }

      let result: ContractParsingResult;

      // Use contract parser
      try {
        console.log('🔧 Using contract parser...');
        const parseResult = await parseContractPDF(contractText);
        const fieldsExtracted = Object.keys(parseResult).filter(k => (parseResult as any)[k] !== undefined && (parseResult as any)[k] !== null).length;
        const confidence = Math.min(95, Math.max(10, 30 + (fieldsExtracted * 8)));
        
        result = {
          success: true,
          data: parseResult,
          confidence,
          fieldsExtracted,
          textLength: contractText.length,
          message: `Extracted ${fieldsExtracted} fields from contract`
        };
        
        console.log('✅ Parser extraction successful');
      } catch (parseError) {
        console.error('❌ Parser failed:', parseError);
        return {
          success: false,
          data: {},
          confidence: 0,
          fieldsExtracted: 0,
          textLength: contractText.length,
          message: 'AI parsing failed',
          error: 'AI_PARSING_FAILED'
        };
      }

      console.log('✅ Contract parsing completed successfully');
      console.log('📊 Final result:', {
        success: result.success,
        fieldsExtracted: result.fieldsExtracted,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      console.error('❌ Contract service error:', error);
      return {
        success: false,
        data: {},
        confidence: 0,
        fieldsExtracted: 0,
        message: 'Contract parsing service failed',
        error: 'SERVICE_ERROR'
      };
    }
  }

  /**
   * Parse contract and apply to booking
   */
  async parseAndApplyToBooking(
    pdfBuffer: Buffer,
    userId: string,
    bookingId: number
  ): Promise<{ parsing: ContractParsingResult; booking: BookingUpdateResult }> {
    try {
      console.log('🔄 Starting parse and apply to booking...');
      console.log('📋 Booking ID:', bookingId);

      // Parse the contract
      const parsingResult = await this.parseContract(pdfBuffer, userId);
      
      let bookingResult: BookingUpdateResult = {
        updated: false,
        fieldsUpdated: [],
        fieldsUpdatedCount: 0
      };

      // Apply to booking if parsing was successful
      if (parsingResult.success && parsingResult.data && Object.keys(parsingResult.data).length > 0) {
        try {
          console.log('📝 Applying extracted data to booking...');
          
          const booking = await this.storage.getBooking(bookingId, userId);
          if (booking) {
            const updates: any = {};
            const fieldsUpdated: string[] = [];
            
            const fieldMappings = {
              clientName: 'clientName',
              clientEmail: 'clientEmail',
              clientPhone: 'clientPhone',
              clientAddress: 'clientAddress',
              venue: 'venue',
              venueAddress: 'venueAddress',
              eventDate: 'eventDate',
              eventTime: 'eventTime',
              eventEndTime: 'eventEndTime',
              fee: 'fee',
              quotedAmount: 'fee', // Map quotedAmount to fee field
              eventType: 'eventType',
              equipmentRequirements: 'equipmentRequirements',
              specialRequirements: 'specialRequirements',
              performanceDuration: 'performanceDuration'
            };

            Object.entries(fieldMappings).forEach(([extractedField, bookingField]) => {
              let extractedValue = (parsingResult.data as any)[extractedField];
              const bookingValue = (booking as any)[bookingField];
              
              // Handle special time formats - convert "TBC" to empty string
              if ((bookingField === 'eventTime' || bookingField === 'eventEndTime') && extractedValue === 'TBC') {
                extractedValue = '';
              }
              
              // Check if field is empty or has default/placeholder values
              const isEmpty = !bookingValue || bookingValue === '';
              const isDefaultTime = (bookingField === 'eventTime' || bookingField === 'eventEndTime') && 
                                    (bookingValue === '00:00' || bookingValue === '0:00');
              
              if (extractedValue !== undefined && extractedValue !== null && extractedValue !== '' && (isEmpty || isDefaultTime)) {
                updates[bookingField] = extractedValue;
                fieldsUpdated.push(bookingField);
              }
            });

            // Handle date conversion
            if (updates.eventDate && typeof updates.eventDate === 'string') {
              updates.eventDate = new Date(updates.eventDate);
            }

            if (Object.keys(updates).length > 0) {
              await this.storage.updateBooking(bookingId, updates, userId);
              bookingResult = {
                updated: true,
                fieldsUpdated,
                fieldsUpdatedCount: fieldsUpdated.length
              };
              console.log(`✅ Updated ${fieldsUpdated.length} fields in booking`);
            }
          }
        } catch (applyError) {
          console.error('❌ Failed to apply data to booking:', applyError);
          // Don't fail the overall operation if booking update fails
        }
      }

      console.log('✅ Parse and apply completed');
      console.log('📊 Booking update result:', bookingResult);

      return {
        parsing: parsingResult,
        booking: bookingResult
      };

    } catch (error) {
      console.error('❌ Parse and apply service error:', error);
      return {
        parsing: {
          success: false,
          data: {},
          confidence: 0,
          fieldsExtracted: 0,
          message: 'Service error occurred',
          error: 'SERVICE_ERROR'
        },
        booking: {
          updated: false,
          fieldsUpdated: [],
          fieldsUpdatedCount: 0
        }
      };
    }
  }

  /**
   * Test contract parsing (for debugging)
   */
  async testParsing(pdfBuffer: Buffer): Promise<{
    textExtraction: { success: boolean; length: number; preview: string; error?: string };
    aiParsing: { success: boolean; data: any; error?: string };
  }> {
    const result = {
      textExtraction: { success: false, length: 0, preview: '', error: '' },
      aiParsing: { success: false, data: {}, error: '' }
    };

    // Test text extraction
    try {
      const text = await extractPDFText(pdfBuffer);
      result.textExtraction = {
        success: true,
        length: text.length,
        preview: text.substring(0, 500),
        error: ''
      };
    } catch (extractError) {
      result.textExtraction.error = extractError instanceof Error ? extractError.message : 'Unknown error';
    }

    // Test AI parsing if text extraction succeeded
    if (result.textExtraction.success) {
      try {
        const contractText = await extractPDFText(pdfBuffer);
        const data = await parseContractPDF(contractText);
        result.aiParsing = {
          success: true,
          data,
          error: ''
        };
      } catch (parseError) {
        result.aiParsing.error = parseError instanceof Error ? parseError.message : 'Unknown error';
      }
    }

    return result;
  }
}

// Export a factory function to create the service
export function createContractService(storage: any): ContractService {
  return new ContractService(storage);
}