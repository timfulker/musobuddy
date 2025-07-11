/**
 * Debug test for custom instruments persistence
 */
import { storage } from './server/storage.js';

async function testCustomInstrumentsSave() {
  console.log('🧪 Testing custom instruments save/load...');
  
  const userId = "43963086"; // Your test user ID
  
  try {
    // 1. Get current settings
    console.log('1. Getting current settings...');
    const currentSettings = await storage.getUserSettings(userId);
    console.log('Current settings:', JSON.stringify(currentSettings, null, 2));
    
    // 2. Test save with custom instruments
    console.log('\n2. Saving settings with custom instruments...');
    const testData = {
      userId: userId,
      customInstruments: JSON.stringify(['bagpipes', 'didgeridoo', 'triangle']),
      instrumentsPlayed: JSON.stringify(['saxophone', 'bagpipes']),
      gigTypes: JSON.stringify(['Wedding', 'Cultural Celebration'])
    };
    
    console.log('Data to save:', testData);
    
    const savedSettings = await storage.upsertUserSettings(testData);
    console.log('Saved settings:', JSON.stringify(savedSettings, null, 2));
    
    // 3. Read back the settings
    console.log('\n3. Reading back settings...');
    const readBackSettings = await storage.getUserSettings(userId);
    console.log('Read back settings:', JSON.stringify(readBackSettings, null, 2));
    
    // 4. Check if custom instruments persisted
    console.log('\n4. Checking custom instruments persistence...');
    if (readBackSettings.customInstruments) {
      const customInstruments = JSON.parse(readBackSettings.customInstruments);
      console.log('✅ Custom instruments found:', customInstruments);
      console.log('✅ Includes bagpipes:', customInstruments.includes('bagpipes'));
    } else {
      console.log('❌ No custom instruments found');
    }
    
  } catch (error) {
    console.error('❌ Error testing custom instruments:', error);
  }
}

testCustomInstrumentsSave();