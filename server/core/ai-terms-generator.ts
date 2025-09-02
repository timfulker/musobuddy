// ai-terms-generator.ts - Hybrid approach for intelligent terms generation
import Anthropic from '@anthropic-ai/sdk';

interface ContractContext {
  eventType?: string; // wedding, corporate, pub, private party, etc.
  venue?: string;
  venueType?: string; // outdoor, indoor, church, etc.
  hasSound?: boolean;
  needsEquipment?: boolean;
  travelDistance?: number;
  performanceHours?: number;
  hasDeposit?: boolean;
  depositAmount?: number;
  specialCircumstances?: string[]; // ['late finish', 'alcohol service', 'pyrotechnics', etc.]
}

interface GeneratedTerms {
  standardClauses: string[];
  customClauses: string[];
  reasoning?: string;
}

export class AITermsGenerator {
  private anthropic: Anthropic;
  private cache: Map<string, GeneratedTerms> = new Map();

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  /**
   * Generate contract terms using AI based on context
   * Uses caching to reduce API calls for similar contexts
   */
  async generateTerms(context: ContractContext): Promise<GeneratedTerms> {
    // Create cache key from context
    const cacheKey = this.createCacheKey(context);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log('📦 Using cached terms for similar context');
      return this.cache.get(cacheKey)!;
    }

    try {
      // Call Claude Haiku for cost-effective generation
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for consistency
        system: `You are a legal assistant specializing in music performance contracts. 
Generate appropriate contract terms based on the context provided. 
Be concise and practical. Each clause should be one clear sentence.
Focus on protecting both performer and client fairly.`,
        messages: [{
          role: 'user',
          content: this.buildPrompt(context)
        }]
      });

      const result = this.parseAIResponse(response.content[0].text);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('AI terms generation failed, using fallback:', error);
      return this.getFallbackTerms(context);
    }
  }

  /**
   * Build a concise prompt for the AI
   */
  private buildPrompt(context: ContractContext): string {
    return `Generate contract terms for:
Event: ${context.eventType || 'general performance'}
Venue: ${context.venueType || 'standard indoor'}
Duration: ${context.performanceHours || 3} hours
Travel: ${context.travelDistance || 0} miles
${context.hasDeposit ? `Deposit: £${context.depositAmount}` : 'No deposit'}
${context.specialCircumstances?.length ? `Special: ${context.specialCircumstances.join(', ')}` : ''}

Provide 5-8 relevant contract clauses in JSON format:
{
  "payment": ["clause1", "clause2"],
  "performance": ["clause1", "clause2"],
  "cancellation": ["clause1"],
  "liability": ["clause1"]
}`;
  }

  /**
   * Parse AI response into structured terms
   */
  private parseAIResponse(response: string): GeneratedTerms {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const allClauses: string[] = [];

      // Flatten all categories into single array
      Object.values(parsed).forEach((clauses: any) => {
        if (Array.isArray(clauses)) {
          allClauses.push(...clauses);
        }
      });

      return {
        standardClauses: allClauses.slice(0, 5), // First 5 as standard
        customClauses: allClauses.slice(5), // Rest as custom
        reasoning: 'AI generated based on event context'
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.getFallbackTerms();
    }
  }

  /**
   * Create cache key from context
   */
  private createCacheKey(context: ContractContext): string {
    const key = [
      context.eventType || 'general',
      context.venueType || 'indoor',
      context.performanceHours || '3',
      Math.floor((context.travelDistance || 0) / 50) * 50, // Round to nearest 50 miles
      context.hasDeposit ? 'deposit' : 'nodeposit',
      ...(context.specialCircumstances || [])
    ].join('-');
    
    return key.toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Fallback terms if AI fails
   */
  private getFallbackTerms(context?: ContractContext): GeneratedTerms {
    const terms: GeneratedTerms = {
      standardClauses: [
        "Payment due on date of performance unless otherwise agreed",
        "Client must provide adequate and safe power supply",
        "Client must provide safe venue access for load-in/out",
        "Performer retains ownership of all equipment",
        "Neither party liable for cancellation due to force majeure"
      ],
      customClauses: []
    };

    // Add context-specific fallbacks
    if (context?.eventType === 'wedding') {
      terms.customClauses.push(
        "Performer will coordinate with wedding planner/venue coordinator",
        "Special first dance arrangements to be confirmed 14 days prior"
      );
    }

    if (context?.venueType === 'outdoor') {
      terms.customClauses.push(
        "Client must provide weather protection for outdoor events",
        "Performance may be cancelled due to severe weather without penalty"
      );
    }

    if (context?.travelDistance && context.travelDistance > 50) {
      terms.customClauses.push(
        `Client to provide accommodation for venues over ${context.travelDistance} miles`
      );
    }

    if (context?.hasDeposit) {
      terms.standardClauses.unshift(
        `Non-refundable deposit of £${context.depositAmount} secures booking`
      );
    }

    return terms;
  }

  /**
   * Get common terms library (for UI selection)
   */
  static getCommonTermsLibrary() {
    return {
      payment: [
        "Payment due on date of performance",
        "Payment due within 7 days of performance",
        "Payment due within 14 days of performance",
        "50% deposit required to secure booking",
        "Bank transfer preferred, cash accepted"
      ],
      performance: [
        "Client must provide adequate power supply",
        "Stage/performance area must be flat and safe",
        "Sound levels comply with venue restrictions",
        "Performance times include setup/breakdown",
        "Client to provide refreshments for performances over 3 hours"
      ],
      cancellation: [
        "Cancellations within 7 days incur full fee",
        "Cancellations within 14 days incur 50% fee",
        "Deposits non-refundable for all cancellations",
        "Force majeure releases both parties from obligations",
        "Performer will attempt to provide replacement if unable to perform"
      ],
      equipment: [
        "All equipment remains property of performer",
        "Client responsible for equipment damage by guests",
        "Performer provides all sound equipment unless specified",
        "Client must ensure equipment security during breaks",
        "Equipment setup requires 1 hour before performance"
      ],
      liability: [
        "Performer holds Public Liability Insurance",
        "Client responsible for venue licenses (PRS/PPL)",
        "No recording without written consent",
        "Performer not liable for hearing damage from reasonable sound levels",
        "Client indemnifies performer against venue damage claims"
      ]
    };
  }
}

