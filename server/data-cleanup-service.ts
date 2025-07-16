/**
 * Data Cleanup Service - Handles soft deletes, undo functionality, and 4 AM cleanup
 * 
 * Features:
 * - Soft delete with undo capability (in-memory storage)
 * - 4 AM daily cleanup to permanently remove old deleted items
 * - Duplicate detection and cleanup
 * - Dead data removal to prevent bogus conflicts
 */

import { storage } from "./storage";

interface UndoItem {
  id: number;
  table: string;
  data: any;
  deletedAt: Date;
  deletedBy: string;
  description: string;
}

class DataCleanupService {
  private undoStorage: Map<string, UndoItem[]> = new Map();
  private readonly UNDO_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly CLEANUP_HOUR = 4; // 4 AM cleanup

  /**
   * Initialize cleanup service and start scheduled cleanup
   */
  async initialize() {
    console.log("🧹 Data Cleanup Service initialized");
    
    // Schedule 4 AM cleanup
    this.scheduleCleanup();
    
    // Run initial cleanup check
    await this.runMaintenanceCleanup();
  }

  /**
   * Soft delete an item with undo capability (using in-memory storage)
   */
  async softDelete(table: string, id: number, userId: string, description: string): Promise<boolean> {
    try {
      // First, get the item data before deletion
      let data = null;
      
      if (table === 'bookings') {
        data = await storage.getBooking(id, userId);
      } else if (table === 'contracts') {
        data = await storage.getContract(id, userId);
      } else if (table === 'invoices') {
        data = await storage.getInvoice(id, userId);
      }
      
      if (!data) {
        return false;
      }
      
      // Store in undo storage
      const undoItem: UndoItem = {
        id,
        table,
        data: data,
        deletedAt: new Date(),
        deletedBy: userId,
        description
      };
      
      if (!this.undoStorage.has(userId)) {
        this.undoStorage.set(userId, []);
      }
      
      this.undoStorage.get(userId)!.push(undoItem);
      
      // Actually delete the item from storage
      if (table === 'bookings') {
        await storage.deleteBooking(id, userId);
      } else if (table === 'contracts') {
        await storage.deleteContract(id, userId);
      } else if (table === 'invoices') {
        await storage.deleteInvoice(id, userId);
      }
      
      console.log(`✅ Soft deleted ${table} item ${id} for user ${userId} (can be undone)`);
      return true;
    } catch (error) {
      console.error('Error in soft delete:', error);
      return false;
    }
  }

  /**
   * Get undo items for a user
   */
  getUndoItems(userId: string): UndoItem[] {
    return this.undoStorage.get(userId) || [];
  }

