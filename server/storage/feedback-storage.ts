import { db } from "../core/database";
import { feedback, users } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import type { InsertFeedback, Feedback } from "../../shared/schema";

export class FeedbackStorage {
  private db = db;

  /**
   * Create new feedback
   */
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    
    return newFeedback;
  }

  /**
   * Get all feedback (for admins) or user's own feedback
   */
  async getFeedback(userId: string, isAdmin: boolean = false): Promise<Feedback[]> {
    if (isAdmin) {
      // Admin sees all feedback with user information
      return await db
        .select({
          id: feedback.id,
          userId: feedback.userId,
          type: feedback.type,
          title: feedback.title,
          description: feedback.description,
          priority: feedback.priority,
          status: feedback.status,
          page: feedback.page,
          attachments: feedback.attachments,
          adminNotes: feedback.adminNotes,
          resolvedAt: feedback.resolvedAt,
          createdAt: feedback.createdAt,
          updatedAt: feedback.updatedAt,
          userName: users.firstName,
          userEmail: users.email,
        })
        .from(feedback)
        .leftJoin(users, eq(feedback.userId, users.id))
        .orderBy(desc(feedback.createdAt));
    } else {
      // Regular users only see their own feedback
      return await db
        .select()
        .from(feedback)
        .where(eq(feedback.userId, userId))
        .orderBy(desc(feedback.createdAt));
    }
  }

  /**
   * Update feedback status (admin only)
   */
  async updateFeedbackStatus(
    feedbackId: string, 
    status: string, 
    adminNotes?: string
  ): Promise<Feedback> {
    const updateData: Partial<Feedback> = { 
      status,
      updatedAt: new Date()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    const [updatedFeedback] = await db
      .update(feedback)
      .set(updateData)
      .where(eq(feedback.id, parseInt(feedbackId)))
      .returning();

    return updatedFeedback;
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(feedbackId: string): Promise<Feedback | null> {
    const [feedbackItem] = await db
      .select()
      .from(feedback)
      .where(eq(feedback.id, parseInt(feedbackId)));

    return feedbackItem || null;
  }

  /**
   * Delete feedback by ID (admin only)
   */
  async deleteFeedback(feedbackId: string): Promise<Feedback> {
    console.log('🗑️ Storage: Attempting to delete feedback ID:', feedbackId);
    console.log('🗑️ Storage: Parsed ID:', parseInt(feedbackId));
    
    const [deletedFeedback] = await db
      .delete(feedback)
      .where(eq(feedback.id, parseInt(feedbackId)))
      .returning();

    console.log('🗑️ Storage: Delete result:', deletedFeedback);
    
    if (!deletedFeedback) {
      throw new Error(`Feedback with ID ${feedbackId} not found or could not be deleted`);
    }

    return deletedFeedback;
  }
}

export const feedbackStorage = new FeedbackStorage();