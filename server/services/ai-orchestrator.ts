import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Initialize AI clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// AI Models Configuration
export type AIModel = 'gpt-4o-mini' | 'gpt-5' | 'claude-sonnet-4';
export type AIProvider = 'openai' | 'anthropic';

interface ModelConfig {
  provider: AIProvider;
  model: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.20
  },
  'gpt-5': {
    provider: 'openai', 
    model: 'gpt-5',
    inputCostPer1M: 1.25,
    outputCostPer1M: 10.00
  },
  'claude-sonnet-4': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00
  }
};

// Task Configuration
export interface TaskConfig {
  models: AIModel[];
  confidenceThreshold: number;
  maxBudgetCents: number;
  maxAttempts?: number;
  validators?: Array<(result: any) => { valid: boolean; errors?: string[] }>;
  scorer?: (result: any, input: any) => number; // Returns 0.0-1.0 confidence score
}

// AI Request/Response Types
export interface AIRequest {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface AIResponse {
  content: string;
  model: AIModel;
  confidence: number;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  attempt: number;
  validationErrors?: string[];
}

export interface OrchestrationResult {
  success: boolean;
  response?: AIResponse;
  totalCostCents: number;
  attempts: number;
  escalationPath: AIModel[];
  error?: string;
}

// Validation Helpers
export class AIValidators {
  static requiresJSON(result: any): { valid: boolean; errors?: string[] } {
    try {
      if (typeof result.content !== 'string') {
        return { valid: false, errors: ['Response content is not a string'] };
      }
      JSON.parse(result.content);
      return { valid: true };
    } catch (error) {
      return { valid: false, errors: [`Invalid JSON: ${error.message}`] };
    }
  }

  static requiresFields(fields: string[]) {
    return (result: any): { valid: boolean; errors?: string[] } => {
      try {
        const parsed = JSON.parse(result.content);
        const missing = fields.filter(field => !parsed[field]);
        if (missing.length > 0) {
          return { valid: false, errors: [`Missing required fields: ${missing.join(', ')}`] };
        }
        return { valid: true };
      } catch (error) {
        return { valid: false, errors: ['Cannot validate fields - invalid JSON'] };
      }
    };
  }

  static minimumLength(minLength: number) {
    return (result: any): { valid: boolean; errors?: string[] } => {
      if (!result.content || result.content.length < minLength) {
        return { valid: false, errors: [`Response too short (${result.content?.length || 0} < ${minLength})`) };
      }
      return { valid: true };
    };
  }
}

// Confidence Scorers
export class AIScorers {
  static parseBookingConfidence(result: any, input: any): number {
    try {
      const parsed = JSON.parse(result.content);
      let score = 0.5; // Base score

      // Check if we have critical fields
      if (parsed.clientName && parsed.clientName.trim()) score += 0.15;
      if (parsed.clientEmail && parsed.clientEmail.includes('@')) score += 0.15;
      if (parsed.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.eventDate)) score += 0.15;
      if (parsed.venue || parsed.venueAddress) score += 0.1;
      if (parsed.fee && typeof parsed.fee === 'number' && parsed.fee > 0) score += 0.1;
      
      // Use explicit confidence if provided
      if (parsed.confidence && typeof parsed.confidence === 'number') {
        score = Math.max(score, parsed.confidence);
      }

      return Math.min(1.0, score);
    } catch (error) {
      return 0.2; // Very low confidence for unparseable responses
    }
  }

  static responseQuality(result: any, input: any): number {
    try {
      const parsed = JSON.parse(result.content);
      let score = 0.5;

      // Check for required fields
      if (parsed.subject && parsed.subject.trim()) score += 0.2;
      if (parsed.emailBody && parsed.emailBody.trim()) score += 0.2;
      
      // Check length and quality indicators
      if (parsed.emailBody && parsed.emailBody.length > 50) score += 0.1;
      if (parsed.emailBody && parsed.emailBody.length > 150) score += 0.1;
      
      return Math.min(1.0, score);
    } catch (error) {
      return 0.3;
    }
  }

  static eventMatchConfidence(result: any, input: any): number {
    try {
      const parsed = JSON.parse(result.content);
      
      // Use the confidence provided by the matcher
      if (parsed.confidence && typeof parsed.confidence === 'number') {
        return Math.max(0.0, Math.min(1.0, parsed.confidence));
      }
      
      // Fallback scoring
      if (parsed.isMatch === true && parsed.reasoning && parsed.reasoning.length > 20) {
        return 0.8;
      } else if (parsed.isMatch === false && parsed.reasoning && parsed.reasoning.length > 20) {
        return 0.8;
      }
      
      return 0.5;
    } catch (error) {
      return 0.3;
    }
  }
}

// Main AI Orchestrator Class
export class AIOrchestrator {
  private static instance: AIOrchestrator;
  private costTracking: Map<string, number> = new Map();
  private requestCount: number = 0;

  static getInstance(): AIOrchestrator {
    if (!AIOrchestrator.instance) {
      AIOrchestrator.instance = new AIOrchestrator();
    }
    return AIOrchestrator.instance;
  }

