import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { ENV } from './environment.js';

// Create session middleware
export function createSessionMiddleware() {
  const PgSession = ConnectPgSimple(session);
  
  return session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    name: 'musobuddy.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: ENV.sessionSecure,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: ENV.isProduction ? 'none' : 'lax',
      domain: undefined
    }
  });
}

export function setupSessionMiddleware(app) {
  const PgSession = ConnectPgSimple(session);
  
  const sessionMiddleware = session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    name: 'musobuddy.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: ENV.sessionSecure,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: ENV.isProduction ? 'none' : 'lax',
      domain: undefined
    }
  });
  
  app.use(sessionMiddleware);
  console.log('✅ Session middleware configured');
}

// Add session test endpoint
export function addSessionTestEndpoint(app) {
  app.get('/api/debug/session', (req, res) => {
    res.json({
      sessionId: req.sessionID,
      session: req.session,
      cookies: req.headers.cookie
    });
  });
}

// Add session cleanup endpoint
export function addSessionCleanupEndpoint(app) {
  app.post('/api/debug/clear-session', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('musobuddy.sid');
      res.json({ message: 'Session cleared' });
    });
  });
}

// Add production debug endpoint
export function addReplitProductionDebugEndpoint(app) {
  app.get('/api/debug/environment', (req, res) => {
    res.json({
      isProduction: ENV.isProduction,
      sessionSecure: ENV.sessionSecure,
      appServerUrl: ENV.appServerUrl
    });
  });
}

// Add cookie cleanup endpoint
export function addCookieCleanupEndpoint(app) {
  app.post('/api/debug/clear-cookies', (req, res) => {
    res.clearCookie('musobuddy.sid');
    res.clearCookie('connect.sid');
    res.json({ message: 'Cookies cleared' });
  });
}