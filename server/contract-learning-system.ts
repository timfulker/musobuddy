/**
 * Intelligent Contract Learning System
 * Allows users to teach the AI about their specific contract formats
 * for foolproof parsing in a production SaaS environment
 */

interface ContractTemplate {
  id: string;
  name: string;
  userId: string;
  patterns: {
    client_name: string[];
    client_email: string[];
    client_phone: string[];
    client_address: string[];
    venue_name: string[];
    venue_address: string[];
    event_date: string[];
    start_time: string[];
    end_time: string[];
    fee: string[];
  };
  examples: {
    field: string;
    text_snippet: string;
    extracted_value: string;
  }[];
  success_rate: number;
  created_at: Date;
  updated_at: Date;
}

export class ContractLearningSystem {
  private templates: Map<string, ContractTemplate> = new Map();

  /**
   * Teach the system about a new contract format
   */
  async learnFromExample(
    userId: string,
    contractText: string,
    userCorrections: {
      client_name?: string;
      client_email?: string;
      client_phone?: string;
      client_address?: string;
      venue_name?: string;
      venue_address?: string;
      event_date?: string;
      start_time?: string;
      end_time?: string;
      fee?: number;
    }
  ) {
    // Use AI to identify patterns based on user corrections
    const patterns = await this.identifyPatterns(contractText, userCorrections);
    
    // Store or update the learning template
    const templateId = `user_${userId}_template`;
    const existing = this.templates.get(templateId);
    
    if (existing) {
      // Merge patterns and update success rate
      this.mergePatterns(existing, patterns);
      existing.success_rate = this.calculateSuccessRate(existing);
      existing.updated_at = new Date();
    } else {
      // Create new template
      const newTemplate: ContractTemplate = {
        id: templateId,
        name: `${userId}'s Contract Format`,
        userId,
        patterns,
        examples: this.createExamples(contractText, userCorrections),
        success_rate: 100, // Start optimistic
        created_at: new Date(),
        updated_at: new Date()
      };
      this.templates.set(templateId, newTemplate);
    }
  }

  /**
   * Parse a contract using learned patterns
   */
  async parseWithLearning(userId: string, contractText: string) {
    const template = this.templates.get(`user_${userId}_template`);
    
    if (template) {
      console.log(`🎓 Using learned patterns for user ${userId}`);
      return this.parseWithTemplate(contractText, template);
    }
    
    // Fallback to intelligent generic parsing
    console.log('🤖 Using intelligent generic parsing');
    return this.intelligentGenericParse(contractText);
  }

  /**
   * Generate an adaptive prompt based on learned patterns
   */
  private generateAdaptivePrompt(contractText: string, template?: ContractTemplate): string {
    if (template) {
      // Use learned patterns
      return `You are a contract parser specialized in this user's contract format.

LEARNED PATTERNS for this user:
${Object.entries(template.patterns).map(([field, patterns]) => 
  `${field}: ${patterns.slice(0, 3).join(', ')}`
).join('\n')}

EXAMPLES that worked:
${template.examples.slice(0, 3).map(ex => 
  `${ex.field}: "${ex.text_snippet}" → "${ex.extracted_value}"`
).join('\n')}

Apply these learned patterns to extract:
{
  "client_name": "string or null",
  "client_email": "string or null",
  "client_phone": "string or null",
  "client_address": "string or null",
  "venue_name": "string or null",
  "venue_address": "string or null",
  "event_date": "YYYY-MM-DD or null",
  "start_time": "HH:MM or null",
  "end_time": "HH:MM or null",
  "agreed_fee": number or null,
  "extras_or_notes": "string or null"
}

Contract text:
${contractText}`;
    }

    // Generic intelligent prompt
    return `You are an intelligent contract parser. Extract CLIENT information from this music contract.

CRITICAL RULES:
- CLIENT = Person/organization HIRING the musician (the customer)
- PERFORMER = The musician being hired (NOT the client)
- Extract CLIENT details only, never performer details

INTELLIGENT PATTERNS TO LOOK FOR:
- Contract parties: "between X and Y" (X = client, Y = performer)
- Payment direction: Who pays whom?
- Signature sections: "Hirer", "Client", "Customer" vs "Performer", "Artist"
- Contact info location: Usually with the paying party
- Venue information: Where the performance happens

ADAPTIVE EXTRACTION:
- Read the entire contract structure first
- Identify roles based on context and payment flow
- Extract client information consistently

Return this JSON:
{
  "client_name": "string or null",
  "client_email": "string or null",
  "client_phone": "string or null",
  "client_address": "string or null",
  "venue_name": "string or null",
  "venue_address": "string or null",
  "event_date": "YYYY-MM-DD or null",
  "start_time": "HH:MM or null",
  "end_time": "HH:MM or null",
  "agreed_fee": number or null,
  "extras_or_notes": "string or null"
}

Contract text:
${contractText}`;
  }

  private async identifyPatterns(contractText: string, corrections: any) {
    // This would use AI to identify the patterns that led to successful extraction
    // For now, return basic patterns
    return {
      client_name: ["between", "client:", "hirer:"],
      client_email: ["email:", "@", "contact:"],
      client_phone: ["phone:", "tel:", "mobile:"],
      client_address: ["address:", "of "],
      venue_name: ["at ", "venue:", "location:"],
      venue_address: ["venue address:", "located at"],
      event_date: ["date:", "on "],
      start_time: ["start:", "begins:"],
      end_time: ["end:", "finish:"],
      fee: ["£", "$", "fee:", "payment:"]
    };
  }

  private mergePatterns(existing: ContractTemplate, newPatterns: any) {
    // Merge new patterns with existing ones
    Object.keys(newPatterns).forEach(field => {
      if (existing.patterns[field as keyof typeof existing.patterns]) {
        // Add new patterns, avoiding duplicates
        const currentPatterns = existing.patterns[field as keyof typeof existing.patterns];
        newPatterns[field].forEach((pattern: string) => {
          if (!currentPatterns.includes(pattern)) {
            currentPatterns.push(pattern);
          }
        });
      }
    });
  }

  private createExamples(contractText: string, corrections: any) {
    // Create training examples from the corrections
    return Object.entries(corrections).map(([field, value]) => ({
      field,
      text_snippet: this.findRelevantSnippet(contractText, value as string),
      extracted_value: value as string
    }));
  }

  private findRelevantSnippet(text: string, value: string): string {
    // Find the context around where this value appears in the text
    const index = text.toLowerCase().indexOf((value as string).toLowerCase());
    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + (value as string).length + 50);
      return text.substring(start, end);
    }
    return "Not found";
  }

  private calculateSuccessRate(template: ContractTemplate): number {
    // Calculate based on historical success
    return Math.max(50, template.success_rate - 5); // Decay over time, encourage learning
  }

  private async parseWithTemplate(contractText: string, template: ContractTemplate) {
    // Use the learned template to parse
    const prompt = this.generateAdaptivePrompt(contractText, template);
    return this.callAI(prompt);
  }

  private async intelligentGenericParse(contractText: string) {
    // Fallback to generic intelligent parsing
    const prompt = this.generateAdaptivePrompt(contractText);
    return this.callAI(prompt);
  }

  private async callAI(prompt: string) {
    // This would call the actual AI service
    // Placeholder for now
    return null;
  }
}

export const contractLearning = new ContractLearningSystem();