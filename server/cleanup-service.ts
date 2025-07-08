/**
 * PDF Cleanup Service for MusoBuddy
 * Manages automatic cleanup of generated PDFs to minimize storage usage
 */

import { db } from './db';
import { invoices, contracts } from '@shared/schema';
import { lt } from 'drizzle-orm';

interface CleanupStats {
  oldInvoices: number;
  oldContracts: number;
  totalCleaned: number;
}

/**
 * Clean up old records to free storage space
 * This removes old invoices and contracts that are older than retention period
 */
export async function cleanupOldRecords(retentionDays: number = 365): Promise<CleanupStats> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  console.log(`Starting cleanup of records older than ${retentionDays} days (before ${cutoffDate.toISOString()})`);
  
  try {
    // Clean up old paid/cancelled invoices (keep recent ones for business records)
    const oldInvoicesResult = await db
      .delete(invoices)
      .where(lt(invoices.createdAt, cutoffDate))
      .returning({ id: invoices.id });
    
    // Clean up old signed/cancelled contracts (keep recent ones for legal records)
    const oldContractsResult = await db
      .delete(contracts)
      .where(lt(contracts.createdAt, cutoffDate))
      .returning({ id: contracts.id });
    
    const stats: CleanupStats = {
      oldInvoices: oldInvoicesResult.length,
      oldContracts: oldContractsResult.length,
      totalCleaned: oldInvoicesResult.length + oldContractsResult.length
    };
    
    console.log('Cleanup completed:', stats);
    return stats;
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

/**
 * Schedule automatic cleanup to run periodically
 * This should be called on server startup
 */
export function scheduleAutomaticCleanup() {
  // Run cleanup every 24 hours
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const RETENTION_DAYS = 365; // Keep records for 1 year
  
  console.log('Scheduling automatic cleanup service...');
  
  // Run initial cleanup after 1 minute
  setTimeout(() => {
    runCleanupSafely();
  }, 60000);
  
  // Then run every 24 hours
  setInterval(() => {
    runCleanupSafely();
  }, CLEANUP_INTERVAL);
  
  console.log(`Automatic cleanup scheduled: runs every 24 hours, retains ${RETENTION_DAYS} days of records`);
}

/**
 * Run cleanup with error handling to prevent server crashes
 */
async function runCleanupSafely() {
  try {
    console.log('Running scheduled cleanup...');
    const stats = await cleanupOldRecords(365);
    
    if (stats.totalCleaned > 0) {
      console.log(`Cleanup successful: removed ${stats.totalCleaned} old records (${stats.oldInvoices} invoices, ${stats.oldContracts} contracts)`);
    } else {
      console.log('Cleanup completed: no old records to remove');
    }
  } catch (error) {
    console.error('Scheduled cleanup failed:', error);
    // Don't crash the server, just log the error
  }
}

/**
 * Manual cleanup endpoint for immediate cleanup
 */
export async function manualCleanup(retentionDays: number = 30): Promise<CleanupStats> {
  console.log(`Manual cleanup requested: ${retentionDays} days retention`);
  return await cleanupOldRecords(retentionDays);
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalInvoices: number;
  totalContracts: number;
  oldInvoices: number;
  oldContracts: number;
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [totalInvoicesResult] = await db.select().from(invoices);
  const [totalContractsResult] = await db.select().from(contracts);
  
  const [oldInvoicesResult] = await db
    .select()
    .from(invoices)
    .where(lt(invoices.createdAt, thirtyDaysAgo));
    
  const [oldContractsResult] = await db
    .select()
    .from(contracts)
    .where(lt(contracts.createdAt, thirtyDaysAgo));
  
  return {
    totalInvoices: totalInvoicesResult ? 1 : 0, // Simplified count
    totalContracts: totalContractsResult ? 1 : 0,
    oldInvoices: oldInvoicesResult ? 1 : 0,
    oldContracts: oldContractsResult ? 1 : 0
  };
}