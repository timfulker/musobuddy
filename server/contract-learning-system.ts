import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

interface ExtractionPattern {
  id: number;
  contractType: string;
  fieldName: string;
  extractionMethod: any;
  successRate: number;
  usageCount: number;
  isGlobal: boolean;
}

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
   * Import contract PDF without parsing - just store for manual extraction
   */
  async importContractPDF(
    file: Buffer, 
    filename: string, 
    userId: string, 
    bookingId?: number
  ): Promise<{ success: boolean; contractId: number; message: string }> {
    try {
      console.log('📄 Importing contract PDF for manual extraction...');
      
      // Upload to cloud storage
      const { uploadFileToCloudflare } = await import('./cloud-storage');
      const storageKey = `imported-contracts/${userId}/${Date.now()}-${filename}`;
      const uploadResult = await uploadFileToCloudflare(file, storageKey, 'application/pdf');
      
      if (!uploadResult.success) {
        throw new Error(`Cloud upload failed: ${uploadResult.error}`);
      }

      // Store contract metadata
      const contract = await this.storage.createImportedContract({
        userId,
        filename,
        fileSize: file.length,
        mimeType: 'application/pdf',
        cloudStorageUrl: uploadResult.url,
        cloudStorageKey: storageKey,
        contractType: 'musicians_union', // Default for now
        bookingId: bookingId || null,
        uploadedAt: new Date()
      });
      
      console.log('✅ Contract PDF imported successfully');
      return {
        success: true,
        contractId: contract.id,
        message: 'Contract imported and ready for manual extraction'
      };
      
    } catch (error) {
      console.error('❌ Error importing contract PDF:', error);
      return {
        success: false,
        contractId: 0,
        message: `Failed to import contract: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
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
        message: `Extraction failed: ${error.message}`
      };
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

  /**
   * Apply extracted data to booking
   */
  async applyToBooking(
    bookingId: number,
    extractedData: any,
    userId: string
  ): Promise<{ success: boolean; fieldsUpdated: number; message: string }> {
    try {
      // Get current booking data
      const booking = await this.storage.getBooking(bookingId);
      if (!booking || booking.userId !== userId) {
        throw new Error('Booking not found or access denied');
      }

      // Apply only to empty fields to preserve existing data
      const updates: any = {};
      let fieldsUpdated = 0;

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
        specialRequirements: 'specialRequirements',
        eventType: 'eventType'
      };

      for (const [extractedField, bookingField] of Object.entries(fieldMappings)) {
        const extractedValue = extractedData[extractedField];
        const currentValue = booking[bookingField];
        
        if (extractedValue && (!currentValue || String(currentValue).trim() === '')) {
          updates[bookingField] = extractedValue;
          fieldsUpdated++;
        }
      }

      if (fieldsUpdated > 0) {
        await this.storage.updateBooking(bookingId, updates, userId);
      }

      return {
        success: true,
        fieldsUpdated,
        message: `Applied ${fieldsUpdated} fields to booking. Existing data preserved.`
      };
      
    } catch (error) {
      console.error('❌ Error applying to booking:', error);
      return {
        success: false,
        fieldsUpdated: 0,
        message: `Failed to apply to booking: ${error.message}`
      };
    }
  }

  /**
   * Save manual extraction and learn patterns
   */
  async saveManualExtraction(
    contractId: number,
    extractedData: any,
    extractionTimeSeconds: number,
    userId: string
  ): Promise<{ success: boolean; learned: boolean; message: string }> {
    try {
      console.log('📚 Saving manual extraction and learning patterns...');
      
      // Save the manual extraction
      const extraction = await this.storage.saveContractExtraction({
        importedContractId: contractId,
        extractedData,
        extractionTimeSeconds,
        userId,
        createdAt: new Date()
      });

      // Learn patterns from this extraction for Musicians Union contracts
      const patternsLearned = await this.learnFromExtraction(contractId, extractedData, userId);
      
      console.log(`✅ Manual extraction saved, learned ${patternsLearned} patterns`);
      return {
        success: true,
        learned: patternsLearned > 0,
        message: `Extraction saved. System learned ${patternsLearned} new patterns.`
      };
      
    } catch (error) {
      console.error('❌ Error saving manual extraction:', error);
      return {
        success: false,
        learned: false,
        message: `Failed to save extraction: ${error.message}`
      };
    }
  }

  /**
   * Learn extraction patterns from manual data
   */
  private async learnFromExtraction(
    contractId: number,
    extractedData: any,
    userId: string
  ): Promise<number> {
    try {
      let patternsLearned = 0;
      
      // For each extracted field, create or update a learning pattern
      for (const [fieldName, value] of Object.entries(extractedData)) {
        if (value && value !== '') {
          await this.storage.createContractExtractionPattern({
            contractType: 'musicians_union_standard',
            fieldName,
            extractionMethod: {
              sourceContract: contractId,
              extractedValue: value,
              userId: userId,
              confidence: 'manual_training'
            },
            successRate: 1.0, // Manual extractions are 100% accurate
            usageCount: 1,
            createdBy: userId,
            isGlobal: false, // Will become global after validation
            createdAt: new Date()
          });
          patternsLearned++;
        }
      }
      
      return patternsLearned;
    } catch (error) {
      console.error('Error learning patterns:', error);
      return 0;
    }
  }

  /**
   * Use learned patterns to automatically extract from new contracts
   */
  async intelligentExtraction(
    contractText: string,
    userId: string
  ): Promise<{ success: boolean; data: any; confidence: number; message: string }> {
    try {
      console.log('🤖 Starting intelligent extraction using learned patterns...');
      
      // Get learned patterns from manual extractions
      const trainingData = await this.getTrainingExamples(userId, 10);
      
      if (trainingData.length === 0) {
        return {
          success: false,
          data: {},
          confidence: 0,
          message: 'No training data available. Please complete some manual extractions first.'
        };
      }

      // Create AI prompt using training examples
      const prompt = this.createIntelligentPrompt(trainingData);
      
      const response = await this.anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 2000,
        system: prompt,
        messages: [{
          role: 'user',
          content: `Extract information from this Musicians Union contract. Return ONLY valid JSON:

Contract text:
${contractText}`
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Invalid response type from Claude');
      }

      // Parse JSON response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      
      // Validate extraction quality
      const confidence = this.calculateConfidence(extractedData, trainingData);
      
      console.log(`✅ Intelligent extraction completed with ${confidence}% confidence`);
      return {
        success: true,
        data: extractedData,
        confidence,
        message: `Extracted using ${trainingData.length} training examples`
      };
      
    } catch (error) {
      console.error('❌ Error in intelligent extraction:', error);
      return {
        success: false,
        data: {},
        confidence: 0,
        message: `Extraction failed: ${error.message}`
      };
    }
  }

  /**
   * Get training examples from manual extractions
   */
  private async getTrainingExamples(userId: string, limit: number): Promise<ManualExtraction[]> {
    try {
      return await this.storage.getManualExtractions(userId, limit);
    } catch (error) {
      console.log('No training examples available yet');
      return [];
    }
  }

  /**
   * Create intelligent prompt using training data
   */
  private createIntelligentPrompt(trainingData: ManualExtraction[]): string {
    const examples = trainingData.slice(0, 5).map((example, index) => {
      const data = example.extractedData;
      return `Example ${index + 1} (Manual Extraction):
Client: ${data.clientName || 'Not specified'}
Email: ${data.clientEmail || 'Not specified'}
Venue: ${data.venue || 'Not specified'}
Date: ${data.eventDate || 'Not specified'}
Time: ${data.eventTime || 'Not specified'}
Fee: £${data.fee || 'Not specified'}
Event Type: ${data.eventType || 'Not specified'}`;
    }).join('\n\n');

    return `You are an expert at extracting information from Musicians Union contracts. You have been trained on ${trainingData.length} manual extractions.

LEARNED PATTERNS FROM MANUAL EXTRACTIONS:
${examples}

CRITICAL RULES (learned from training):
1. Extract CLIENT/HIRER information, NEVER the musician details
2. Tim Fulker is the MUSICIAN - do not extract his details as the client
3. Look for the person/organization HIRING the musician
4. Follow the exact pattern from the manual extraction examples above
5. Fee should be in GBP without currency symbols (number only)
6. Dates should be in YYYY-MM-DD format
7. Times should be in HH:MM format

Return JSON with these exact fields:
{
  "clientName": "string",
  "clientEmail": "string", 
  "clientAddress": "string",
  "venue": "string",
  "venueAddress": "string",
  "eventDate": "string (YYYY-MM-DD)",
  "eventTime": "string (HH:MM)",
  "eventEndTime": "string (HH:MM)",
  "fee": "number",
  "equipmentRequirements": "string",
  "specialRequirements": "string",
  "eventType": "string",
  "confidence": "number (0-100)"
}`;
  }

  /**
   * Calculate confidence based on training data similarity
   */
  private calculateConfidence(extractedData: any, trainingData: ManualExtraction[]): number {
    if (trainingData.length === 0) return 50;
    
    let confidence = 80; // Base confidence with training data
    
    // Increase confidence based on training data size
    confidence += Math.min(trainingData.length * 2, 15);
    
    // Decrease if extracted musician name instead of client
    if (extractedData.clientName && extractedData.clientName.toLowerCase().includes('tim fulker')) {
      confidence -= 40;
    }
    
    // Increase if we have complete data
    const requiredFields = ['clientName', 'venue', 'eventDate', 'fee'];
    const completedFields = requiredFields.filter(field => extractedData[field]);
    confidence += (completedFields.length / requiredFields.length) * 10;
    
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Apply extracted data to booking form
   */
  async applyToBooking(
    bookingId: number,
    extractedData: any,
    userId: string,
    preserveExisting: boolean = true
  ): Promise<{ success: boolean; fieldsUpdated: string[]; message: string }> {
    try {
      console.log('📝 Applying extracted data to booking...');
      
      const booking = await this.storage.getBooking(bookingId, userId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const fieldsUpdated: string[] = [];
      const updates: any = {};

      // Only update empty fields if preserveExisting is true
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
        specialRequirements: 'specialRequirements',
        eventType: 'eventType'
      };

      for (const [extractedField, bookingField] of Object.entries(fieldMappings)) {
        const extractedValue = extractedData[extractedField];
        const currentValue = booking[bookingField];
        
        if (extractedValue && (!preserveExisting || !currentValue)) {
          updates[bookingField] = extractedValue;
          fieldsUpdated.push(bookingField);
        }
      }

      if (fieldsUpdated.length > 0) {
        await this.storage.updateBooking(bookingId, updates, userId);
      }

      console.log(`✅ Applied ${fieldsUpdated.length} fields to booking`);
      return {
        success: true,
        fieldsUpdated,
        message: `Updated ${fieldsUpdated.length} fields: ${fieldsUpdated.join(', ')}`
      };
      
    } catch (error) {
      console.error('❌ Error applying data to booking:', error);
      return {
        success: false,
        fieldsUpdated: [],
        message: `Failed to apply data: ${error.message}`
      };
    }
  }
}