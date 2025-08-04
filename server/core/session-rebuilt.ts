// COMPLETELY REBUILT SESSION SYSTEM
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { ENV } from './environment.js';

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

  const sessionMiddleware = session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
      // Add session restoration options
      touchAfter: 24 * 3600, // Touch session after 24 hours
    }),
    secret: process.env.SESSION_SECRET || 'musobuddy-session-secret',
    resave: true, // Force session resave to prevent data loss
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    name: 'musobuddy.sid',
    cookie: {
      secure: ENV.sessionSecure,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax', // Use lax for both dev and production
      // Remove domain restriction to fix cross-context issues
    },
  });

  // Add session restoration middleware
  return (req: any, res: any, next: any) => {
    sessionMiddleware(req, res, (err: any) => {
      if (err) {
        console.error('❌ Session middleware error:', err);
        return next(err);
      }

      // If session exists but userId is missing, try to restore it
      if (req.session && !req.session.userId && req.session.passport?.user) {
        console.log('🔄 Attempting to restore session userId from passport data');
        req.session.userId = req.session.passport.user;
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error('❌ Failed to save restored session:', saveErr);
          } else {
            console.log('✅ Session userId restored successfully');
          }
        });
      }

      next();
    });
  };
}