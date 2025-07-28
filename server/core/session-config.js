import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { ENV } from './environment.js';

// EXTERNAL REVIEWER'S EXACT FIX: Create session middleware
export function createSessionMiddleware() {
  const PgSession = ConnectPgSimple(session);
  
  const sessionConfig = {
    store: new PgSession({
      conString: ENV.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: ENV.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: 'connect.sid',
    proxy: ENV.isProduction, // Trust proxy in production
    cookie: {
      secure: ENV.sessionSecure,
      httpOnly: true, // Change from false to true for security
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: ENV.isProduction ? 'none' : 'lax',
      domain: undefined, // Let Express handle this
      path: '/', // Explicitly set path
    }
  };
  
  return session(sessionConfig);
}

export function setupSessionMiddleware(app) {
  console.log('📦 Registering session middleware...');
  const sessionMiddleware = createSessionMiddleware();
  app.use(sessionMiddleware);
  console.log('✅ Session middleware configured');
}

// Add session test endpoint
export function addSessionTestEndpoint(app) {
  app.get('/api/debug/session', (req, res) => {
    res.json({
      sessionId: req.sessionID,
      session: req.session,
      cookies: req.headers.cookie,
      environment: {
        isProduction: ENV.isProduction,
        sessionSecure: ENV.sessionSecure,
        appServerUrl: ENV.appServerUrl
      }
    });
  });
}

// Add session cleanup endpoint
export function addSessionCleanupEndpoint(app) {
  app.post('/api/debug/clear-session', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
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
      appServerUrl: ENV.appServerUrl,
      replitEnvironment: process.env.REPLIT_ENVIRONMENT,
      replitDeployment: process.env.REPLIT_DEPLOYMENT,
      sessionConfig: {
        name: 'connect.sid',
        proxy: ENV.isProduction,
        secure: ENV.sessionSecure,
        sameSite: ENV.isProduction ? 'none' : 'lax',
        domain: undefined,
        path: '/'
      }
    });
  });
}

// Add cookie cleanup endpoint
export function addCookieCleanupEndpoint(app) {
  app.post('/api/debug/clear-cookies', (req, res) => {
    res.clearCookie('connect.sid');
    res.clearCookie('musobuddy.sid');
    res.json({ message: 'Cookies cleared' });
  });
}