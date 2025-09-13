export function getDatabaseUrl(): string {
  // Check for Replit deployment or explicit NODE_ENV
  const env = process.env.REPLIT_DEPLOYMENT === '1' ? 'production' : (process.env.NODE_ENV || 'development');
  
  // Environment-specific database selection
  if (env === 'production') {
    // Use MUSOBUDDY_PROD_DB to avoid conflicts with Replit's read-only DATABASE_URL management
    if (!process.env.MUSOBUDDY_PROD_DB) {
      throw new Error('MUSOBUDDY_PROD_DB is not set for production environment');
    }
    console.log('🚀 PRODUCTION: Using MUSOBUDDY_PROD_DB');
    console.log(`📊 Database: PROD environment → ${process.env.MUSOBUDDY_PROD_DB.split('@')[1]?.split('/')[0]}`);
    return process.env.MUSOBUDDY_PROD_DB;
  } else {
    // Development: Use the original DATABASE_URL (Replit's automatic database)
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set for development environment');
    }
    console.log('🔧 DEVELOPMENT: Using DATABASE_URL (Replit managed)');
    console.log(`📊 Database: DEV environment → ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0]}`);
    return process.env.DATABASE_URL;
  }
}