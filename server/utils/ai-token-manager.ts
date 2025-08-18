import { db } from '../db';
import { users } from '@shared/schema';
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

  const tokensUsed = user.aiTokensUsedThisMonth || 0;
  const monthlyLimit = user.aiTokenMonthlyLimit || 50000;
  const tokensRemaining = Math.max(0, monthlyLimit - tokensUsed);
  const limitExceeded = tokensUsed >= monthlyLimit;

  return {
    canUseAI: !limitExceeded,
    tokensUsed,
    tokensRemaining,
    monthlyLimit,
    limitExceeded,
    resetDate: new Date(user.aiTokenResetDate || now)
  };
}

// Update token usage after AI API call
export async function updateTokenUsage(userId: string, tokensUsed: number): Promise<void> {
  console.log(`📊 Recording ${tokensUsed} tokens used for user ${userId}`);
  
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw new Error('User not found');
  }

  const newTokensUsed = (user.aiTokensUsedThisMonth || 0) + tokensUsed;
  const limitExceeded = newTokensUsed >= (user.aiTokenMonthlyLimit || 50000);

  await db.update(users)
    .set({
      aiTokensUsedThisMonth: newTokensUsed,
      aiLimitExceeded: limitExceeded,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  if (limitExceeded) {
    console.log(`⚠️ User ${userId} has exceeded monthly AI token limit`);
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
  let message = `${usage.tokensUsed.toLocaleString()} / ${usage.monthlyLimit.toLocaleString()} tokens used this month`;
  
  if (percentage >= 100) {
    status = 'exceeded';
    message = `Monthly limit exceeded. Upgrade for unlimited AI responses.`;
  } else if (percentage >= 80) {
    status = 'warning';
    message = `${Math.round(percentage)}% of monthly AI tokens used. Consider upgrading.`;
  }
  
  return {
    percentage: Math.min(100, percentage),
    status,
    message,
    tokensUsed: usage.tokensUsed,
    monthlyLimit: usage.monthlyLimit
  };
}