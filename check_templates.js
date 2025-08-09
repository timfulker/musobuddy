import { db } from './server/core/database.js';
import { emailTemplates } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkTemplates() {
  try {
    // Check templates for user 43963086
    const templates = await db.select().from(emailTemplates)
      .where(eq(emailTemplates.userId, '43963086'));
    
    console.log(`Found ${templates.length} templates for user 43963086`);
    
    if (templates.length === 0) {
      console.log('No templates found - will seed defaults now...');
      
      // Import storage to seed templates
      const { Storage } = await import('./server/core/storage.js');
      const storage = new Storage();
      
      await storage.seedDefaultEmailTemplates('43963086');
      
      // Check again
      const templatesAfter = await db.select().from(emailTemplates)
        .where(eq(emailTemplates.userId, '43963086'));
      
      console.log(`\nAfter seeding: ${templatesAfter.length} templates`);
      templatesAfter.forEach(t => {
        console.log(`- ${t.name}`);
      });
    } else {
      console.log('\nExisting templates:');
      templates.forEach(t => {
        console.log(`- ${t.name} (default: ${t.isDefault})`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTemplates();
