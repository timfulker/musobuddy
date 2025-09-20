// Test database selection logic
const isDevelopment = process.env.NODE_ENV !== 'production';
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('isDevelopment:', isDevelopment);
console.log('Will use:', isDevelopment ? 'DEV database (soihodadevudjohibmbw)' : 'PROD database (dknmckqaraedpimxdsqq)');