// Clean database: Delete all bookings and contracts, keep invoices
import { db } from './server/db.js';
import { bookings, contracts } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const userId = '43963086';

async function cleanDatabase() {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Delete all bookings for user
    const deletedBookings = await db.delete(bookings).where(eq(bookings.userId, userId));
    console.log(`✅ Deleted all bookings for user ${userId}`);
    
    // Delete all contracts for user  
    const deletedContracts = await db.delete(contracts).where(eq(contracts.userId, userId));
    console.log(`✅ Deleted all contracts for user ${userId}`);
    
    console.log('🎉 Database cleanup complete!');
    console.log('📋 Summary:');
    console.log('  - All bookings: DELETED');
    console.log('  - All contracts: DELETED');
    console.log('  - All invoices: PRESERVED');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  }
}

cleanDatabase();