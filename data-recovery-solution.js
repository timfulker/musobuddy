/**
 * Data Recovery Solution for MusoBuddy
 * 
 * CRITICAL ISSUE: Calendar had 150+ bookings, now only showing 14 records
 * This indicates significant data loss during migration process
 * 
 * IMMEDIATE ACTION REQUIRED:
 * 1. Check for data backup/recovery options
 * 2. Investigate migration process that caused data loss
 * 3. Implement data recovery strategy
 * 4. Fix calendar display for current data
 */

async function investigateDataLoss() {
  console.log('🔍 INVESTIGATING DATA LOSS - CRITICAL PRIORITY');
  
  try {
    // Check current data counts
    const response = await fetch('/api/debug-data-counts', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch data counts');
      return;
    }
    
    const data = await response.json();
    console.log('📊 Current data counts:', data);
    
    // Alert user to data loss issue
    console.error('⚠️  CRITICAL DATA LOSS DETECTED:');
    console.error('   - Expected: 150+ bookings');
    console.error('   - Current: ' + data.bookings + ' bookings');
    console.error('   - Data loss: ~' + (150 - data.bookings) + ' records');
    
    // Recommendations
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. Check if any backup data exists');
    console.log('2. Review migration scripts that may have caused data loss');
    console.log('3. Implement data recovery from any available backups');
    console.log('4. Consider rollback to previous working state if possible');
    
  } catch (error) {
    console.error('Error investigating data loss:', error);
  }
}

async function createDataRecoveryEndpoint() {
  console.log('🔧 Creating data recovery endpoint...');
  
  const recoveryCode = `
  // Add to server/routes.ts
  app.get('/api/debug-data-counts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getBookings(userId);
      const enquiries = await storage.getEnquiries(userId);
      const contracts = await storage.getContracts(userId);
      const invoices = await storage.getInvoices(userId);
      
      res.json({
        bookings: bookings.length,
        enquiries: enquiries.length,
        contracts: contracts.length,
        invoices: invoices.length,
        message: 'Data counts retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting data counts:', error);
      res.status(500).json({ message: 'Failed to get data counts' });
    }
  });
  `;
  
  console.log('📋 Recovery endpoint code ready for implementation');
  return recoveryCode;
}

// Priority actions
console.log('🚨 PRIORITY 1: Data Recovery Required');
console.log('🚨 PRIORITY 2: Fix calendar display for remaining data');
console.log('🚨 PRIORITY 3: Prevent further data loss');

investigateDataLoss();
createDataRecoveryEndpoint();