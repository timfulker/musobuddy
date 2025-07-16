/**
 * Test the fixed conflict detection system
 * This will send a third enquiry for Feb 8, 2026 to test if:
 * 1. The new enquiry gets flagged as red (critical conflict)
 * 2. The conflict details reference the older enquiries properly
 */

import { neon } from '@neondatabase/serverless';

async function testConflictDetection() {
  console.log('🧪 Testing conflict detection fix...');
  
  // First, let's check current state
  const sql = neon(process.env.DATABASE_URL);
  const current = await sql`SELECT id, title, client_name, event_date, has_conflicts, conflict_count, conflict_details FROM bookings WHERE event_date = '2026-02-08' ORDER BY id`;
  
  console.log('\n📊 Current Feb 8 enquiries:');
  current.forEach(row => {
    console.log(`  #${row.id}: ${row.title} (${row.client_name}) - conflicts: ${row.has_conflicts}, count: ${row.conflict_count}`);
    if (row.conflict_details) {
      console.log(`    Details: ${row.conflict_details}`);
    }
  });
  
  // Send a test email to trigger conflict detection
  console.log('\n📧 Sending test email for Feb 8, 2026...');
  
  const formData = new URLSearchParams();
  formData.append('from', 'Sarah Johnson <sarah@example.com>');
  formData.append('subject', 'Birthday party booking');
  formData.append('body-plain', 'Hi, I need a saxophonist for my birthday party on February 8, 2026 at the Community Center. Can you help?');
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
  formData.append('token', 'test-token');
  formData.append('signature', 'test-signature');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    const result = await response.json();
    console.log('✅ Webhook response:', result);
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check the updated database
    const updated = await sql`SELECT id, title, client_name, event_date, has_conflicts, conflict_count, conflict_details FROM bookings WHERE event_date = '2026-02-08' ORDER BY id`;
    
    console.log('\n📊 Updated Feb 8 enquiries:');
    updated.forEach(row => {
      console.log(`  #${row.id}: ${row.title} (${row.client_name}) - conflicts: ${row.has_conflicts}, count: ${row.conflict_count}`);
      if (row.conflict_details) {
        console.log(`    Details: ${row.conflict_details}`);
      }
    });
    
    // Find the newest enquiry
    const newest = updated[updated.length - 1];
    console.log(`\n🔍 Analysis of newest enquiry #${newest.id}:`);
    console.log(`  Has conflicts: ${newest.has_conflicts}`);
    console.log(`  Conflict count: ${newest.conflict_count}`);
    console.log(`  Conflict details: ${newest.conflict_details}`);
    
    if (newest.has_conflicts && newest.conflict_count > 0 && newest.conflict_details) {
      console.log('✅ SUCCESS: Newest enquiry properly flagged with conflicts!');
    } else {
      console.log('❌ FAILED: Newest enquiry not properly flagged');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testConflictDetection();