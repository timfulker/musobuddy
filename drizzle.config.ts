import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
import { defineConfig } from "drizzle-kit";

// Environment detection - mirror server/core/database.ts logic
const isProduction = !!process.env.REPLIT_DEPLOYMENT;
const isDevelopment = !isProduction;

// Construct PostgreSQL connection string from Supabase credentials using Transaction Pooler
function buildSupabaseConnectionString(supabaseUrl: string, dbPassword: string): string {
  const projectMatch = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!projectMatch) {
    throw new Error('Invalid Supabase URL format');
  }
  const projectId = projectMatch[1];
  return `postgresql://postgres:${dbPassword}@db.${projectId}.supabase.co:6543/postgres?sslmode=require`;
}

// Environment-aware database URL resolution - mirrors server/core/database.ts
let connectionString: string;

if (isDevelopment) {
  // Development: Priority - 1) SUPABASE_DB_URL_DEV, 2) Constructed, 3) DATABASE_URL fallback
  const directDbUrl = process.env.SUPABASE_DB_URL_DEV;

  if (directDbUrl) {
    connectionString = directDbUrl;
  } else {
    const supabaseUrl = process.env.SUPABASE_URL_DEV;
    const dbPassword = process.env.SUPABASE_DB_PASSWORD_DEV;

    if (supabaseUrl && dbPassword) {
      connectionString = buildSupabaseConnectionString(supabaseUrl, dbPassword);
    } else {
      connectionString = process.env.DATABASE_URL;
    }
  }
} else {
  // Production: Priority - 1) SUPABASE_DB_URL_PROD, 2) Constructed, 3) Error
  const directDbUrl = process.env.SUPABASE_DB_URL_PROD;

  if (directDbUrl) {
    connectionString = directDbUrl;
  } else {
    const supabaseUrl = process.env.SUPABASE_URL_PROD;
    const dbPassword = process.env.SUPABASE_DB_PASSWORD_PROD;

    if (supabaseUrl && dbPassword) {
      connectionString = buildSupabaseConnectionString(supabaseUrl, dbPassword);
    } else {
      throw new Error('SUPABASE_URL_PROD and SUPABASE_DB_PASSWORD_PROD are required for production');
    }
  }
}

if (!connectionString) {
  throw new Error("Database connection string could not be resolved");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});