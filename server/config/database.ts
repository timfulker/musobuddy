export function getDatabaseUrl(): string {
  // Single database for both development and production
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  
  const env = process.env.NODE_ENV || 'development';
  console.log(`🔧 ${env.toUpperCase()}: Using DATABASE_URL`);
  console.log(`📊 Database: ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0]}`);
  return process.env.DATABASE_URL;
}