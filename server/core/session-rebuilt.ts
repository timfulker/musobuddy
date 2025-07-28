// COMPLETELY REBUILT SESSION SYSTEM
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { ENV } from './environment-rebuilt.js';

const PgSession = connectPgSimple(session);

/**
 * REBUILT SESSION CONFIGURATION
 * Simple, working session setup without complexity
 */
export function createSessionMiddleware() {
  console.log('🔧 Creating rebuilt session middleware with config:', {
    secure: ENV.sessionSecure,
    environment: ENV.isProduction ? 'production' : 'development'
  });

  return session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'musobuddy-session-secret',
    resave: false,
    saveUninitialized: false,
    name: 'musobuddy.sid',
    cookie: {
      secure: ENV.sessionSecure,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: ENV.sessionSecure ? 'none' : 'lax',
      domain: ENV.sessionDomain,
    },
  });
}