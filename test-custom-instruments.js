/**
 * Test script to debug custom instruments persistence
 */
import { db } from './server/db.ts';
import { userSettings } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function testCustomInstruments() {
  console.log('🔍 Testing custom instruments persistence...');
  
  const testUserId = '43963086';
  
  // Get current settings
  console.log('📋 Getting current settings for user:', testUserId);
  const [currentSettings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, testUserId));
  
  console.log('📋 Current settings:', JSON.stringify(currentSettings, null, 2));
  
  // Test data with custom instruments
  const testData = {
    userId: testUserId,
    businessName: 'Test Business',
    businessEmail: 'test@test.com',
    customInstruments: ['bagpipes', 'didgeridoo', 'kazoo'],
    eventTypes: ['wedding', 'corporate'],
    gigTypes: ['solo', 'duo']
  };
  
  console.log('💾 Testing update with custom instruments:', JSON.stringify(testData, null, 2));
  
  // Update settings with custom instruments
  const [updatedSettings] = await db
    .update(userSettings)
    .set({
      ...testData,
      updatedAt: new Date()
    })
    .where(eq(userSettings.userId, testUserId))
    .returning();
    
  console.log('✅ Updated settings result:', JSON.stringify(updatedSettings, null, 2));
  
  // Fetch back to verify persistence
  const [verifySettings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, testUserId));
    
  console.log('✅ Verified settings from database:', JSON.stringify(verifySettings, null, 2));
  console.log('✅ Custom instruments persisted:', verifySettings?.customInstruments);
}

testCustomInstruments().catch(console.error);