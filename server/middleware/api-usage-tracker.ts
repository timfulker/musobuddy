import { Request, Response, NextFunction } from 'express';
import { db } from '../core/database';
import { apiUsageTracking, apiUsageLimits } from '../../shared/schema';
import { eq, and, gte } from 'drizzle-orm';

// API cost estimates per service (in USD)
const API_COSTS = {
  claude: 0.00025, // ~$0.00025 per request (very rough estimate)
  googlemaps: 0.002, // ~$0.002 per geocoding request
  mailgun: 0.0005, // ~$0.0005 per email
  stripe: 0.029, // 2.9% + $0.30, but variable based on amount
  twilio: 0.0075, // ~$0.0075 per SMS
  openai: 0.001, // Legacy fallback cost
} as const;

// Default fair usage limits per service (based on recommended fair usage)
export const DEFAULT_LIMITS = {
  claude: { daily: 1000, monthly: 10000 }, // AI email parsing: User has paid Claude plan with high limits
  googlemaps: { daily: 7, monthly: 150 }, // Address lookups: 100-200 recommended, using 150 as conservative start
  mailgun: { daily: 15, monthly: 400 }, // Email sending: 300-500 sending + 200-300 receiving = ~800 total, using 400 as starting point
  stripe: { daily: 20, monthly: 500 }, // Payment processing - keeping existing reasonable limits
  twilio: { daily: 10, monthly: 300 }, // SMS verification - keeping existing reasonable limits
  openai: { daily: 1000, monthly: 10000 }, // User has massive OpenAI limits - 200k TPM, so this is very conservative
} as const;

export type ApiService = keyof typeof API_COSTS;

interface UsageTrackingOptions {
  service: ApiService;
  endpoint?: string;
  requestType?: string;
  tokensUsed?: number;
  skipLimitsCheck?: boolean; // For admin users or critical operations
}

/**
 * Middleware to track API usage and enforce limits
 */
