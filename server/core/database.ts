import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../../shared/schema";

// Database connection setup
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1 as test`;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}