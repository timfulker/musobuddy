import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { ENV, validateSessionConfiguration } from './environment.js';

// CRITICAL FIX: Enhanced session configuration with better error handling
export function setupSessionMiddleware(app: any) {
  console.log('🔧 Setting up session middleware...');
  
  const PgSession = ConnectPgSimple(session);

  // SAFEGUARD: Validate session configuration before starting server
  validateSessionConfiguration();

  // REPLIT PRODUCTION-SPECIFIC session configuration
  const isReplitProd = ENV.isReplitProduction;
  
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
    name: 'musobuddy.sid',
    proxy: isReplitProd, // CRITICAL: Trust Replit's proxy in production
    cookie: {
      secure: isReplitProd, // REPLIT PRODUCTION: true for HTTPS, false for dev
      httpOnly: false, // Allow frontend access
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isReplitProd ? 'none' as const : 'lax' as const, // REPLIT PRODUCTION: 'none' for cross-site
      domain: isReplitProd ? '.replit.app' : undefined // REPLIT PRODUCTION: Set domain
    }
  };

  console.log('🔧 REPLIT PRODUCTION Session configuration:', {
    environment: ENV.isProduction ? 'PRODUCTION' : 'DEVELOPMENT',
    isReplitProduction: isReplitProd,
    appServerUrl: ENV.appServerUrl,
    proxy: sessionConfig.proxy,
    secure: sessionConfig.cookie.secure,
    sameSite: sessionConfig.cookie.sameSite,
    domain: sessionConfig.cookie.domain,
    saveUninitialized: sessionConfig.saveUninitialized,
    rolling: sessionConfig.rolling,
    sessionSecret: process.env.SESSION_SECRET ? 'SET' : 'MISSING',
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'MISSING',
    replitEnvironment: ENV.replitEnvironment,
    replitDeployment: ENV.replitDeployment
  });

  // CRITICAL: Test session store connectivity
  const sessionStore = sessionConfig.store;
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