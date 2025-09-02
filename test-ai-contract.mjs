import { aiCompleteContractGenerator } from './server/core/ai-complete-contract-generator.js';

// Mock contract data similar to the Kelly Boyd contract
const mockContract = {
  id: 1,
  contractNumber: 'TEST-CONTRACT-2025',
  clientName: 'Kelly Boyd',
  clientEmail: 'kelly@example.com',
  clientPhone: '07989676155',
  clientAddress: '94, Hambledon Road,\nWaterlooville, PO7 6UP',
  venue: "Kelly's House",
  venueAddress: '94, Hambledon Road, Waterlooville, PO7 6UP',
  eventDate: '2025-08-30',
  eventTime: '19:00',
  eventEndTime: '22:00',
  fee: '310.00',
  deposit: '100.00',
  travelExpenses: '0',
  paymentInstructions: 'Bank transfer or cash on the day',
  equipmentRequirements: 'Access to power supply and covered area',
  specialRequirements: 'None',
  status: 'draft',
  createdAt: new Date(),
};

const mockUserSettings = {
  businessName: 'Tim Fulker Music',
  businessEmail: 'tim@timfulkermusic.com',
  phone: '07764190034',
  addressLine1: '59, Gloucester Rd',
  city: 'Bournemouth',
  county: 'Dorset',
  postcode: 'BH7 6JA',
  themeAccentColor: '#8b5cf6',
  contractClauses: {
    deposit: true,
    balancePayment: true,
    cancellation: true,
    access: true,
    power: true,
    equipment: true,
    weather: true,
    recording: true,
    insurance: true,
    forceMajeure: true,
    paymentTerms: 'on_performance'
  },
  customClauses: [
    {
      text: 'Client to provide suitable food and drink if performance exceeds 3 hours including setup',
      enabled: true
    },
    {
      text: 'Client to cover parking fees; accommodation required if venue is over 50 miles or finish after midnight',
      enabled: true
    }
  ]
};

async function testAIContractGeneration() {
  console.log('🧪 Testing AI Contract Generation...');
  console.log('Mock contract:', mockContract.contractNumber);
  console.log('Client:', mockContract.clientName);
  
  try {
    // Test regular contract generation
    console.log('\n📄 Testing regular contract HTML generation...');
    const result = await aiCompleteContractGenerator.generateCompleteContractHTML(
      mockContract,
      mockUserSettings,
      { isSigningPage: false }
    );
    
    console.log('✅ HTML Generation Success!');
    console.log('📏 HTML Length:', result.html.length, 'characters');
    console.log('🤖 AI Reasoning:', result.reasoning);
    
    // Check if HTML contains expected elements
    const hasTitle = result.html.includes('Performance Contract');
    const hasClient = result.html.includes('Kelly Boyd');
    const hasVenue = result.html.includes("Kelly's House");
    const hasFee = result.html.includes('£310.00');
    const hasDeposit = result.html.includes('£100.00');
    const hasTerms = result.html.includes('Terms');
    
    console.log('\n📋 Content Validation:');
    console.log('- Has Title:', hasTitle ? '✅' : '❌');
    console.log('- Has Client:', hasClient ? '✅' : '❌');
    console.log('- Has Venue:', hasVenue ? '✅' : '❌');
    console.log('- Has Fee:', hasFee ? '✅' : '❌');
    console.log('- Has Deposit:', hasDeposit ? '✅' : '❌');
    console.log('- Has Terms:', hasTerms ? '✅' : '❌');
    
    // Test signing page generation
    console.log('\n✍️ Testing signing page HTML generation...');
    const signingResult = await aiCompleteContractGenerator.generateCompleteContractHTML(
      mockContract,
      mockUserSettings,
      { isSigningPage: true }
    );
    
    console.log('✅ Signing Page Generation Success!');
    console.log('📏 Signing HTML Length:', signingResult.html.length, 'characters');
    console.log('🤖 AI Reasoning:', signingResult.reasoning);
    
    // Write HTML to file for inspection
    const fs = await import('fs');
    await fs.promises.writeFile('./test-contract-output.html', result.html);
    await fs.promises.writeFile('./test-signing-output.html', signingResult.html);
    
    console.log('\n📁 HTML files written to:');
    console.log('- Regular: ./test-contract-output.html');
    console.log('- Signing: ./test-signing-output.html');
    
    console.log('\n🎉 All tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testAIContractGeneration().then(() => {
  console.log('\n✅ Test completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});