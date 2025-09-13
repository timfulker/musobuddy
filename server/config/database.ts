export function getDatabaseUrl(): string {
  // Check if this is a Replit deployment - when deployed, use production database
  const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';
  
  if (isDeployment && process.env.MUSOBUDDY_PROD_DB) {
    console.log('🚀 PRODUCTION: Using MUSOBUDDY_PROD_DB (deployment mode)');
    console.log(`📊 Database: PROD environment → ${process.env.MUSOBUDDY_PROD_DB.split('@')[1]?.split('/')[0]}`);
    return process.env.MUSOBUDDY_PROD_DB;
  } else if (process.env.DATABASE_URL) {
    console.log('🔧 DEVELOPMENT: Using DATABASE_URL (Replit managed)');
    console.log(`📊 Database: DEV environment → ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0]}`);
    return process.env.DATABASE_URL;
  } else {
    throw new Error('No database URL found. Please set either MUSOBUDDY_PROD_DB or DATABASE_URL');
  }
}