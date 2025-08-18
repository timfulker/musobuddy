import { Request, Response } from 'express';
import { checkTokenUsage, getTokenUsageForUI, updateTokenUsage, estimateTokens } from '../utils/ai-token-manager';
import { verifyToken } from '../middleware/auth';

// Get current token usage status for user dashboard
export const getTokenUsageStatus = async (req: Request, res: Response) => {
  try {
    const authResult = verifyToken(req);
    if (!authResult.success) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = authResult.user.id;
    const usage = await getTokenUsageForUI(userId);
    
    res.json(usage);
  } catch (error) {
    console.error('Error fetching token usage:', error);
    res.status(500).json({ message: 'Failed to fetch token usage' });
  }
};

// Check if user can generate AI response (internal API)
export const checkAIAvailability = async (req: Request, res: Response) => {
  try {
    const authResult = verifyToken(req);
    if (!authResult.success) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = authResult.user.id;
    const { estimatedTokens } = req.body;
    
    const usage = await checkTokenUsage(userId);
    
    // Check if user has enough tokens for this request
    const canGenerate = usage.canUseAI && usage.tokensRemaining >= (estimatedTokens || 1000);
    
    res.json({
      canUseAI: canGenerate,
      tokensRemaining: usage.tokensRemaining,
      limitExceeded: usage.limitExceeded,
      shouldUseLimitedContext: usage.limitExceeded || usage.tokensRemaining < 2000,
      usage: await getTokenUsageForUI(userId)
    });
  } catch (error) {
    console.error('Error checking AI availability:', error);
    res.status(500).json({ message: 'Failed to check AI availability' });
  }
};

// Record token usage after API call
export const recordTokenUsage = async (req: Request, res: Response) => {
  try {
    const authResult = verifyToken(req);
    if (!authResult.success) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = authResult.user.id;
    const { tokensUsed, requestType } = req.body;
    
    if (!tokensUsed || tokensUsed <= 0) {
      return res.status(400).json({ message: 'Invalid token count' });
    }
    
    await updateTokenUsage(userId, tokensUsed);
    
    console.log(`📊 Recorded ${tokensUsed} tokens for ${requestType || 'AI request'} by user ${userId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording token usage:', error);
    res.status(500).json({ message: 'Failed to record token usage' });
  }
};