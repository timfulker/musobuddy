import { Router } from 'express';
import { eq, gte, lte, and } from 'drizzle-orm';
import { db } from '../core/database.js';
import { blockedDates, type BlockedDate } from '@shared/schema.js';
import { z } from 'zod';
import { insertBlockedDateSchema } from '@shared/schema.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { safeDbCall, developmentFallbacks } from '../utils/development-helpers';

const router = Router();

// Get all blocked dates for a user
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const userBlockedDates = await safeDbCall(() => db
      .select()
      .from(blockedDates)
      .where(eq(blockedDates.userId, userId))
      .orderBy(blockedDates.startDate), [], 'getBlockedDates');
    
    console.log(`✅ Retrieved ${userBlockedDates.length} blocked dates for user ${userId}`);
    res.json(userBlockedDates);
  } catch (error) {
    console.error('❌ Failed to retrieve blocked dates:', error);
    // Return development fallback
    res.json(developmentFallbacks.blockedDates);
  }
});

// Get blocked dates for a specific date range
router.get('/range', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    const dateRangeBlockedDates = await db
      .select()
      .from(blockedDates)
      .where(
        and(
          eq(blockedDates.userId, userId),
          // Check for any overlap: blocked date range overlaps with query range
          lte(blockedDates.startDate, end),
          gte(blockedDates.endDate, start)
        )
      )
      .orderBy(blockedDates.startDate);
    
    console.log(`✅ Retrieved ${dateRangeBlockedDates.length} blocked dates in range for user ${userId}`);
    res.json(dateRangeBlockedDates);
  } catch (error) {
    console.error('❌ Failed to retrieve blocked dates for range:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve blocked dates for date range',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new blocked date
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Debug log the incoming request
    console.log('🔍 Received blocked date creation request:', {
      userId,
      body: req.body,
      bodyKeys: Object.keys(req.body),
      bodyTypes: Object.entries(req.body).map(([key, value]) => [key, typeof value])
    });

    // Validate request body
    const validatedData = insertBlockedDateSchema.parse(req.body);
    
    // Ensure end date is after start date
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    
    if (endDate < startDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    const [newBlockedDate] = await db
      .insert(blockedDates)
      .values({
        ...validatedData,
        userId,
        updatedAt: new Date(),
      })
      .returning();
    
    console.log(`✅ Created blocked date ${newBlockedDate.id} for user ${userId}: ${validatedData.title}`);
    res.status(201).json(newBlockedDate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Zod validation failed:', {
        errors: error.errors,
        requestBody: req.body,
        schemaExpected: 'startDate, endDate, title, description?, isRecurring?, recurrencePattern?, color?'
      });
      return res.status(400).json({
        message: 'Invalid blocked date data',
        errors: error.errors
      });
    }
    
    console.error('❌ Failed to create blocked date:', error);
    res.status(500).json({ 
      message: 'Failed to create blocked date',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update a blocked date
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const blockedDateId = parseInt(req.params.id);
    
    if (isNaN(blockedDateId)) {
      return res.status(400).json({ message: 'Invalid blocked date ID' });
    }
    
    // Validate request body
    const validatedData = insertBlockedDateSchema.parse(req.body);
    
    // Ensure end date is after start date
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    
    if (endDate < startDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    const [updatedBlockedDate] = await db
      .update(blockedDates)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(blockedDates.id, blockedDateId),
          eq(blockedDates.userId, userId)
        )
      )
      .returning();
    
    if (!updatedBlockedDate) {
      return res.status(404).json({ message: 'Blocked date not found' });
    }
    
    console.log(`✅ Updated blocked date ${blockedDateId} for user ${userId}`);
    res.json(updatedBlockedDate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid blocked date data',
        errors: error.errors 
      });
    }
    
    console.error('❌ Failed to update blocked date:', error);
    res.status(500).json({ 
      message: 'Failed to update blocked date',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete a blocked date
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const blockedDateId = parseInt(req.params.id);
    
    if (isNaN(blockedDateId)) {
      return res.status(400).json({ message: 'Invalid blocked date ID' });
    }
    
    const [deletedBlockedDate] = await db
      .delete(blockedDates)
      .where(
        and(
          eq(blockedDates.id, blockedDateId),
          eq(blockedDates.userId, userId)
        )
      )
      .returning();
    
    if (!deletedBlockedDate) {
      return res.status(404).json({ message: 'Blocked date not found' });
    }
    
    console.log(`✅ Deleted blocked date ${blockedDateId} for user ${userId}`);
    res.json({ message: 'Blocked date deleted successfully' });
  } catch (error) {
    console.error('❌ Failed to delete blocked date:', error);
    res.status(500).json({ 
      message: 'Failed to delete blocked date',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;