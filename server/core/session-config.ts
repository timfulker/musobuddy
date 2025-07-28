import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { ENV } from './environment.js';

function isReplitProduction(): boolean {
  return !!(
    process.env.REPLIT_DEPLOYMENT ||
    process.env.REPLIT_ENVIRONMENT === 'production' ||
    process.env.REPLIT_DB_URL ||
    (typeof process.env.REPL_SLUG !== 'undefined' && !process.env.REPLIT_DEV_DOMAIN)
  );
}

function validateSessionConfiguration() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for session storage');
  }
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️ SESSION_SECRET not set - using default (not recommended for production)');
  }
}

// EXTERNAL REVIEWER'S EXACT FIX: Create session middleware
export function createSessionMiddleware() {
  const PgSession = ConnectPgSimple(session);
  
  const sessionConfig = {
    store: new PgSession({
      conString: ENV.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: false,
    }),
    secret: ENV.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: 'connect.sid',
    proxy: ENV.isProduction, // Trust proxy in production
    cookie: {
      secure: ENV.sessionSecure,
      httpOnly: true, // Change from false to true for security
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: ENV.isProduction ? 'none' as const : 'lax' as const,
      domain: undefined, // Let Express handle this
      path: '/', // Explicitly set path
    }
  };
  
  return session(sessionConfig);
}

// LEGACY: Enhanced session configuration with better error handling (kept for compatibility)
export function setupSessionMiddleware(app: any) {
  console.log('🔧 Setting up session middleware...');
  
  const PgSession = ConnectPgSimple(session);

  // SAFEGUARD: Validate session configuration before starting server
  validateSessionConfiguration();

  // REPLIT PRODUCTION-SPECIFIC session configuration
  const isReplitProd = isReplitProduction();
  
  const sessionConfig = {
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
      // CRITICAL: Add error handling for store
      errorLog: (err: any) => {
        console.error('❌ Session store error:', err);
      },
      // REPLIT PRODUCTION: Add connection timeout handling
      ttl: 24 * 60 * 60, // 24 hours in seconds
      pruneSessionInterval: 60 * 15 // Clean expired sessions every 15 minutes
    }),
    secret: process.env.SESSION_SECRET || 'musobuddy-session-secret-2025',
    resave: false,
    saveUninitialized: false, // Don't save empty sessions
    rolling: true, // Reset expiration on each request
    name: 'connect.sid', // FIXED: Use standard session name
    proxy: isReplitProd, // CRITICAL: Trust Replit's proxy in production
    cookie: {
      secure: isReplitProd, // REPLIT PRODUCTION: true for HTTPS, false for dev
      httpOnly: false, // Allow frontend access
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isReplitProd ? 'none' as const : 'lax' as const, // REPLIT PRODUCTION: 'none' for cross-site
      domain: undefined // CRITICAL FIX: Let browser handle domain automatically
    }
  };

  console.log('🔧 Session configuration:', {
    environment: ENV.isProduction ? 'PRODUCTION' : 'DEVELOPMENT', 
    isReplitProduction: isReplitProd,
    appServerUrl: ENV.appServerUrl,
    sessionName: sessionConfig.name,
    proxy: sessionConfig.proxy,
    secure: sessionConfig.cookie.secure,
    sameSite: sessionConfig.cookie.sameSite,
    domain: sessionConfig.cookie.domain,
    sessionSecret: process.env.SESSION_SECRET ? 'SET' : 'MISSING',
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'MISSING'
  });

  // CRITICAL: Test session store connectivity
  console.log('🔍 Testing session store connectivity...');
  
  // Apply session middleware
  app.use(session(sessionConfig));
  
  // ENHANCED: Session monitoring middleware
  app.use((req: any, res: any, next: any) => {
    const originalSave = req.session.save;
    req.session.save = function(callback?: any) {
      console.log('💾 Session save called:', {
        sessionId: req.sessionID,
        userId: req.session.userId,
        keys: Object.keys(req.session),
        timestamp: new Date().toISOString()
      });
      
      return originalSave.call(this, (err: any) => {
        if (err) {
          console.error('❌ Session save failed:', err);
        } else {
          console.log('✅ Session save successful:', req.sessionID);
        }
        if (callback) callback(err);
      });
    };
    
    next();
  });

  console.log('✅ Session middleware configured');
  return sessionConfig;
}

