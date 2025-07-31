#!/usr/bin/env node

// Mailgun Delivery Log Checker
// Run with: node check-mailgun-logs.js

import formData from 'form-data';
import Mailgun from 'mailgun.js';

async function checkRecentDeliveries() {
  console.log('📧 Checking Mailgun delivery logs...\n');
  
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = 'mg.musobuddy.com';
  
  if (!apiKey) {
    console.log('❌ MAILGUN_API_KEY not found');
    return;
  }
  
  try {
    const mg = new Mailgun(formData);
    const mailgun = mg.client({
      username: 'api',
      key: apiKey,
      url: 'https://api.eu.mailgun.net'
    });
    
    // Check recent events (last 24 hours)
    const events = await mailgun.events.get(domain, {
      limit: 50,
      begin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });
    
    console.log(`📊 Found ${events.items.length} recent email events:\n`);
    
    // Categorize events
    const eventTypes = {};
    const recentEmails = new Map();
    
    events.items.forEach(event => {
      eventTypes[event.event] = (eventTypes[event.event] || 0) + 1;
      
      if (event.message && event.message.headers) {
        const messageId = event.message.headers['message-id'];
        if (!recentEmails.has(messageId)) {
          recentEmails.set(messageId, {
            to: event.recipient,
            subject: event.message.headers.subject,
            timestamp: event.timestamp,
            events: []
          });
        }
        recentEmails.get(messageId).events.push({
          type: event.event,
          timestamp: event.timestamp,
          description: event.description || ''
        });
      }
    });
    
    // Show event summary
    console.log('📈 Event Summary:');
    Object.entries(eventTypes).forEach(([type, count]) => {
      const status = type === 'delivered' ? '✅' : 
                    type === 'opened' ? '👁️' : 
                    type === 'clicked' ? '🖱️' : 
                    type === 'failed' ? '❌' : 
                    type === 'rejected' ? '🚫' : 
                    type === 'complained' ? '⚠️' : '📧';
      console.log(`   ${status} ${type}: ${count}`);
    });
    
    console.log('\n📋 Recent Email Details:');
    
    let emailCount = 0;
    for (const [messageId, email] of recentEmails) {
      if (emailCount >= 10) break; // Show last 10 emails
      
      console.log(`\n📧 Email ${++emailCount}:`);
      console.log(`   To: ${email.to}`);
      console.log(`   Subject: ${email.subject || 'No subject'}`);
      console.log(`   Time: ${new Date(email.timestamp * 1000).toLocaleString()}`);
      console.log(`   Events:`);
      
      email.events.forEach(event => {
        const time = new Date(event.timestamp * 1000).toLocaleTimeString();
        console.log(`     ${time} - ${event.type}${event.description ? ': ' + event.description : ''}`);
      });
    }
    
    // Check for common issues
    console.log('\n🔍 Delivery Analysis:');
    
    const deliveredCount = eventTypes.delivered || 0;
    const failedCount = eventTypes.failed || 0;
    const rejectedCount = eventTypes.rejected || 0;
    const totalSent = recentEmails.size;
    
    if (totalSent === 0) {
      console.log('⚠️  No emails found in recent logs - emails may not be sending');
    } else {
      console.log(`📤 Total emails attempted: ${totalSent}`);
      console.log(`✅ Successfully delivered: ${deliveredCount}`);
      console.log(`❌ Failed: ${failedCount}`);
      console.log(`🚫 Rejected: ${rejectedCount}`);
      
      const deliveryRate = totalSent > 0 ? ((deliveredCount / totalSent) * 100).toFixed(1) : '0';
      console.log(`📊 Delivery rate: ${deliveryRate}%`);
      
      if (deliveryRate < 50) {
        console.log('\n🚨 LOW DELIVERY RATE DETECTED');
        console.log('   Possible causes:');
        console.log('   - Domain reputation issues');
        console.log('   - SPF/DKIM configuration problems');
        console.log('   - Recipient addresses invalid');
        console.log('   - Content triggering spam filters');
      }
    }
    
  } catch (error) {
    console.log('❌ Failed to check Mailgun logs:', error.message);
    
    if (error.message.includes('401')) {
      console.log('   Check your Mailgun API key permissions');
    } else if (error.message.includes('404')) {
      console.log('   Domain may not exist or be accessible');
    }
  }
}

checkRecentDeliveries().catch(console.error);