import { db } from './server/core/database.js';
import { userSettings } from './shared/schema.js';

async function checkInvoiceClauses() {
  const settings = await db.select({
    userId: userSettings.userId,
    invoiceClauses: userSettings.invoiceClauses,
    customInvoiceClauses: userSettings.customInvoiceClauses,
    businessName: userSettings.businessName
  }).from(userSettings).limit(1);

  console.log('🔍 User Settings from Database:');
  console.log('=====================================');
  
  if (settings[0]) {
    console.log('User ID:', settings[0].userId);
    console.log('Business Name:', settings[0].businessName);
    console.log('\n📋 Invoice Clauses:', JSON.stringify(settings[0].invoiceClauses, null, 2));
    console.log('\n📝 Custom Invoice Clauses:', JSON.stringify(settings[0].customInvoiceClauses, null, 2));
    
    // Check if clauses exist and have content
    if (!settings[0].invoiceClauses || Object.keys(settings[0].invoiceClauses).length === 0) {
      console.log('\n⚠️  WARNING: No invoice clauses found in database!');
    }
    
    if (!settings[0].customInvoiceClauses || settings[0].customInvoiceClauses.length === 0) {
      console.log('⚠️  WARNING: No custom invoice clauses found in database!');
    }
  } else {
    console.log('❌ No user settings found in database!');
  }
  
  process.exit(0);
}

checkInvoiceClauses().catch(console.error);