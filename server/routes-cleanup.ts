// Emergency cleanup endpoints
import { db } from './db';
import { bookings, contracts } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Add cleanup routes to existing routes
export const cleanupRoutes = {
  
  // Clear all bookings for user
  clearBookings: async (userId: string) => {
    try {
      await db.delete(bookings).where(eq(bookings.userId, userId));
      console.log(`✅ Cleared all bookings for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to clear bookings:', error);
      return false;
    }
  },

  // Clear all contracts for user
  clearContracts: async (userId: string) => {
    try {
      await db.delete(contracts).where(eq(contracts.userId, userId));
      console.log(`✅ Cleared all contracts for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to clear contracts:', error);
      return false;
    }
  }
};