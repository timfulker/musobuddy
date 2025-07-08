// Simple test to verify webhook functionality
console.log('Testing email webhook with curl...');
console.log('Run this command to test:');
console.log('');
console.log('curl -X POST "https://musobuddy.replit.app/api/webhook/sendgrid" \\');
console.log('  -H "Content-Type: application/x-www-form-urlencoded" \\');
console.log('  -d "to=leads@musobuddy.com" \\');
console.log('  -d "from=test@example.com" \\');
console.log('  -d "subject=Test Enquiry" \\');
console.log('  -d "text=Test email content"');