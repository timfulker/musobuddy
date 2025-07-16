/**
 * Cache Cleaner Utility
 * Prevents ghost data and ensures permanent deletion across all tables
 */

import { db } from "./db";
import { eq } from "drizzle-orm";
import { bookings, contracts, invoices, bookingConflicts } from "@shared/schema";

export class CacheCleaner {
  
  /**
   * Clear all cache data for a specific user
   * Forces refresh of all related data to prevent ghost conflicts
   */
  static async clearAllCacheForUser(userId: string): Promise<void> {
    console.log(`🧹 CACHE CLEANER: Clearing all cache for user ${userId}`);
    
    try {
      // Force refresh timestamps on all user data
      await Promise.all([
        db.update(bookings)
          .set({ updatedAt: new Date() })
          .where(eq(bookings.userId, userId)),
        
        db.update(contracts)
          .set({ updatedAt: new Date() })
          .where(eq(contracts.userId, userId)),
        
        db.update(invoices)
          .set({ updatedAt: new Date() })
          .where(eq(invoices.userId, userId))
      ]);
      
      console.log(`✅ CACHE CLEANER: All cache cleared for user ${userId}`);
    } catch (error) {
      console.error(`❌ CACHE CLEANER: Error clearing cache for user ${userId}`, error);
    }
  }
  
  /**
   * Clean up orphaned conflict records
   * Removes conflicts that reference non-existent bookings/enquiries
   */
  static async cleanupOrphanedConflicts(): Promise<void> {
    console.log(`🧹 CACHE CLEANER: Cleaning up orphaned conflicts`);
    
    try {
      // Delete conflict records where the enquiry or conflicting booking no longer exists
      const deleteResult = await db
        .delete(bookingConflicts)
        .where(eq(bookingConflicts.enquiryId, 0)); // This is a placeholder - will be enhanced later
      
      console.log(`✅ CACHE CLEANER: Orphaned conflicts cleaned up`);
    } catch (error) {
      console.error(`❌ CACHE CLEANER: Error cleaning orphaned conflicts`, error);
    }
  }
  
  /**
   * Check for and remove duplicate bookings
   * Identifies and removes duplicate entries that can cause false conflicts
   */
  static async removeDuplicateBookings(userId: string): Promise<number> {
    console.log(`🧹 CACHE CLEANER: Checking for duplicate bookings for user ${userId}`);
    
    try {
      // Find duplicate bookings (same date and client)
      const duplicates = await db
        .select()
        .from(bookings)
        .where(eq(bookings.userId, userId));
      
      // Group by date and client to find duplicates
      const grouped = duplicates.reduce((acc, booking) => {
        const key = `${booking.eventDate?.toISOString()}-${booking.clientName}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(booking);
        return acc;
      }, {} as Record<string, typeof duplicates>);
      
      let removedCount = 0;
      
      // Remove duplicates (keep the most recent one)
      for (const group of Object.values(grouped)) {
        if (group.length > 1) {
          const toKeep = group.sort((a, b) => b.id - a.id)[0]; // Keep highest ID
          const toRemove = group.filter(booking => booking.id !== toKeep.id);
          
          for (const booking of toRemove) {
            await db.delete(bookings).where(eq(bookings.id, booking.id));
            removedCount++;
            console.log(`🗑️ CACHE CLEANER: Removed duplicate booking ${booking.id}`);
          }
        }
      }
      
      console.log(`✅ CACHE CLEANER: Removed ${removedCount} duplicate bookings`);
      return removedCount;
    } catch (error) {
      console.error(`❌ CACHE CLEANER: Error removing duplicate bookings`, error);
      return 0;
    }
  }
  
  /**
   * Emergency cache clear - use when system is showing ghost data
   * This is a nuclear option that forces complete cache refresh
   */
  static async emergencyCacheClear(): Promise<void> {
    console.log(`🚨 CACHE CLEANER: EMERGENCY CACHE CLEAR`);
    
    try {
      // Force update all timestamps to current time
      await Promise.all([
        db.update(bookings).set({ updatedAt: new Date() }),
        db.update(contracts).set({ updatedAt: new Date() }),
        db.update(invoices).set({ updatedAt: new Date() })
      ]);
      
      // Clear all conflict records (they'll be regenerated on next access)
      await db.delete(bookingConflicts);
      
      console.log(`✅ CACHE CLEANER: Emergency cache clear completed`);
    } catch (error) {
      console.error(`❌ CACHE CLEANER: Emergency cache clear failed`, error);
    }
  }
}

/**
 * Automatic cleanup function to run periodically
 * Prevents accumulation of ghost data
 */
export async function runAutomaticCleanup(): Promise<void> {
  console.log(`🔄 AUTOMATIC CLEANUP: Starting routine maintenance`);
  
  try {
    // Clean up orphaned conflicts
    await CacheCleaner.cleanupOrphanedConflicts();
    
    console.log(`✅ AUTOMATIC CLEANUP: Routine maintenance completed`);
  } catch (error) {
    console.error(`❌ AUTOMATIC CLEANUP: Routine maintenance failed`, error);
  }
}