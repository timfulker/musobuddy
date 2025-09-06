import { db } from './server/core/database.js';
import { sql } from 'drizzle-orm';

(async () => {
  try {
    const result = await db.execute(sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'message_notifications' ORDER BY ordinal_position`);
    console.log('Columns in message_notifications table:');
    result.rows.forEach(row => console.log(row));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();