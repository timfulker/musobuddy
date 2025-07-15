// Test HTML generation for signed contract
const contract = {
  id: 253,
  contractNumber: '0123',
  clientName: 'Pat Ross',
  status: 'signed',
  signedAt: new Date('2025-07-15T07:26:16.181Z'),
  eventDate: new Date('2025-12-23'),
  eventTime: '7pm',
  venue: 'hotel',
  fee: '350.00',
  deposit: '100.00',
  terms: 'Standard terms and conditions...'
};

const userSettings = {
  businessName: 'Test Music Business'
};

// Simulate the key logic from generateContractSigningPageHtml
const isAlreadySigned = contract.status === 'signed';
const signedDate = isAlreadySigned && contract.signedAt ? new Date(contract.signedAt).toLocaleString('en-GB') : '';
const signedBy = isAlreadySigned ? contract.clientName : '';

console.log('🧪 Testing HTML generation for signed contract...');
console.log('📋 Contract status:', contract.status);
console.log('🔍 Is already signed:', isAlreadySigned);
console.log('📅 Signed date:', signedDate);
console.log('👤 Signed by:', signedBy);

// Show what the key HTML sections would look like
console.log('\n🎨 Generated HTML sections:');
console.log('1. Contract Status Section:');
console.log(`   display: ${isAlreadySigned ? 'block' : 'none'}`);
console.log(`   Signed Date: ${signedDate}`);
console.log(`   Signed By: ${signedBy}`);

console.log('\n2. Contract Details Section:');
console.log(`   display: ${isAlreadySigned ? 'none' : 'block'}`);

console.log('\n3. Signing Form Section:');
console.log(`   display: ${isAlreadySigned ? 'none' : 'block'}`);

console.log('\n✅ Expected behavior:');
console.log('- Contract status message: VISIBLE');
console.log('- Contract details: HIDDEN');
console.log('- Signing form: HIDDEN');
console.log('- Download button: VISIBLE');