// CRITICAL: Session validation endpoint
export function addSessionTestEndpoint(app: any) {
  app.get('/api/debug/session-test-enhanced', (req: any, res: any) => {
    console.log('🧪 ENHANCED SESSION TEST');
    
    // Set test data
    if (!req.session.testData) {
      req.session.testData = {
        timestamp: new Date().toISOString(),
        testValue: Math.random().toString(36),
        counter: 1
      };
    } else {
      req.session.testData.counter = (req.session.testData.counter || 0) + 1;
      req.session.testData.lastAccess = new Date().toISOString();
    }

    // Force save and test
    req.session.save((err: any) => {
      if (err) {
        console.error('❌ Session test save failed:', err);
        return res.json({
          status: 'FAILED',
          error: err.message,
          sessionId: req.sessionID,
          environment: ENV.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'
        });
      }

      console.log('✅ Session test save successful');
      res.json({
        status: 'SUCCESS',
        sessionId: req.sessionID,
        sessionData: req.session.testData,
        sessionKeys: Object.keys(req.session),
        environment: ENV.isProduction ? 'PRODUCTION' : 'DEVELOPMENT',
        timestamp: new Date().toISOString()
      });
    });
  });
}

// REPLIT PRODUCTION: Specific debugging endpoint
export function addReplitProductionDebugEndpoint(app: any) {
  app.get('/api/debug/replit-production', (req: any, res: any) => {
    console.log('🚀 REPLIT PRODUCTION DEBUG CHECK');
    
    const replitEnvVars = {
      REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
      REPLIT_ENVIRONMENT: process.env.REPLIT_ENVIRONMENT,  
      REPLIT_DEV_DOMAIN: process.env.REPLIT_DEV_DOMAIN,
      REPLIT_DB_URL: process.env.REPLIT_DB_URL ? 'SET' : 'NOT_SET',
      REPL_SLUG: process.env.REPL_SLUG,
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT_SET'
    };
    
    res.json({
      status: 'REPLIT_PRODUCTION_DEBUG',
      timestamp: new Date().toISOString(),
      environment: ENV,
      replitEnvVars,
      sessionId: req.sessionID,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      userAgent: req.headers['user-agent'],
      host: req.headers.host,
      origin: req.headers.origin,
      cookies: req.headers.cookie ? 'PRESENT' : 'MISSING'
    });
  });
}

// CRITICAL: Session cleanup endpoint for testing
export function addSessionCleanupEndpoint(app: any) {
  app.post('/api/debug/clear-session-enhanced', (req: any, res: any) => {
    console.log('🧹 ENHANCED SESSION CLEANUP');
    console.log('🔍 Before clear - Session ID:', req.sessionID);
    console.log('🔍 Before clear - Session data:', req.session);
    
    // Clear all session data but keep session alive
    const sessionId = req.sessionID;
    
    // Method 1: Clear all properties except cookie
    Object.keys(req.session).forEach(key => {
      if (key !== 'cookie') {
        delete req.session[key];
      }
    });
    
    req.session.save((err: any) => {
      if (err) {
        console.error('❌ Session cleanup failed:', err);
        return res.status(500).json({ error: 'Session cleanup failed' });
      }
      
      console.log('✅ Session cleaned successfully');
      res.json({
        success: true,
        message: 'Session data cleared - session still active',
        sessionId: sessionId,
        remainingKeys: Object.keys(req.session),
        timestamp: new Date().toISOString()
      });
    });
  });
}

// CRITICAL: Cookie conflict resolution endpoint
export function addCookieCleanupEndpoint(app: any) {
  app.post('/api/debug/clear-all-cookies', (req: any, res: any) => {
    console.log('🧹 CLEARING ALL SESSION COOKIES');
    console.log('🔍 Current cookies:', req.headers.cookie);
    console.log('🔍 Session before clear:', req.session);
    
    // Destroy current session
    req.session.destroy((err: any) => {
      if (err) {
        console.error('❌ Session destruction failed:', err);
      } else {
        console.log('✅ Session destroyed successfully');
      }
      
      // Clear ALL possible session cookies
      res.clearCookie('musobuddy.sid');
      res.clearCookie('connect.sid');
      res.clearCookie('musobuddy.sid', { domain: '.replit.app' });
      res.clearCookie('connect.sid', { domain: '.replit.app' });
      res.clearCookie('musobuddy.sid', { path: '/' });
      res.clearCookie('connect.sid', { path: '/' });
      
      res.json({
        success: true,
        message: 'All session cookies cleared - ready for clean admin login',
        timestamp: new Date().toISOString(),
        instructions: 'Now try admin login again with fresh session'
      });
    });
  });
}