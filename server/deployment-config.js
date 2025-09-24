// Deployment configuration helper
// This ensures the server starts correctly in production

// Log all environment variables for debugging
console.log('🔍 DEPLOYMENT CONFIG CHECK:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REPLIT_DEPLOYMENT:', process.env.REPLIT_DEPLOYMENT);
console.log('PORT:', process.env.PORT);
console.log('Current working directory:', process.cwd());

// Set production mode explicitly for deployment
if (!process.env.NODE_ENV && process.env.REPLIT_DEPLOYMENT) {
  process.env.NODE_ENV = 'production';
  console.log('✅ Set NODE_ENV=production for Replit deployment');
}

// Ensure REPLIT_DEPLOYMENT is set for deployment context
if (process.env.NODE_ENV === 'production' && !process.env.REPLIT_DEPLOYMENT) {
  process.env.REPLIT_DEPLOYMENT = 'true';
  console.log('✅ Set REPLIT_DEPLOYMENT=true for production');
}

export {};