export function trackApiUsage(options: UsageTrackingOptions) {
  return async (req: Request & { userId?: string }, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    if (!userId) {
      console.warn('🚨 API Usage Tracker: No user ID found, skipping usage tracking');
      return next();
    }

    try {
      // Skip limits check for certain conditions
      if (!options.skipLimitsCheck) {
        const canProceed = await checkUsageLimits(userId, options.service);
        if (!canProceed) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Daily or monthly limit exceeded for ${options.service} service. Please contact support if you need higher limits.`,
            service: options.service
          });
        }
      }

      // Track the API call
      const startTime = Date.now();
      
      // Store original methods to wrap them
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Wrap response methods to capture completion
      const trackCompletion = (success: boolean, errorMessage?: string) => {
        const responseTime = Date.now() - startTime;
        const estimatedCost = API_COSTS[options.service] || 0;
        
        // Track the usage (async, don't block response)
        Promise.all([
          logApiUsage({
            userId,
            apiService: options.service,
            endpoint: options.endpoint,
            requestType: options.requestType,
            tokensUsed: options.tokensUsed || 0,
            estimatedCost,
            responseTime,
            success,
            errorMessage,
            ipAddress,
          }),
          incrementUsageCounters(userId, options.service)
        ]).catch(error => {
          console.error('🚨 API Usage Tracker: Failed to log usage:', error);
        });
      };

      // Override res.send
      res.send = function(body: any) {
        trackCompletion(res.statusCode < 400);
        return originalSend.call(this, body);
      };

      // Override res.json
      res.json = function(body: any) {
        const isError = res.statusCode >= 400;
        trackCompletion(!isError, isError ? JSON.stringify(body) : undefined);
        return originalJson.call(this, body);
      };

      next();

    } catch (error) {
      console.error('🚨 API Usage Tracker: Error in middleware:', error);
      next(); // Don't block the request
    }
  };
}

/**
 * Check if user has exceeded their usage limits
 */
async function checkUsageLimits(userId: string, service: ApiService): Promise<boolean> {
  try {
    // Get or create user limits for this service
    let userLimits = await db
      .select()
      .from(apiUsageLimits)
      .where(and(
        eq(apiUsageLimits.userId, userId),
        eq(apiUsageLimits.apiService, service)
      ))
      .limit(1);

    if (userLimits.length === 0) {
      // Create default limits for new user/service combination
      await createDefaultLimits(userId, service);
      return true; // Allow the first request
    }

    const limits = userLimits[0];

    // Check if user is manually blocked
    if (limits.isBlocked) {
      console.log(`🚫 User ${userId} is blocked for ${service}: ${limits.blockReason}`);
      return false;
    }

    // Reset counters if needed
    await resetCountersIfNeeded(limits);

    // Refresh limits after potential reset
    userLimits = await db
      .select()
      .from(apiUsageLimits)
      .where(and(
        eq(apiUsageLimits.userId, userId),
        eq(apiUsageLimits.apiService, service)
      ))
      .limit(1);

    const refreshedLimits = userLimits[0];

    // Check daily limit
    if (refreshedLimits.dailyUsage >= refreshedLimits.dailyLimit) {
      console.log(`📊 Daily limit exceeded for user ${userId}, service ${service}: ${refreshedLimits.dailyUsage}/${refreshedLimits.dailyLimit}`);
      return false;
    }

    // Check monthly limit
    if (refreshedLimits.monthlyUsage >= refreshedLimits.monthlyLimit) {
      console.log(`📊 Monthly limit exceeded for user ${userId}, service ${service}: ${refreshedLimits.monthlyUsage}/${refreshedLimits.monthlyLimit}`);
      return false;
    }

    return true;

  } catch (error) {
    console.error('🚨 Error checking usage limits:', error);
    return true; // Allow request if we can't check limits
  }
}

/**
 * Create default limits for a new user/service combination
 */
async function createDefaultLimits(userId: string, service: ApiService): Promise<void> {
  const defaults = DEFAULT_LIMITS[service];
  
  try {
    await db.insert(apiUsageLimits).values({
      userId,
      apiService: service,
      dailyLimit: defaults.daily,
      monthlyLimit: defaults.monthly,
      dailyUsage: 0,
      monthlyUsage: 0,
      lastResetDaily: new Date(),
      lastResetMonthly: new Date(),
      isBlocked: false,
    });

    console.log(`✅ Created default limits for user ${userId}, service ${service}: ${defaults.daily}/day, ${defaults.monthly}/month`);
  } catch (error) {
    // Ignore duplicate key errors (race condition)
    if (!error.message?.includes('duplicate key')) {
      throw error;
    }
  }
}

/**
 * Reset daily/monthly counters if time periods have passed
 */
async function resetCountersIfNeeded(limits: any): Promise<void> {
  const now = new Date();
  const resetDaily = new Date(limits.lastResetDaily);
  const resetMonthly = new Date(limits.lastResetMonthly);
  
  let needsUpdate = false;
  const updates: any = {};

  // Reset daily counter if it's a new day
  if (now.getDate() !== resetDaily.getDate() || 
      now.getMonth() !== resetDaily.getMonth() || 
      now.getFullYear() !== resetDaily.getFullYear()) {
    updates.dailyUsage = 0;
    updates.lastResetDaily = now;
    needsUpdate = true;
    console.log(`🔄 Resetting daily counter for user ${limits.userId}, service ${limits.apiService}`);
  }

  // Reset monthly counter if it's a new month
  if (now.getMonth() !== resetMonthly.getMonth() || 
      now.getFullYear() !== resetMonthly.getFullYear()) {
    updates.monthlyUsage = 0;
    updates.lastResetMonthly = now;
    needsUpdate = true;
    console.log(`🔄 Resetting monthly counter for user ${limits.userId}, service ${limits.apiService}`);
  }

  if (needsUpdate) {
    updates.updatedAt = now;
    await db
      .update(apiUsageLimits)
      .set(updates)
      .where(eq(apiUsageLimits.id, limits.id));
  }
}

/**
 * Log the API usage details
 */
async function logApiUsage(data: {
  userId: string;
  apiService: string;
  endpoint?: string;
  requestType?: string;
  tokensUsed: number;
  estimatedCost: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.insert(apiUsageTracking).values({
      userId: data.userId,
      apiService: data.apiService,
      endpoint: data.endpoint,
      requestType: data.requestType,
      tokensUsed: data.tokensUsed,
      estimatedCost: data.estimatedCost.toString(),
      responseTime: data.responseTime,
      success: data.success,
      errorMessage: data.errorMessage,
      ipAddress: data.ipAddress,
    });

    console.log(`📊 Logged API usage: ${data.userId} -> ${data.apiService} (${data.responseTime}ms, $${data.estimatedCost.toFixed(6)})`);
  } catch (error) {
    console.error('🚨 Failed to log API usage:', error);
  }
}

/**
 * Increment usage counters for daily and monthly tracking
 */
async function incrementUsageCounters(userId: string, service: ApiService): Promise<void> {
  try {
    await db.execute(`
      UPDATE api_usage_limits 
      SET 
        daily_usage = daily_usage + 1,
        monthly_usage = monthly_usage + 1,
        updated_at = NOW()
      WHERE user_id = '${userId}' AND api_service = '${service}'
    `);
  } catch (error) {
    console.error('🚨 Failed to increment usage counters:', error);
  }
}

/**
 * Get user's current usage stats for a service
 */
export async function getUserUsageStats(userId: string, service: ApiService) {
  try {
    const limits = await db
      .select()
      .from(apiUsageLimits)
      .where(and(
        eq(apiUsageLimits.userId, userId),
        eq(apiUsageLimits.apiService, service)
      ))
      .limit(1);

    if (limits.length === 0) {
      return {
        dailyUsage: 0,
        dailyLimit: DEFAULT_LIMITS[service].daily,
        monthlyUsage: 0,
        monthlyLimit: DEFAULT_LIMITS[service].monthly,
        isBlocked: false,
      };
    }

    return limits[0];
  } catch (error) {
    console.error('🚨 Error getting usage stats:', error);
    return null;
  }
}

/**
 * Direct function to track API usage (for use in service files)
 */
export async function trackApiCall(
  userId: string,
  service: ApiService,
  endpoint?: string,
  tokensUsed?: number,
  responseTime?: number,
  skipLimitsCheck: boolean = false
): Promise<boolean> {
  try {
    // Check usage limits first
    if (!skipLimitsCheck) {
      const canProceed = await checkUsageLimits(userId, service);
      if (!canProceed) {
        console.log(`🚫 API usage limit exceeded for user ${userId}, service ${service}`);
        return false;
      }
    }

    // Record the API usage
    const estimatedCost = API_COSTS[service] || 0;

    await db.insert(apiUsageTracking).values({
      userId,
      apiService: service,
      endpoint: endpoint || 'unknown',
      responseTime: responseTime || null,
      tokensUsed: tokensUsed || null,
      estimatedCost: estimatedCost.toString(),
      createdAt: new Date(),
    });

    // Update usage counters
    await incrementUsageCounters(userId, service);

    console.log(`✅ Tracked API usage: user=${userId}, service=${service}, cost=$${estimatedCost.toFixed(4)}`);
    return true;

  } catch (error) {
    console.error('🚨 Failed to track API usage:', error);
    return true; // Don't block the request if tracking fails
  }
}