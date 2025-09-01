import { db } from './server/core/database';
import { userSettings } from './shared/schema';
import { isNotNull, limit } from 'drizzle-orm';

(async () => {
  try {
    console.log('🔍 Checking invoice_terms database field...');
    
    const results = await db.select({
      userId: userSettings.userId,
      invoiceTerms: userSettings.invoiceTerms,
      customInvoiceTerms: userSettings.customInvoiceTerms
    }).from(userSettings).where(isNotNull(userSettings.userId)).limit(3);
    
    console.log('Database invoice_terms field contents:');
    results.forEach((row, index) => {
      console.log(`\nUser ${index + 1}: ${row.userId}`);
      console.log(`  invoice_terms:`, JSON.stringify(row.invoiceTerms, null, 2));
      console.log(`  custom_invoice_terms:`, JSON.stringify(row.customInvoiceTerms, null, 2));
      console.log(`  invoice_terms type: ${typeof row.invoiceTerms}`);
      console.log(`  custom_invoice_terms type: ${typeof row.customInvoiceTerms}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
})();