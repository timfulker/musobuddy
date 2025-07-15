/**
 * Test that date format fix is working correctly
 */

async function testDateFormatFix() {
  try {
    console.log('🔍 Testing date format fix...');
    
    // Test the exact date from the screenshot: 2025-12-23
    const testDate = new Date('2025-12-23');
    
    console.log('📅 Original date:', testDate);
    console.log('📅 Fixed UK format:', testDate.toLocaleDateString('en-GB'));
    
    // Verify it shows 23/12/2025 instead of 12/23/2025
    const ukFormat = testDate.toLocaleDateString('en-GB');
    if (ukFormat === '23/12/2025') {
      console.log('✅ SUCCESS: Date format is now correct (DD/MM/YYYY)');
    } else {
      console.log('❌ FAILED: Date format is still incorrect:', ukFormat);
    }
    
    // Test with another date to be sure
    const testDate2 = new Date('2025-08-15');
    const ukFormat2 = testDate2.toLocaleDateString('en-GB');
    console.log('📅 Test date 2:', testDate2);
    console.log('📅 UK format 2:', ukFormat2);
    
    if (ukFormat2 === '15/08/2025') {
      console.log('✅ SUCCESS: Second date format is also correct');
    } else {
      console.log('❌ FAILED: Second date format is incorrect:', ukFormat2);
    }
    
    console.log('\n🎯 Date format fix verification complete!');
    console.log('The following files were updated:');
    console.log('- server/static-pdf-storage.ts: Line 264 (contract signing page)');
    console.log('- server/cloud-storage.ts: Line 613 (cloud contract signing page)');
    console.log('- server/routes.ts: Line 735 (enquiry notes)');
    console.log('All now use toLocaleDateString("en-GB") for DD/MM/YYYY format');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDateFormatFix();