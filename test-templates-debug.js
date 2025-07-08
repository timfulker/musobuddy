/**
 * Test templates API to debug the disappearing templates issue
 */

async function testTemplatesAPI() {
  console.log('Testing Templates API...');
  
  try {
    // Test GET /api/templates
    const response = await fetch('https://musobuddy.replit.app/api/templates', {
      headers: {
        'Cookie': 'session=...' // This won't work without proper session
      }
    });
    
    console.log('Templates API Response Status:', response.status);
    
    if (response.status === 401) {
      console.log('❌ Authentication required - this is expected for API test');
      return;
    }
    
    const templates = await response.json();
    console.log('Templates from API:', templates);
    console.log('Template count:', templates.length);
    
    templates.forEach(template => {
      console.log(`- ${template.name} (ID: ${template.id}, Default: ${template.isDefault}, AutoRespond: ${template.isAutoRespond})`);
    });
    
  } catch (error) {
    console.error('Error testing templates API:', error);
  }
}

// Also test the database directly
async function testDatabase() {
  console.log('\n--- Database Check ---');
  try {
    const { db } = await import('./server/db.js');
    const { emailTemplates } = await import('./shared/schema.js');
    
    const templates = await db.select().from(emailTemplates);
    console.log('Templates in database:', templates.length);
    
    templates.forEach(template => {
      console.log(`- ${template.name} (ID: ${template.id}, Default: ${template.isDefault}, AutoRespond: ${template.isAutoRespond})`);
    });
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

testTemplatesAPI();
testDatabase();