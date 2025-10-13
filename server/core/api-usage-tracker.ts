/**
 * API Usage Tracking Utility
 * Tracks API calls and costs for admin monitoring
 */

import { db } from './database';
import { apiUsageTracking, apiUsageStats } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

// Pricing per 1M tokens (as of 2025)
const PRICING = {
  // OpenAI GPT-4 Turbo
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-4-32k': { input: 60.00, output: 120.00 },

  // OpenAI GPT-3.5
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-3.5-turbo-16k': { input: 3.00, output: 4.00 },

  // Anthropic Claude
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-2.1': { input: 8.00, output: 24.00 },
  'claude-2': { input: 8.00, output: 24.00 },

  // OpenAI Embeddings
  'text-embedding-ada-002': { input: 0.10, output: 0 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
};

interface TrackingData {
  userId: string;
  service: 'openai' | 'anthropic' | 'google' | 'other';
  model?: string;
  endpoint?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  metadata?: Record<string, any>;
}

/**
 * Calculate cost based on model and token usage
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model as keyof typeof PRICING];

  if (!pricing) {
    // Default pricing if model not found (conservative estimate)
    console.warn(`⚠️ [API-TRACKER] Unknown model: ${model}, using default pricing`);
    return ((inputTokens + outputTokens) / 1000000) * 5.00; // $5 per 1M tokens default
  }

  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Track an API call
 */
export async function trackApiUsage(data: TrackingData): Promise<void> {
  try {
    const {
      userId,
      service,
      model = 'unknown',
      endpoint = '',
      inputTokens = 0,
      outputTokens = 0,
      totalTokens = inputTokens + outputTokens,
      metadata = {},
    } = data;

    // Calculate cost
    const estimatedCost = model ? calculateCost(model, inputTokens, outputTokens) : 0;

    console.log(`📊 [API-TRACKER] Tracking API usage:`, {
      userId,
      service,
      model,
      tokens: totalTokens,
      cost: `$${estimatedCost.toFixed(6)}`,
    });

    // Insert tracking record
    await db.insert(apiUsageTracking).values({
      userId,
      service,
      endpoint: endpoint || model,
      requestCount: 1,
      tokensUsed: totalTokens,
      estimatedCost: estimatedCost.toString(),
      timestamp: new Date(),
      metadata: {
        model,
        inputTokens,
        outputTokens,
        ...metadata,
      },
    });

    // Update or create user stats
    await updateUserStats(userId, service, 1, totalTokens, estimatedCost);

  } catch (error) {
    console.error('❌ [API-TRACKER] Failed to track API usage:', error);
    // Don't throw - tracking failures shouldn't break the main flow
  }
}

/**
 * Update aggregated user statistics
 */
async function updateUserStats(
  userId: string,
  service: string,
  requests: number,
  tokens: number,
  cost: number
): Promise<void> {
  try {
    // Check if stats exist
    const existing = await db
      .select()
      .from(apiUsageStats)
      .where(eq(apiUsageStats.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing stats
      const currentBreakdown = (existing[0].serviceBreakdown as any) || {};
      const serviceStats = currentBreakdown[service] || { requests: 0, cost: 0, tokens: 0 };

      const updatedBreakdown = {
        ...currentBreakdown,
        [service]: {
          requests: serviceStats.requests + requests,
          cost: parseFloat((serviceStats.cost + cost).toFixed(6)),
          tokens: serviceStats.tokens + tokens,
        },
      };

      await db
        .update(apiUsageStats)
        .set({
          totalRequests: sql`${apiUsageStats.totalRequests} + ${requests}`,
          totalCost: sql`${apiUsageStats.totalCost} + ${cost}`,
          lastActivity: new Date(),
          serviceBreakdown: updatedBreakdown,
          updatedAt: new Date(),
        })
        .where(eq(apiUsageStats.userId, userId));

    } else {
      // Create new stats record
      await db.insert(apiUsageStats).values({
        userId,
        totalRequests: requests,
        totalCost: cost.toString(),
        lastActivity: new Date(),
        isBlocked: false,
        riskScore: 0,
        serviceBreakdown: {
          [service]: {
            requests,
            cost: parseFloat(cost.toFixed(6)),
            tokens,
          },
        },
        updatedAt: new Date(),
      });
    }

  } catch (error) {
    console.error('❌ [API-TRACKER] Failed to update user stats:', error);
  }
}

/**
 * Check if user is blocked from API usage
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const stats = await db
      .select({ isBlocked: apiUsageStats.isBlocked })
      .from(apiUsageStats)
      .where(eq(apiUsageStats.userId, userId))
      .limit(1);

    return stats[0]?.isBlocked || false;
  } catch (error) {
    console.error('❌ [API-TRACKER] Failed to check block status:', error);
    return false;
  }
}

/**
 * Wrapper for OpenAI API calls with automatic tracking
 */
export async function trackOpenAICall<T>(
  userId: string,
  model: string,
  apiCall: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  // Check if user is blocked
  const blocked = await isUserBlocked(userId);
  if (blocked) {
    throw new Error('API access blocked for this user');
  }

  const startTime = Date.now();

  try {
    const response = await apiCall();
    const duration = Date.now() - startTime;

    // Extract token usage from response (OpenAI format)
    const usage = (response as any)?.usage;
    if (usage) {
      await trackApiUsage({
        userId,
        service: 'openai',
        model,
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        metadata: {
          ...metadata,
          durationMs: duration,
        },
      });
    }

    return response;
  } catch (error) {
    console.error('❌ [API-TRACKER] OpenAI call failed:', error);
    throw error;
  }
}

/**
 * Wrapper for Anthropic API calls with automatic tracking
 */
export async function trackAnthropicCall<T>(
  userId: string,
  model: string,
  apiCall: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  // Check if user is blocked
  const blocked = await isUserBlocked(userId);
  if (blocked) {
    throw new Error('API access blocked for this user');
  }

  const startTime = Date.now();

  try {
    const response = await apiCall();
    const duration = Date.now() - startTime;

    // Extract token usage from response (Anthropic format)
    const usage = (response as any)?.usage;
    if (usage) {
      await trackApiUsage({
        userId,
        service: 'anthropic',
        model,
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
        metadata: {
          ...metadata,
          durationMs: duration,
        },
      });
    }

    return response;
  } catch (error) {
    console.error('❌ [API-TRACKER] Anthropic call failed:', error);
    throw error;
  }
}
