export function getDatabaseUrl(): string {
  const env = process.env.NODE_ENV || 'development';
  
  // Check for explicit DATABASE_URL first (for backward compatibility)
  if (process.env.DATABASE_URL) {
    console.log('📊 Using DATABASE_URL environment variable');
    return process.env.DATABASE_URL;
  }
  
  // Environment-specific database selection
  if (env === 'production') {
    if (!process.env.DATABASE_URL_PROD) {
      throw new Error('DATABASE_URL_PROD is not set for production environment');
    }
    console.log('🚀 PRODUCTION: Using DATABASE_URL_PROD');
    console.log(`📊 Database: PROD environment → ${process.env.DATABASE_URL_PROD.split('@')[1]?.split('/')[0]}`);
    return process.env.DATABASE_URL_PROD;
  } else {
    if (!process.env.DATABASE_URL_DEV) {
      throw new Error('DATABASE_URL_DEV is not set for development environment');
    }
    console.log('🔧 DEVELOPMENT: Using DATABASE_URL_DEV');
    console.log(`📊 Database: DEV environment → ${process.env.DATABASE_URL_DEV.split('@')[1]?.split('/')[0]}`);
    return process.env.DATABASE_URL_DEV;
  }
}