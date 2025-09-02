// Debug AI Contract Generator
import { aiContractGenerator } from './server/core/ai-contract-generator.ts';

// Simple test to see if AI is working at all
const testContract = {
  id: 'debug-test',
  contractNumber: 'DEBUG-001',
  clientName: 'Test Client',
  eventDate: '2025-01-15',
  fee: '200',
  deposit: '50',
  venue: 'Test Venue'
};

const testSettings = {
  businessName: 'Test Business',
  businessEmail: 'test@example.com',
  themeAccentColor: '#8b5cf6',
  contractClauses: {
    deposit: true,
    power: true
  }
};

console.log('🧪 Testing AI Contract Generator...');
console.log('📋 Environment Check:');
console.log('- ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'Present' : 'MISSING');

try {
  const result = await aiContractGenerator.generateContract({
    contract: testContract,
    userSettings: testSettings,
    type: 'initial'
  });
  
  console.log('✅ AI Generation Result:');
  console.log('- Success:', result.success);
  console.log('- Reasoning:', result.reasoning);
  console.log('- HTML Length:', result.html.length, 'characters');
  console.log('- Layout Decisions:', result.layoutDecisions);
  
  if (result.html.length > 0) {
    console.log('🔍 HTML Preview:', result.html.substring(0, 200) + '...');
  }
  
} catch (error) {
  console.error('❌ AI Generation Failed:', error.message);
  console.error('📍 Error Details:', error.stack);
}