/**
 * Scheduled Cleanup Service
 * Runs automatic maintenance at 4 AM daily to prevent ghost data accumulation
 */

import { CacheCleaner } from './cache-cleaner';
import { db } from './db';
import { eq, lt } from 'drizzle-orm';
import { deletedItems, bookings } from '@shared/schema';

export class ScheduledCleanup {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  
  /**
   * Start the scheduled cleanup service
   */
  static start(): void {
    console.log('🕐 SCHEDULED CLEANUP: Starting daily 4 AM cleanup service');
    
    // Calculate milliseconds until next 4 AM
    const now = new Date();
    const next4AM = new Date();
    next4AM.setHours(4, 0, 0, 0);
    
    // If it's already past 4 AM today, schedule for tomorrow
    if (now.getTime() > next4AM.getTime()) {
      next4AM.setDate(next4AM.getDate() + 1);
    }
    
    const msUntil4AM = next4AM.getTime() - now.getTime();
    
    console.log(`🕐 Next cleanup scheduled for: ${next4AM.toISOString()}`);
    
    // Schedule first cleanup
    setTimeout(() => {
      this.runDailyCleanup();
      
      // Then run every 24 hours
      this.cleanupInterval = setInterval(() => {
        this.runDailyCleanup();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
    }, msUntil4AM);
  }
  
  /**
   * Stop the scheduled cleanup service
   */
  static stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🕐 SCHEDULED CLEANUP: Service stopped');
    }
  }
  
  /**
   * Run the daily cleanup routine
   */
  private static async runDailyCleanup(): Promise<void> {
    console.log('🧹 SCHEDULED CLEANUP: Starting daily maintenance at 4 AM');
    
    try {
      // 1. Clean up duplicate bookings for all users
      await this.cleanupDuplicateBookings();
      
      // 2. Clean up orphaned conflict records
      await CacheCleaner.cleanupOrphanedConflicts();
      
      // 3. Clean up old deleted items (older than 30 days)
      await this.cleanupOldDeletedItems();
      
      // 4. Force cache refresh for all users
      await this.refreshAllCaches();
      
      console.log('✅ SCHEDULED CLEANUP: Daily maintenance completed successfully');
      
    } catch (error) {
      console.error('❌ SCHEDULED CLEANUP: Daily maintenance failed', error);
    }
  }
  
  /**
   * Clean up duplicate bookings across all users
   */
  private static async cleanupDuplicateBookings(): Promise<void> {
    console.log('🧹 SCHEDULED CLEANUP: Removing duplicate bookings');
    
    try {
      // Get all users who have bookings
      const users = await db
        .selectDistinct({ userId: bookings.userId })
        .from(bookings);
      
      let totalRemoved = 0;
      for (const user of users) {
        const removed = await CacheCleaner.removeDuplicateBookings(user.userId);
        totalRemoved += removed;
      }
      
      console.log(`✅ SCHEDULED CLEANUP: Removed ${totalRemoved} duplicate bookings`);
    } catch (error) {
      console.error('❌ SCHEDULED CLEANUP: Error removing duplicate bookings', error);
    }
  }
  
  /**
   * Clean up deleted items older than 30 days
   */
  private static async cleanupOldDeletedItems(): Promise<void> {
    console.log('🧹 SCHEDULED CLEANUP: Removing old deleted items (30+ days)');
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const deleteResult = await db
        .delete(deletedItems)
        .where(lt(deletedItems.deletedAt, thirtyDaysAgo));
      
      console.log(`✅ SCHEDULED CLEANUP: Removed ${deleteResult.rowCount} old deleted items`);
    } catch (error) {
      console.error('❌ SCHEDULED CLEANUP: Error removing old deleted items', error);
    }
  }
  
  /**
   * Refresh all caches to prevent ghost data
   */
  private static async refreshAllCaches(): Promise<void> {
    console.log('🧹 SCHEDULED CLEANUP: Refreshing all caches');
    
    try {
      // Update all timestamps to force cache refresh
      await Promise.all([
        db.update(bookings).set({ updatedAt: new Date() }),
        db.update(contracts).set({ updatedAt: new Date() }),
        db.update(invoices).set({ updatedAt: new Date() })
      ]);
      
      console.log('✅ SCHEDULED CLEANUP: All caches refreshed');
    } catch (error) {
      console.error('❌ SCHEDULED CLEANUP: Error refreshing caches', error);
    }
  }
}

// Auto-start the service when the module is loaded
ScheduledCleanup.start();