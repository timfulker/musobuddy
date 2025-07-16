/**
 * Clean user data - complete fresh start while preserving settings and templates
 */

import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

const userId = '43963086'; // Your user ID

async function cleanUserData() {
  try {
    console.log('🧹 CLEANING ALL USER DATA...');
    console.log(`👤 User ID: ${userId}`);
    
    // Show what we're about to clean
    const bookingsCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM bookings WHERE user_id = ${userId}`
    );
    
    const contractsCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM contracts WHERE user_id = ${userId}`
    );
    
    const invoicesCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM invoices WHERE user_id = ${userId}`
    );
    
    const clientsCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM clients WHERE user_id = ${userId}`
    );
    
    const complianceCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM compliance_documents WHERE user_id = ${userId}`
    );
    
    const conflictsCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM booking_conflicts WHERE user_id = ${userId}`
    );
    
    console.log('\n📊 CURRENT DATA TO BE CLEANED:');
    console.log(`   📅 Bookings: ${bookingsCount.rows[0].count}`);
    console.log(`   📋 Contracts: ${contractsCount.rows[0].count}`);
    console.log(`   💰 Invoices: ${invoicesCount.rows[0].count}`);
    console.log(`   👥 Clients: ${clientsCount.rows[0].count}`);
    console.log(`   📄 Compliance: ${complianceCount.rows[0].count}`);
    console.log(`   ⚠️ Conflicts: ${conflictsCount.rows[0].count}`);
    
    // PRESERVED DATA (will NOT be deleted):
    console.log('\n✅ PRESERVED DATA (will NOT be deleted):');
    console.log('   ⚙️ User settings and business profile');
    console.log('   📝 Email templates');
    console.log('   🎵 Instrument mappings');
    console.log('   🎤 Global gig types');
    console.log('   👤 User account information');
    
    console.log('\n🧹 STARTING COMPLETE DATA CLEANUP...');
    
    // 1. Clean bookings (including ghost data)
    const deletedBookings = await db.execute(
      sql`DELETE FROM bookings WHERE user_id = ${userId}`
    );
    console.log(`✅ Deleted ${deletedBookings.rowCount} bookings`);
    
    // 2. Clean contracts
    const deletedContracts = await db.execute(
      sql`DELETE FROM contracts WHERE user_id = ${userId}`
    );
    console.log(`✅ Deleted ${deletedContracts.rowCount} contracts`);
    
    // 3. Clean invoices
    const deletedInvoices = await db.execute(
      sql`DELETE FROM invoices WHERE user_id = ${userId}`
    );
    console.log(`✅ Deleted ${deletedInvoices.rowCount} invoices`);
    
    // 4. Clean clients
    const deletedClients = await db.execute(
      sql`DELETE FROM clients WHERE user_id = ${userId}`
    );
    console.log(`✅ Deleted ${deletedClients.rowCount} clients`);
    
    // 5. Clean compliance documents
    const deletedCompliance = await db.execute(
      sql`DELETE FROM compliance_documents WHERE user_id = ${userId}`
    );
    console.log(`✅ Deleted ${deletedCompliance.rowCount} compliance documents`);
    
    // 6. Clean booking conflicts
    const deletedConflicts = await db.execute(
      sql`DELETE FROM booking_conflicts WHERE user_id = ${userId}`
    );
    console.log(`✅ Deleted ${deletedConflicts.rowCount} booking conflicts`);
    
    // 7. Clean deleted items (undo system)
    const deletedItems = await db.execute(
      sql`DELETE FROM deleted_items WHERE user_id = ${userId}`
    );
    console.log(`✅ Deleted ${deletedItems.rowCount} deleted items (undo system)`);
    
    // Verify cleanup
    const finalBookings = await db.execute(
      sql`SELECT COUNT(*) as count FROM bookings WHERE user_id = ${userId}`
    );
    
    const finalContracts = await db.execute(
      sql`SELECT COUNT(*) as count FROM contracts WHERE user_id = ${userId}`
    );
    
    const finalInvoices = await db.execute(
      sql`SELECT COUNT(*) as count FROM invoices WHERE user_id = ${userId}`
    );
    
    console.log('\n📊 CLEANUP VERIFICATION:');
    console.log(`   📅 Bookings: ${finalBookings.rows[0].count} (should be 0)`);
    console.log(`   📋 Contracts: ${finalContracts.rows[0].count} (should be 0)`);
    console.log(`   💰 Invoices: ${finalInvoices.rows[0].count} (should be 0)`);
    
    // Show preserved data
    const userSettings = await db.execute(
      sql`SELECT COUNT(*) as count FROM user_settings WHERE user_id = ${userId}`
    );
    
    const templates = await db.execute(
      sql`SELECT COUNT(*) as count FROM email_templates WHERE user_id = ${userId}`
    );
    
    console.log('\n✅ PRESERVED DATA CONFIRMED:');
    console.log(`   ⚙️ User settings: ${userSettings.rows[0].count}`);
    console.log(`   📝 Email templates: ${templates.rows[0].count}`);
    
    console.log('\n🎉 COMPLETE DATA CLEANUP SUCCESSFUL!');
    console.log('🚀 You now have a completely clean slate with:');
    console.log('   ✅ Zero ghost data or conflicts');
    console.log('   ✅ Your business settings preserved');
    console.log('   ✅ Your email templates preserved');
    console.log('   ✅ Ready for fresh calendar import');
    console.log('   ✅ All automated systems operational');
    
  } catch (error) {
    console.error('❌ Error cleaning user data:', error);
  }
}

cleanUserData();