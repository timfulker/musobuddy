/**
 * AI Usage Tracker
 * Tracks OpenAI and Claude API usage with cost estimates across all features
 */

interface AIUsageLog {
  timestamp: string;
  userId: string;
  feature: string;
  model: string;
  provider: 'openai' | 'claude';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  requestId?: string;
}

// Cost per 1K tokens (as of 2024)
const TOKEN_COSTS = {
  openai: {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'gpt-5': { input: 0.03, output: 0.06 }, // Estimated
  },
  claude: {
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-sonnet-4-20250514': { input: 0.003, output: 0.015 },
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    'claude-3-opus': { input: 0.015, output: 0.075 }
  }
};

class AIUsageTracker {
  private static logs: AIUsageLog[] = [];

  static trackUsage(
    userId: string,
    feature: string,
    provider: 'openai' | 'claude',
    model: string,
    inputTokens: number,
    outputTokens: number,
    requestId?: string
  ): void {
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = this.calculateCost(provider, model, inputTokens, outputTokens);

    const log: AIUsageLog = {
      timestamp: new Date().toISOString(),
      userId,
      feature,
      model,
      provider,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      requestId
    };

    this.logs.push(log);

    // Console log for immediate visibility
    console.log(`💰 [AI-COST] ${feature} | ${provider}:${model} | In:${inputTokens} Out:${outputTokens} | $${estimatedCost.toFixed(4)} | User:${userId}${requestId ? ` | Req:${requestId}` : ''}`);
  }

  private static calculateCost(
    provider: 'openai' | 'claude',
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const costs = TOKEN_COSTS[provider]?.[model];
    if (!costs) {
      console.warn(`⚠️ [AI-COST] Unknown model: ${provider}:${model} - using default rates`);
      // Use default high rates as fallback
      return ((inputTokens * 0.03) + (outputTokens * 0.06)) / 1000;
    }

    const inputCost = (inputTokens * costs.input) / 1000;
    const outputCost = (outputTokens * costs.output) / 1000;
    return inputCost + outputCost;
  }

  static getSessionSummary(userId: string, timeframeMinutes: number = 60): {
    totalCost: number;
    totalCalls: number;
    breakdown: Record<string, { calls: number; cost: number; tokens: number }>;
  } {
    const cutoff = new Date(Date.now() - timeframeMinutes * 60 * 1000);
    const userLogs = this.logs.filter(log => 
      log.userId === userId && new Date(log.timestamp) > cutoff
    );

    const breakdown: Record<string, { calls: number; cost: number; tokens: number }> = {};
    let totalCost = 0;

    for (const log of userLogs) {
      const key = `${log.feature} (${log.provider}:${log.model})`;
      if (!breakdown[key]) {
        breakdown[key] = { calls: 0, cost: 0, tokens: 0 };
      }
      breakdown[key].calls++;
      breakdown[key].cost += log.estimatedCost;
      breakdown[key].tokens += log.totalTokens;
      totalCost += log.estimatedCost;
    }

    return {
      totalCost,
      totalCalls: userLogs.length,
      breakdown
    };
  }

  static printSessionSummary(userId: string, timeframeMinutes: number = 60): void {
    const summary = this.getSessionSummary(userId, timeframeMinutes);
    
    console.log(`\n📊 [AI-SUMMARY] Session summary for user ${userId} (last ${timeframeMinutes} minutes):`);
    console.log(`💰 Total cost: $${summary.totalCost.toFixed(4)}`);
    console.log(`📞 Total calls: ${summary.totalCalls}`);
    console.log(`📋 Breakdown:`);
    
    for (const [feature, stats] of Object.entries(summary.breakdown)) {
      console.log(`   • ${feature}: ${stats.calls} calls, ${stats.tokens} tokens, $${stats.cost.toFixed(4)}`);
    }
    console.log('');
  }

  static getAllLogs(): AIUsageLog[] {
    return [...this.logs];
  }

  static clearLogs(): void {
    this.logs = [];
    console.log('🧹 [AI-COST] Usage logs cleared');
  }
}

export { AIUsageTracker };
export type { AIUsageLog };