/**
 * Test the instrument caching functionality
 */

import fetch from 'node-fetch';

async function testCaching() {
  const baseUrl = 'http://localhost:5000'; // Adjust if needed
  
  console.log('Testing instrument caching system...');
  
  try {
    // First, test with a known instrument (should use default mapping and cache it)
    console.log('\n1. Testing with known instrument (saxophone)...');
    const response1 = await fetch(`${baseUrl}/api/suggest-gigs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instruments: ['saxophone']
      })
    });
    
    if (response1.ok) {
      const result1 = await response1.json();
      console.log('Saxophone suggestions:', result1.length, 'items');
      console.log('First few suggestions:', result1.slice(0, 3));
    } else {
      console.log('Error:', response1.status, response1.statusText);
    }
    
    // Second, test with the same instrument (should use cached mapping)
    console.log('\n2. Testing with same instrument (should use cache)...');
    const response2 = await fetch(`${baseUrl}/api/suggest-gigs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instruments: ['saxophone']
      })
    });
    
    if (response2.ok) {
      const result2 = await response2.json();
      console.log('Cached saxophone suggestions:', result2.length, 'items');
      console.log('Match previous results:', JSON.stringify(result1) === JSON.stringify(result2));
    }
    
    // Third, test with a custom instrument (should use AI if available)
    console.log('\n3. Testing with custom instrument (bagpipes)...');
    const response3 = await fetch(`${baseUrl}/api/suggest-gigs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instruments: ['bagpipes']
      })
    });
    
    if (response3.ok) {
      const result3 = await response3.json();
      console.log('Bagpipes suggestions:', result3.length, 'items');
      console.log('First few suggestions:', result3.slice(0, 3));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCaching();