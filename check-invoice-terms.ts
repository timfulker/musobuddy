import { db } from './server/core/database';
import { userSettings } from './shared/schema';
import { isNotNull, limit } from 'drizzle-orm';

(async () => {
  try {
    console.log('🔍 Checking invoice_terms database field...');
    
    const results = await db.select({
      userId: userSettings.userId,
      contractClauses: userSettings.contractClauses,
      customClauses: userSettings.customClauses,
      invoiceClauses: userSettings.invoiceClauses,
      customInvoiceClauses: userSettings.customInvoiceClauses
    }).from(userSettings).where(isNotNull(userSettings.userId)).limit(3);
    
    console.log('📋 Database contract/invoice fields contents:');
    results.forEach((row, index) => {
      console.log(`\n👤 User ${index + 1}: ${row.userId}`);
      console.log(`  📋 contract_clauses:`, JSON.stringify(row.contractClauses, null, 2));
      console.log(`  📝 custom_clauses:`, JSON.stringify(row.customClauses, null, 2));
      console.log(`  📄 invoice_clauses:`, JSON.stringify(row.invoiceClauses, null, 2));
      console.log(`  📝 custom_invoice_clauses:`, JSON.stringify(row.customInvoiceClauses, null, 2));
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
})();