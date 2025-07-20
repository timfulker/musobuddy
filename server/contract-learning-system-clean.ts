import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

interface ManualExtraction {
  id: number;
  importedContractId: number;
  extractedData: {
    clientName?: string;
    clientEmail?: string;
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
  };
  extractionTimeSeconds: number;
  userId: string;
  createdAt: string;
}

export class ContractLearningSystem {
  private anthropic: Anthropic;
  private storage: any;

  constructor(storage: any) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.storage = storage;
  }

  /**
   * Intelligent extraction that learns from previous manual extractions
   */
  async intelligentExtraction(
    contractText: string,
    userId: string
  ): Promise<{ success: boolean; data: any; confidence: number; message: string }> {
    try {
      console.log('🧠 Starting intelligent contract extraction...');
      
      // Get previous manual extractions as training examples
      const trainingExamples = await this.getTrainingExamples(userId, 5);
      console.log(`📚 Found ${trainingExamples.length} training examples`);
      
      // Calculate base confidence based on training data available
      let baseConfidence = 50; // Starting confidence
      if (trainingExamples.length >= 5) baseConfidence = 85;
      else if (trainingExamples.length >= 3) baseConfidence = 75;
      else if (trainingExamples.length >= 1) baseConfidence = 65;
      
      // Create enhanced prompts using training data
      const systemPrompt = this.createTrainingPrompt(trainingExamples);
      const extractionPrompt = `Extract the following information from this Musicians Union contract:

${contractText}

Return ONLY a valid JSON object with these fields (use null for missing values):
{
  "clientName": "string",
  "clientEmail": "string", 
  "clientAddress": "string",
  "venue": "string",
  "venueAddress": "string",
  "eventDate": "YYYY-MM-DD",
  "eventTime": "HH:MM",
  "eventEndTime": "HH:MM",
  "fee": "number (GBP amount without symbols)",
  "equipmentRequirements": "string",
  "specialRequirements": "string",
  "eventType": "string"
}`;

      const response = await this.anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        system: systemPrompt,
        max_tokens: 1024,
        messages: [
          { role: 'user', content: extractionPrompt }
        ]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Parse the AI response
      let extractedData;
      try {
        extractedData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', responseText);
        return {
          success: false,
          data: {},
          confidence: 0,
          message: 'AI response was not valid JSON'
        };
      }

      // Validate and clean extracted data
      const validatedData = this.validateExtractedData(extractedData);
      const actualConfidence = this.calculateConfidence(validatedData, baseConfidence);
      
      console.log('✅ Intelligent extraction completed:', {
        fieldsExtracted: Object.keys(validatedData).filter(k => validatedData[k]).length,
        confidence: actualConfidence
      });

      return {
        success: true,
        data: validatedData,
        confidence: actualConfidence,
        message: `Extracted ${Object.keys(validatedData).filter(k => validatedData[k]).length} fields using AI trained on ${trainingExamples.length} previous extractions`
      };
      
    } catch (error) {
      console.error('❌ Error in intelligent extraction:', error);
      return {
        success: false,
        data: {},
        confidence: 0,
        message: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Apply extracted data to booking, preserving existing data
   */
  async applyToBooking(bookingId: number, extractedData: any, userId: string): Promise<{ fieldsUpdated: string[] }> {
    try {
      // Get current booking data
      const booking = await this.storage.getBooking(bookingId, userId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const fieldsUpdated: string[] = [];
      const updates: any = {};

      // Only update empty fields to preserve existing data
      const fieldMappings = {
        clientName: 'clientName',
        clientEmail: 'clientEmail',
        clientAddress: 'clientAddress',
        venue: 'venue',
        venueAddress: 'venueAddress',
        eventDate: 'eventDate',
        eventTime: 'eventTime',
        eventEndTime: 'eventEndTime',
        fee: 'fee',
        equipmentRequirements: 'equipmentRequirements',
        specialRequirements: 'specialRequirements'
      };

      Object.entries(fieldMappings).forEach(([extractedField, bookingField]) => {
        if (extractedData[extractedField] && !booking[bookingField]) {
          updates[bookingField] = extractedData[extractedField];
          fieldsUpdated.push(bookingField);
        }
      });

      if (Object.keys(updates).length > 0) {
        await this.storage.updateBooking(bookingId, updates, userId);
        console.log(`✅ Updated ${fieldsUpdated.length} empty fields in booking`);
      } else {
        console.log('ℹ️ No empty fields to update - existing data preserved');
      }

      return { fieldsUpdated };
    } catch (error) {
      console.error('❌ Error applying data to booking:', error);
      return { fieldsUpdated: [] };
    }
  }

  /**
   * Get training examples from previous manual extractions
   */
  private async getTrainingExamples(userId: string, limit: number = 5): Promise<ManualExtraction[]> {
    try {
      const examples = await this.storage.getManualExtractions?.(userId, limit);
      return examples || [];
    } catch (error) {
      console.log('No training examples available yet');
      return [];
    }
  }

  /**
   * Create enhanced prompts using training data
   */
  private createTrainingPrompt(trainingExamples: ManualExtraction[]): string {
    if (trainingExamples.length === 0) {
      return `You are an expert at extracting information from Musicians Union contracts and similar music performance contracts.

Key rules:
1. Extract the CLIENT/HIRER information, NOT the musician/performer details
2. Tim Fulker is the MUSICIAN - do not extract his details as the client
3. Look for the person or organization HIRING the musician
4. Event details should be from the contract's performance information
5. Fee should be the total performance fee in GBP (remove currency symbols)`;
    }

    const examples = trainingExamples.slice(0, 3).map((example, index) => {
      const data = example.extractedData;
      return `Example ${index + 1}:
Client: ${data.clientName || 'Not specified'}
Email: ${data.clientEmail || 'Not specified'} 
Venue: ${data.venue || 'Not specified'}
Date: ${data.eventDate || 'Not specified'}
Fee: ${data.fee || 'Not specified'}
Event Type: ${data.eventType || 'Not specified'}`;
    }).join('\n\n');

    return `You are an expert at extracting information from Musicians Union contracts and similar music performance contracts.

Based on ${trainingExamples.length} previous manual extractions, here are examples of correct data extraction:

${examples}

Key rules learned from training data:
1. Extract the CLIENT/HIRER information, NOT the musician/performer details
2. Tim Fulker is the MUSICIAN - do not extract his details as the client
3. Look for the person or organization HIRING the musician
4. Event details should be from the contract's performance information
5. Fee should be the total performance fee in GBP (remove currency symbols)
6. Follow the pattern from the examples above for consistency`;
  }

  /**
   * Validate and clean extracted data
   */
  private validateExtractedData(data: any): any {
    const validated: any = {};
    
    // String fields
    const stringFields = ['clientName', 'clientEmail', 'clientAddress', 'venue', 'venueAddress', 'eventType', 'equipmentRequirements', 'specialRequirements'];
    stringFields.forEach(field => {
      if (data[field] && typeof data[field] === 'string' && data[field].trim().length > 0) {
        validated[field] = data[field].trim();
      }
    });

    // Date fields
    if (data.eventDate && typeof data.eventDate === 'string') {
      validated.eventDate = data.eventDate.trim();
    }

    // Time fields
    if (data.eventTime && typeof data.eventTime === 'string') {
      validated.eventTime = data.eventTime.trim();
    }
    if (data.eventEndTime && typeof data.eventEndTime === 'string') {
      validated.eventEndTime = data.eventEndTime.trim();
    }

    // Fee field (convert to number)
    if (data.fee) {
      const feeNum = parseFloat(String(data.fee).replace(/[^\d.]/g, ''));
      if (!isNaN(feeNum) && feeNum > 0) {
        validated.fee = feeNum;
      }
    }

    return validated;
  }

  /**
   * Calculate confidence based on extracted data quality
   */
  private calculateConfidence(data: any, baseConfidence: number): number {
    const requiredFields = ['clientName', 'venue', 'eventDate'];
    const optionalFields = ['clientEmail', 'fee', 'eventTime', 'eventType'];
    
    let confidence = baseConfidence;
    
    // Check required fields
    const missingRequired = requiredFields.filter(field => !data[field]);
    confidence -= missingRequired.length * 15;
    
    // Bonus for optional fields
    const presentOptional = optionalFields.filter(field => data[field]);
    confidence += presentOptional.length * 5;
    
    // Ensure confidence is within bounds
    return Math.max(10, Math.min(95, Math.round(confidence)));
  }
}