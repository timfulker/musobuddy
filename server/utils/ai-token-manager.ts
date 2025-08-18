import { db } from '../core/database';
import { users } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

export interface TokenUsageResult {
  canUseAI: boolean;
  tokensUsed: number;
  tokensRemaining: number;
  monthlyLimit: number;
  limitExceeded: boolean;
  resetDate: Date;
}

export interface AIGenerationOptions {
  userId: string;
  fullContext?: boolean;
  fallbackToLimited?: boolean;
}

// Estimate tokens from text (rough approximation)
export function estimateTokens(text: string): number {
  // 1 token ≈ 0.75 words, so 1 word ≈ 1.33 tokens
  const words = text.split(/\s+/).length;
  return Math.ceil(words * 1.33);
}

// Check if user has exceeded monthly AI token limit
export async function checkTokenUsage(userId: string): Promise<TokenUsageResult> {
  console.log(`🔍 Checking AI token usage for user ${userId}`);
  
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  
  if (!user) {
    throw new Error('User not found');
  }

  // Check if we need to reset monthly usage (new month)
  const now = new Date();
  const resetDate = new Date(user.aiTokenResetDate || now);
  const shouldReset = now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear();

  if (shouldReset) {
    console.log(`📅 Resetting monthly AI token usage for user ${userId}`);
    await db.update(users)
      .set({
        aiTokensUsedThisMonth: 0,
        aiTokenResetDate: now,
        aiLimitExceeded: false,
        updatedAt: now
      })
      .where(eq(users.id, userId));
    
    // Refresh user data
    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
    return {
      canUseAI: true,
      tokensUsed: 0,
      tokensRemaining: updatedUser.aiTokenMonthlyLimit || 50000,
      monthlyLimit: updatedUser.aiTokenMonthlyLimit || 50000,
      limitExceeded: false,
      resetDate: now
    };
  }

  const responsesUsed = user.aiTokensUsedThisMonth || 0; // Reusing field for response count
  const monthlyLimit = user.aiTokenMonthlyLimit || 200; // Default 200 AI responses
  const responsesRemaining = Math.max(0, monthlyLimit - responsesUsed);
  const limitExceeded = responsesUsed >= monthlyLimit;

  return {
    canUseAI: !limitExceeded,
    tokensUsed: responsesUsed, // Actually response count
    tokensRemaining: responsesRemaining,
    monthlyLimit,
    limitExceeded,
    resetDate: new Date(user.aiTokenResetDate || now)
  };
}

// Update response usage after AI generation  
export async function updateTokenUsage(userId: string, responsesGenerated: number = 1): Promise<void> {
  console.log(`📊 Recording ${responsesGenerated} AI response(s) generated for user ${userId}`);
  
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw new Error('User not found');
  }

  const newResponsesUsed = (user.aiTokensUsedThisMonth || 0) + responsesGenerated;
  const limitExceeded = newResponsesUsed >= (user.aiTokenMonthlyLimit || 200);

  await db.update(users)
    .set({
      aiTokensUsedThisMonth: newResponsesUsed,
      aiLimitExceeded: limitExceeded,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  if (limitExceeded) {
    console.log(`⚠️ User ${userId} has exceeded monthly AI response limit`);
  }
}

// Get token usage status for UI display
export async function getTokenUsageForUI(userId: string): Promise<{
  percentage: number;
  status: 'good' | 'warning' | 'exceeded';
  message: string;
  tokensUsed: number;
  monthlyLimit: number;
}> {
  const usage = await checkTokenUsage(userId);
  const percentage = (usage.tokensUsed / usage.monthlyLimit) * 100;
  
  let status: 'good' | 'warning' | 'exceeded' = 'good';
  let message = `${usage.tokensUsed.toLocaleString()} / ${usage.monthlyLimit.toLocaleString()} AI responses used this month`;
  
  if (percentage >= 100) {
    status = 'exceeded';
    message = `Monthly AI response limit exceeded. Contact support to upgrade.`;
  } else if (percentage >= 80) {
    status = 'warning';
    message = `${Math.round(percentage)}% of monthly AI responses used. Consider upgrading soon.`;
  }
  
  return {
    percentage: Math.min(100, percentage),
    status,
    message,
    tokensUsed: usage.tokensUsed,
    monthlyLimit: usage.monthlyLimit
  };
}