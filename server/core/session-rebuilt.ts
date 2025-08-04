// FIXED SESSION CONFIGURATION - server/core/session-rebuilt.ts
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { ENV } from './environment.js';

const PgSession = connectPgSimple(session);

/**
 * FIXED SESSION CONFIGURATION
 * Addresses userId persistence and cookie transmission issues
 */
export function createSessionMiddleware() {
  console.log('🔧 Creating FIXED session middleware with config:', {
    secure: ENV.sessionSecure,
    environment: ENV.isProduction ? 'production' : 'development',
    sessionSecure: ENV.sessionSecure,
    nodeEnv: process.env.NODE_ENV,
    replitDeployment: process.env.REPLIT_DEPLOYMENT
  });

  // CRITICAL FIX: Force secure to false in development to ensure cookie transmission
  const isSecure = ENV.isProduction && ENV.sessionSecure;
  
  console.log('🔧 Session cookie secure setting:', isSecure);

  const sessionMiddleware = session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
      touchAfter: 24 * 3600,
    }),
    secret: process.env.SESSION_SECRET || 'musobuddy-session-secret',
    resave: false, // CHANGED: Don't force resave on every request
    saveUninitialized: false,
    rolling: true,
    name: 'musobuddy.sid',
    cookie: {
      secure: isSecure, // FIXED: Only secure in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      // REMOVED: No domain restriction to avoid cross-context issues
    },
  });

  // Enhanced session restoration with better logging
  return (req: any, res: any, next: any) => {
    sessionMiddleware(req, res, (err: any) => {
      if (err) {
        console.error('❌ Session middleware error:', err);
        return next(err);
      }

      // Log session state for debugging
      console.log('🔍 Session state:', {
        sessionId: req.sessionID,
        hasSession: !!req.session,
        userId: req.session?.userId,
        email: req.session?.email,
        url: req.url
      });

      // REMOVED: Passport restoration logic (not used in this app)
      
      next();
    });
  };
}