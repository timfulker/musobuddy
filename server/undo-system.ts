/**
 * Undo System for Safe Deletion
 * Allows users to restore accidentally deleted items within 30 days
 */

import { db } from './db';
import { eq, and, gte } from 'drizzle-orm';
import { deletedItems, bookings, contracts, invoices } from '@shared/schema';
import type { InsertDeletedItem, DeletedItem } from '@shared/schema';

export class UndoSystem {
  
  /**
   * Safely delete an item by moving it to deleted_items table
   */
  static async safeDelete(
    userId: string, 
    itemType: 'booking' | 'contract' | 'invoice' | 'enquiry',
    itemId: number,
    itemData: any
  ): Promise<boolean> {
    console.log(`🗑️ SAFE DELETE: ${itemType} ${itemId} for user ${userId}`);
    
    try {
      // Step 1: Store the item in deleted_items table
      await db.insert(deletedItems).values({
        userId,
        itemType,
        itemId,
        itemData,
        canRestore: true
      });
      
      // Step 2: Delete from original table
      let deleteResult;
      switch (itemType) {
        case 'booking':
        case 'enquiry':
          deleteResult = await db
            .delete(bookings)
            .where(and(eq(bookings.id, itemId), eq(bookings.userId, userId)));
          break;
        case 'contract':
          deleteResult = await db
            .delete(contracts)
            .where(and(eq(contracts.id, itemId), eq(contracts.userId, userId)));
          break;
        case 'invoice':
          deleteResult = await db
            .delete(invoices)
            .where(and(eq(invoices.id, itemId), eq(invoices.userId, userId)));
          break;
        default:
          throw new Error(`Unknown item type: ${itemType}`);
      }
      
      if (deleteResult.rowCount > 0) {
        console.log(`✅ SAFE DELETE: ${itemType} ${itemId} moved to deleted_items`);
        return true;
      }
      
      // If deletion failed, remove from deleted_items
      await db
        .delete(deletedItems)
        .where(and(
          eq(deletedItems.userId, userId),
          eq(deletedItems.itemType, itemType),
          eq(deletedItems.itemId, itemId)
        ));
      
      return false;
    } catch (error) {
      console.error(`❌ SAFE DELETE: Error deleting ${itemType} ${itemId}`, error);
      return false;
    }
  }
  
  /**
   * Get all deleted items for a user that can be restored
   */
  static async getRestorableItems(userId: string): Promise<DeletedItem[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return await db
      .select()
      .from(deletedItems)
      .where(and(
        eq(deletedItems.userId, userId),
        eq(deletedItems.canRestore, true),
        gte(deletedItems.deletedAt, thirtyDaysAgo)
      ))
      .orderBy(deletedItems.deletedAt);
  }
  
  /**
   * Restore a deleted item
   */
  static async restoreItem(userId: string, deletedItemId: number): Promise<boolean> {
    console.log(`🔄 RESTORE: Attempting to restore item ${deletedItemId} for user ${userId}`);
    
    try {
      // Get the deleted item
      const [deletedItem] = await db
        .select()
        .from(deletedItems)
        .where(and(
          eq(deletedItems.id, deletedItemId),
          eq(deletedItems.userId, userId),
          eq(deletedItems.canRestore, true)
        ));
      
      if (!deletedItem) {
        console.log(`❌ RESTORE: Item ${deletedItemId} not found or cannot be restored`);
        return false;
      }
      
      // Check if item is still within 30-day window
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (deletedItem.deletedAt < thirtyDaysAgo) {
        console.log(`❌ RESTORE: Item ${deletedItemId} is older than 30 days`);
        return false;
      }
      
      // Restore the item to its original table
      const itemData = deletedItem.itemData as any;
      let restoreResult;
      
      switch (deletedItem.itemType) {
        case 'booking':
        case 'enquiry':
          restoreResult = await db
            .insert(bookings)
            .values({
              ...itemData,
              updatedAt: new Date() // Update timestamp to show it was restored
            });
          break;
        case 'contract':
          restoreResult = await db
            .insert(contracts)
            .values({
              ...itemData,
              updatedAt: new Date()
            });
          break;
        case 'invoice':
          restoreResult = await db
            .insert(invoices)
            .values({
              ...itemData,
              updatedAt: new Date()
            });
          break;
        default:
          throw new Error(`Unknown item type: ${deletedItem.itemType}`);
      }
      
      // Remove from deleted_items table
      await db
        .delete(deletedItems)
        .where(eq(deletedItems.id, deletedItemId));
      
      console.log(`✅ RESTORE: Successfully restored ${deletedItem.itemType} ${deletedItem.itemId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ RESTORE: Error restoring item ${deletedItemId}`, error);
      return false;
    }
  }
  
  /**
   * Permanently delete old items (called by scheduled cleanup)
   */
  static async permanentlyDeleteOldItems(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deleteResult = await db
      .delete(deletedItems)
      .where(and(
        eq(deletedItems.canRestore, true),
        // Use < instead of <= to be more conservative
        eq(deletedItems.deletedAt, thirtyDaysAgo)
      ));
    
    return deleteResult.rowCount || 0;
  }
  
  /**
   * Get summary of deleted items for user dashboard
   */
  static async getDeletedItemsSummary(userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    oldestDate: Date | null;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const items = await db
      .select()
      .from(deletedItems)
      .where(and(
        eq(deletedItems.userId, userId),
        eq(deletedItems.canRestore, true),
        gte(deletedItems.deletedAt, thirtyDaysAgo)
      ));
    
    const byType = items.reduce((acc, item) => {
      acc[item.itemType] = (acc[item.itemType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const oldestDate = items.length > 0 
      ? items.reduce((oldest, item) => 
          item.deletedAt < oldest ? item.deletedAt : oldest, 
          items[0].deletedAt
        )
      : null;
    
    return {
      total: items.length,
      byType,
      oldestDate
    };
  }
}