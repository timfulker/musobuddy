export function getDatabaseUrl(): string {
  // Use single DATABASE_URL for all environments
  const url = process.env.DATABASE_URL || process.env.MUSOBUDDY_PROD_DB;
  
  if (!url) {
    throw new Error('DATABASE_URL is not set. Please configure your database connection.');
  }
  
  console.log('🔧 Using single DATABASE_URL for all environments');
  console.log(`📊 Database: ${url.split('@')[1]?.split('/')[0]}`);
  return url;
}