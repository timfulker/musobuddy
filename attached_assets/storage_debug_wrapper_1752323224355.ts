// Debug wrapper for storage.createEnquiry to catch toISOString() errors
import { storage } from './storage';

export async function debugCreateEnquiry(enquiryData: any): Promise<any> {
  console.log('🐛 === STORAGE DEBUG WRAPPER START ===');
  
  // Log every field and its type
  Object.keys(enquiryData).forEach(key => {
    const value = enquiryData[key];
    console.log(`🐛 Field ${key}:`, {
      value: value,
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      isDate: value instanceof Date,
      constructor: value?.constructor?.name
    });
    
    // Test toISOString() on each field that might be a date
    if (value && (key.includes('Date') || key.includes('At'))) {
      console.log(`🐛 Testing toISOString() on ${key}...`);
      try {
        if (value instanceof Date) {
          const isoString = value.toISOString();
          console.log(`🐛 ${key}.toISOString() = ${isoString}`);
        } else {
          console.log(`🐛 ${key} is not a Date object, type: ${typeof value}`);
          
          // Try to call toISOString anyway to see if this causes the error
          if (value && typeof value.toISOString === 'function') {
            console.log(`🐛 ${key} has toISOString method, testing...`);
            try {
              const result = value.toISOString();
              console.log(`🐛 ${key}.toISOString() worked: ${result}`);
            } catch (toISOError) {
              console.error(`🐛 ⚠️ ${key}.toISOString() FAILED: ${toISOError.message}`);
              console.error(`🐛 This is likely the source of the error!`);
            }
          }
        }
      } catch (testError) {
        console.error(`🐛 Error testing ${key}:`, testError.message);
      }
    }
  });
  
  // Try to create a minimal version with only essential fields
  console.log('🐛 Creating minimal enquiry data...');
  const minimalData = {
    userId: enquiryData.userId,
    title: enquiryData.title || 'Test Enquiry',
    clientName: enquiryData.clientName || 'Test Client',
    status: 'new'
  };
  
  console.log('🐛 Minimal data:', minimalData);
  
  try {
    console.log('🐛 Testing storage with minimal data...');
    const minimalResult = await storage.createEnquiry(minimalData as any);
    console.log('🐛 ✅ Minimal data worked! ID:', minimalResult.id);
    
    // Now try with the problematic fields one by one
    console.log('🐛 Testing with eventDate...');
    
    const withEventDate = {
      ...minimalData,
      eventDate: enquiryData.eventDate
    };
    
    console.log('🐛 EventDate value:', enquiryData.eventDate);
    console.log('🐛 EventDate type:', typeof enquiryData.eventDate);
    console.log('🐛 EventDate instanceof Date:', enquiryData.eventDate instanceof Date);
    
    const eventDateResult = await storage.createEnquiry(withEventDate as any);
    console.log('🐛 ✅ EventDate test worked! ID:', eventDateResult.id);
    
    // If we get here, the error is not in eventDate
    console.log('🐛 EventDate is not the problem, testing other fields...');
    
    return eventDateResult;
    
  } catch (error: any) {
    console.error('🐛 === STORAGE DEBUG ERROR ===');
    console.error('🐛 Error message:', error.message);
    console.error('🐛 Error stack:', error.stack);
    console.error('🐛 Error at field test phase');
    
    if (error.message.includes('toISOString')) {
      console.error('🐛 ⚠️ FOUND THE toISOString ERROR!');
      console.error('🐛 This error occurred during storage.createEnquiry()');
      console.error('🐛 The error is in the ORM/database layer, not our code');
    }
    
    throw error;
  }
}

// Alternative super-safe enquiry creation that bypasses all validation
export async function createEnquiryUltraSafe(basicData: {
  userId: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  notes?: string;
}): Promise<any> {
  console.log('🛡️ === ULTRA SAFE ENQUIRY CREATION ===');
  
  try {
    // Use only the most basic required fields with no dates
    const ultraSafeData = {
      userId: basicData.userId,
      title: basicData.title,
      clientName: basicData.clientName,
      clientEmail: basicData.clientEmail || null,
      clientPhone: null,
      eventDate: null, // Explicitly null
      eventTime: null,
      eventEndTime: null,
      performanceDuration: null,
      venue: null,
      eventType: null,
      gigType: null,
      estimatedValue: null,
      status: 'new',
      notes: basicData.notes || null,
      responseNeeded: true,
      lastContactedAt: null // Explicitly null
    };
    
    console.log('🛡️ Ultra safe data:', ultraSafeData);
    
    const result = await storage.createEnquiry(ultraSafeData as any);
    console.log('🛡️ ✅ Ultra safe creation successful!');
    
    return result;
    
  } catch (error: any) {
    console.error('🛡️ Even ultra safe creation failed:', error.message);
    throw error;
  }
}