// Integration with existing contract system
export async function enhanceContractWithAI(
  contract: any,
  userSettings: any,
  aiApiKey?: string
): Promise<any> {
  // If no API key or AI disabled, return contract as-is
  if (!aiApiKey || userSettings?.aiTermsGeneration === false) {
    return contract;
  }

  const generator = new AITermsGenerator(aiApiKey);
  
  // Build context from contract data
  const context: ContractContext = {
    eventType: detectEventType(contract.venue, contract.notes),
    venueType: detectVenueType(contract.venue, contract.venueAddress),
    hasSound: contract.equipmentRequirements?.includes('PA') || false,
    performanceHours: calculatePerformanceHours(contract.eventTime, contract.eventEndTime),
    travelDistance: contract.travelDistance || 0,
    hasDeposit: !!contract.deposit,
    depositAmount: parseFloat(contract.deposit || '0'),
    specialCircumstances: detectSpecialCircumstances(contract)
  };

  // Generate terms
  const generatedTerms = await generator.generateTerms(context);
  
  // Merge with existing terms
  return {
    ...contract,
    aiGeneratedTerms: generatedTerms,
    termsLastUpdated: new Date().toISOString()
  };
}

// Helper functions
function detectEventType(venue: string, notes?: string): string {
  const text = `${venue} ${notes}`.toLowerCase();
  if (text.includes('wedding')) return 'wedding';
  if (text.includes('corporate') || text.includes('company')) return 'corporate';
  if (text.includes('pub') || text.includes('bar')) return 'pub';
  if (text.includes('birthday') || text.includes('party')) return 'private party';
  if (text.includes('festival')) return 'festival';
  return 'general performance';
}

function detectVenueType(venue: string, address?: string): string {
  const text = `${venue} ${address}`.toLowerCase();
  if (text.includes('outdoor') || text.includes('garden') || text.includes('marquee')) return 'outdoor';
  if (text.includes('church')) return 'church';
  if (text.includes('hotel')) return 'hotel';
  if (text.includes('club')) return 'club';
  return 'indoor';
}

function calculatePerformanceHours(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 3; // default
  
  try {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours > 0 ? hours : 3;
  } catch {
    return 3;
  }
}

function detectSpecialCircumstances(contract: any): string[] {
  const circumstances: string[] = [];
  
  if (contract.eventEndTime && contract.eventEndTime > '23:00') {
    circumstances.push('late finish');
  }
  
  if (contract.specialRequirements?.toLowerCase().includes('alcohol')) {
    circumstances.push('alcohol service');
  }
  
  if (contract.equipmentRequirements?.toLowerCase().includes('pyro')) {
    circumstances.push('pyrotechnics');
  }
  
  return circumstances;
}

// Cost estimation helper
export function estimateAICost(callsPerMonth: number): number {
  const HAIKU_COST_PER_1K_TOKENS = 0.00025; // Claude Haiku pricing
  const AVG_TOKENS_PER_CALL = 300; // Prompt + response
  
  return callsPerMonth * (AVG_TOKENS_PER_CALL / 1000) * HAIKU_COST_PER_1K_TOKENS;
}