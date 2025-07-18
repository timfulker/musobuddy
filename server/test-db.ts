import { testDatabaseConnection } from "./db";

// Simple database test
async function runDatabaseTest() {
  console.log('🔍 Testing database connection...');
  
  try {
    const isConnected = await testDatabaseConnection();
    if (isConnected) {
      console.log('✅ Database connection successful');
      return true;
    } else {
      console.log('❌ Database connection failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Database test error:', error);
    return false;
  }
}

// Export for use in main server
export { runDatabaseTest };

// Run test if called directly
if (require.main === module) {
  runDatabaseTest().then(() => {
    process.exit(0);
  });
}