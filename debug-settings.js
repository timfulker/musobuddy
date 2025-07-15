/**
 * Debug the settings API issue
 */
import fetch from 'node-fetch';

async function testSettingsAPI() {
  console.log('🔍 Testing settings API...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/settings', {
      method: 'GET',
      headers: {
        'Cookie': 'connect.sid=s%3AJJ4E6KJ_-hNKcbFdXSXsJZMFWCkzQrQW.rjBUNJbfRwfgaKGAhCfNnUdKgQXmRaIjDpQBJJlEGhk'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      console.error('❌ HTTP error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error body:', errorText);
    } else {
      const data = await response.json();
      console.log('✅ Settings data:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testSettingsAPI();