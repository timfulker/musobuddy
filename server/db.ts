import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { getDatabaseUrl } from './config/database';

neonConfig.webSocketConstructor = ws;

// Get the appropriate database URL based on environment
const DATABASE_URL = getDatabaseUrl();

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, schema });