  /**
   * Undo a deletion
   */
  async undoDelete(userId: string, itemId: number, table: string): Promise<boolean> {
    try {
      const userItems = this.undoStorage.get(userId);
      if (!userItems) return false;

      const itemIndex = userItems.findIndex(item => 
        item.id === itemId && item.table === table
      );

      if (itemIndex === -1) return false;

      const item = userItems[itemIndex];
      
      // Check if item is still within undo timeout
      const timeSinceDelete = Date.now() - item.deletedAt.getTime();
      if (timeSinceDelete > this.UNDO_TIMEOUT) {
        // Remove expired item
        userItems.splice(itemIndex, 1);
        return false;
      }

      // Restore the item
      let success = false;
      if (table === 'bookings') {
        success = await storage.createBooking(item.data, userId);
      } else if (table === 'contracts') {
        success = await storage.createContract(item.data, userId);
      } else if (table === 'invoices') {
        success = await storage.createInvoice(item.data, userId);
      }

      if (success) {
        // Remove from undo storage
        userItems.splice(itemIndex, 1);
        console.log(`✅ Restored ${table} item ${itemId} for user ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in undo delete:', error);
      return false;
    }
  }

  /**
   * Schedule daily cleanup at 4 AM
   */
  private scheduleCleanup() {
    const runCleanup = () => {
      const now = new Date();
      const next4AM = new Date();
      next4AM.setHours(this.CLEANUP_HOUR, 0, 0, 0);
      
      // If it's already past 4 AM today, schedule for tomorrow
      if (now.getHours() >= this.CLEANUP_HOUR) {
        next4AM.setDate(next4AM.getDate() + 1);
      }
      
      const timeUntil4AM = next4AM.getTime() - now.getTime();
      
      setTimeout(() => {
        this.run4AMCleanup();
        // Schedule next cleanup
        runCleanup();
      }, timeUntil4AM);
    };
    
    runCleanup();
  }

  /**
   * Run 4 AM cleanup - permanently remove old deleted items
   */
  private async run4AMCleanup() {
    console.log("🧹 Running 4 AM cleanup...");
    
    // Clean up expired undo items
    const now = Date.now();
    for (const [userId, items] of this.undoStorage.entries()) {
      const validItems = items.filter(item => 
        (now - item.deletedAt.getTime()) < this.UNDO_TIMEOUT
      );
      
      if (validItems.length !== items.length) {
        this.undoStorage.set(userId, validItems);
        console.log(`🧹 Cleaned up ${items.length - validItems.length} expired items for user ${userId}`);
      }
    }
    
    // Clean up dead data and duplicates
    await this.cleanupDeadData();
    await this.cleanupDuplicates();
    
    console.log("✅ 4 AM cleanup completed");
  }

  /**
   * Clean up duplicate bookings that may cause conflicts
   */
  private async cleanupDuplicates() {
    try {
      console.log("🧹 Cleaning up duplicate bookings...");
      
      // Get all users
      const allUsers = await storage.getAllUsers();
      
      for (const user of allUsers) {
        const bookings = await storage.getBookings(user.id);
        const duplicates = [];
        
        // Group bookings by date and venue
        const bookingGroups = bookings.reduce((groups, booking) => {
          const key = `${booking.eventDate}_${booking.venue}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(booking);
          return groups;
        }, {} as Record<string, any[]>);
        
        // Find duplicates
        for (const [key, groupBookings] of Object.entries(bookingGroups)) {
          if (groupBookings.length > 1) {
            // Keep the first one, mark others as duplicates
            duplicates.push(...groupBookings.slice(1));
          }
        }
        
        // Remove duplicates
        for (const duplicate of duplicates) {
          await storage.deleteBooking(duplicate.id, user.id);
          console.log(`🧹 Removed duplicate booking ${duplicate.id} for user ${user.id}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
    }
  }

  /**
   * Clean up dead data that may cause bogus conflicts
   */
  private async cleanupDeadData() {
    try {
      console.log("🧹 Cleaning up dead data...");
      
      // Get all users
      const allUsers = await storage.getAllUsers();
      
      for (const user of allUsers) {
        const bookings = await storage.getBookings(user.id);
        
        // Remove bookings with missing or invalid data
        for (const booking of bookings) {
          if (!booking.eventDate || !booking.venue || booking.venue.trim() === '') {
            await storage.deleteBooking(booking.id, user.id);
            console.log(`🧹 Removed dead booking ${booking.id} for user ${user.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up dead data:', error);
    }
  }

  /**
   * Run maintenance cleanup (can be called manually)
   */
  async runMaintenanceCleanup() {
    console.log("🧹 Running maintenance cleanup...");
    
    // Clean up expired undo items
    const now = Date.now();
    for (const [userId, items] of this.undoStorage.entries()) {
      const validItems = items.filter(item => 
        (now - item.deletedAt.getTime()) < this.UNDO_TIMEOUT
      );
      
      if (validItems.length !== items.length) {
        this.undoStorage.set(userId, validItems);
        console.log(`🧹 Cleaned up ${items.length - validItems.length} expired items for user ${userId}`);
      }
    }
    
    // Clean up dead data and duplicates
    await this.cleanupDeadData();
    await this.cleanupDuplicates();
    
    console.log("✅ Maintenance cleanup completed");
  }

  /**
   * Manually flush all data for a specific user (for testing/debugging)
   */
  async flushUserData(userId: string) {
    this.undoStorage.delete(userId);
    console.log(`🧹 Flushed all undo data for user ${userId}`);
  }
}

export const dataCleanupService = new DataCleanupService();