  // Main orchestration method
  async runTask(taskId: string, request: AIRequest, config: TaskConfig): Promise<OrchestrationResult> {
    const startTime = Date.now();
    this.requestCount++;
    const requestId = `${taskId}-${this.requestCount}`;
    
    console.log(`🤖 [${requestId}] Starting AI orchestration with ${config.models.length} model ladder`);
    console.log(`🎯 [${requestId}] Budget: $${config.maxBudgetCents / 100}, Confidence threshold: ${config.confidenceThreshold}`);

    let totalCostCents = 0;
    let attempts = 0;
    const escalationPath: AIModel[] = [];
    const maxAttempts = config.maxAttempts || config.models.length;

    for (let i = 0; i < Math.min(config.models.length, maxAttempts); i++) {
      const model = config.models[i];
      attempts++;
      escalationPath.push(model);

      try {
        console.log(`🔄 [${requestId}] Attempt ${attempts}: Trying ${model}`);
        
        const response = await this.callModel(model, request, requestId);
        totalCostCents += response.costCents;

        // Check budget constraint
        if (totalCostCents > config.maxBudgetCents) {
          console.log(`💰 [${requestId}] Budget exceeded (${totalCostCents}¢ > ${config.maxBudgetCents}¢), stopping`);
          break;
        }

        // Run validation
        const validationErrors: string[] = [];
        if (config.validators) {
          for (const validator of config.validators) {
            const validation = validator(response);
            if (!validation.valid) {
              validationErrors.push(...(validation.errors || ['Validation failed']));
            }
          }
        }

        // Calculate confidence score
        let confidence = response.confidence;
        if (config.scorer) {
          confidence = config.scorer(response, request);
        }

        console.log(`📊 [${requestId}] ${model} result: confidence=${confidence.toFixed(2)}, cost=${response.costCents}¢, validation_errors=${validationErrors.length}`);

        // Check if this result meets our requirements
        if (validationErrors.length === 0 && confidence >= config.confidenceThreshold) {
          console.log(`✅ [${requestId}] Success with ${model} in ${attempts} attempts, total cost: ${totalCostCents}¢`);
          
          // Track costs
          this.trackCost(taskId, totalCostCents);
          
          return {
            success: true,
            response: { ...response, confidence },
            totalCostCents,
            attempts,
            escalationPath
          };
        }

        // Log why we're escalating
        if (validationErrors.length > 0) {
          console.log(`⚠️ [${requestId}] Validation failed: ${validationErrors.join(', ')}`);
        }
        if (confidence < config.confidenceThreshold) {
          console.log(`⚠️ [${requestId}] Confidence too low: ${confidence.toFixed(2)} < ${config.confidenceThreshold}`);
        }

      } catch (error) {
        console.error(`❌ [${requestId}] ${model} failed:`, error.message);
        
        // If this is the last attempt, return the error
        if (i === config.models.length - 1 || attempts >= maxAttempts) {
          this.trackCost(taskId, totalCostCents);
          return {
            success: false,
            totalCostCents,
            attempts,
            escalationPath,
            error: `All models failed. Last error: ${error.message}`
          };
        }
      }
    }

    // If we get here, we exhausted all models without success
    this.trackCost(taskId, totalCostCents);
    return {
      success: false,
      totalCostCents,
      attempts,
      escalationPath,
      error: 'All escalation models failed to meet confidence/validation requirements'
    };
  }

  // Call individual AI model
  private async callModel(model: AIModel, request: AIRequest, requestId: string): Promise<AIResponse> {
    const config = MODEL_CONFIGS[model];
    const startTime = Date.now();

    if (config.provider === 'openai') {
      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
          { role: 'user' as const, content: request.userPrompt }
        ],
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.1,
        ...(request.responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {})
      });

      const response = completion.choices[0].message.content || '';
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      const costCents = Math.ceil((inputTokens * config.inputCostPer1M / 1000000 + outputTokens * config.outputCostPer1M / 1000000) * 100);

      return {
        content: response,
        model,
        confidence: 0.8, // Default confidence, will be overridden by scorer if provided
        inputTokens,
        outputTokens,
        costCents,
        attempt: 1
      };

    } else if (config.provider === 'anthropic') {
      const completion = await anthropic.messages.create({
        model: config.model,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.1,
        system: request.systemPrompt || undefined,
        messages: [
          { role: 'user', content: request.userPrompt }
        ]
      });

      const response = completion.content[0]?.type === 'text' ? completion.content[0].text : '';
      const inputTokens = completion.usage.input_tokens || 0;
      const outputTokens = completion.usage.output_tokens || 0;
      const costCents = Math.ceil((inputTokens * config.inputCostPer1M / 1000000 + outputTokens * config.outputCostPer1M / 1000000) * 100);

      return {
        content: response,
        model,
        confidence: 0.8,
        inputTokens,
        outputTokens,
        costCents,
        attempt: 1
      };

    } else {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  // Cost tracking methods
  private trackCost(taskId: string, costCents: number): void {
    const currentCost = this.costTracking.get(taskId) || 0;
    this.costTracking.set(taskId, currentCost + costCents);
  }

  getCostSummary(): Record<string, number> {
    return Object.fromEntries(this.costTracking);
  }

  getTotalCost(): number {
    return Array.from(this.costTracking.values()).reduce((sum, cost) => sum + cost, 0);
  }

  resetTracking(): void {
    this.costTracking.clear();
    this.requestCount = 0;
  }
}

// Export singleton instance
export const aiOrchestrator = AIOrchestrator.getInstance();