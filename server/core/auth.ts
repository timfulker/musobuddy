import { type Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "./storage";

export async function setupAuthentication(app: Express): Promise<void> {
  console.log('🔐 Setting up authentication system...');

  // Session configuration
  const sessionConfig: any = {
    secret: process.env.SESSION_SECRET || 'musobuddy-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  };

  // Use PostgreSQL session store if available
  if (process.env.DATABASE_URL) {
    try {
      const pgSession = (await import('connect-pg-simple')).default(session);
      sessionConfig.store = new pgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'sessions',
        createTableIfMissing: true
      });
      console.log('✅ PostgreSQL session store configured');
    } catch (error) {
      console.log('⚠️ Using memory session store:', error.message);
    }
  }

  app.use(session(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport local strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email: string, password: string, done) => {
      try {
        console.log('🔑 Login attempt for:', email);

        const user = await storage.getUserByEmail(email);
        if (!user || !user.password) {
          console.log('❌ User not found or no password:', email);
          return done(null, false, { message: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          console.log('❌ Invalid password for:', email);
          return done(null, false, { message: 'Invalid credentials' });
        }

        // Update last login
        await storage.updateUserInfo(user.id, {
          lastLoginAt: new Date(),
          loginAttempts: 0
        });

        console.log('✅ Login successful for:', email);
        return done(null, user);
      } catch (error) {
        console.error('❌ Login error:', error);
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      console.error('❌ Deserialize error:', error);
      done(error);
    }
  });

  // CRITICAL: Frontend-expected authentication routes with JSON responses

  app.post('/api/login', (req: any, res, next) => {
    console.log('🔑 /api/login called with:', req.body);

    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error('❌ Login authentication error:', err);
        return res.status(500).json({ message: 'Authentication error' });
      }

      if (!user) {
        console.log('❌ Login failed:', info?.message || 'Invalid credentials');
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }

      req.logIn(user, (err: any) => {
        if (err) {
          console.error('❌ Login session error:', err);
          return res.status(500).json({ message: 'Session error' });
        }

        console.log('✅ Login successful, returning user data');
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin || false
        });
      });
    })(req, res, next);
  });

  app.post('/api/logout', (req: any, res) => {
    console.log('🚪 /api/logout called');

    if (!req.user) {
      return res.json({ success: true, message: 'Not logged in' });
    }

    const userId = req.user.id;
    req.logout((err: any) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ message: 'Logout error' });
      }

      req.session.destroy((err: any) => {
        if (err) {
          console.error('❌ Session destroy error:', err);
        }

        res.clearCookie('connect.sid');
        console.log('✅ Logout successful for user:', userId);
        res.json({ 
          success: true, 
          message: 'Logged out successfully',
          redirectTo: '/' 
        });
      });
    });
  });

  app.get('/api/auth/user', (req: any, res) => {
    console.log('👤 /api/auth/user called, authenticated:', !!req.user);

    if (req.isAuthenticated() && req.user) {
      res.json({
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        isAdmin: req.user.isAdmin || false
      });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  app.post('/api/register', async (req: any, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await storage.createUser({
        id: Date.now().toString(),
        email,
        password: hashedPassword,
        firstName: email.split('@')[0],
        isAdmin: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      req.logIn(newUser, (err: any) => {
        if (err) {
          console.error('❌ Auto-login error:', err);
          return res.status(500).json({ message: 'Registration successful but login failed' });
        }

        res.json({
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          isAdmin: newUser.isAdmin || false
        });
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  console.log('✅ Authentication system setup complete');
}

// CRITICAL: JSON-only middleware functions
export function isAuthenticated(req: any, res: any, next: any): void {
  if (req.isAuthenticated()) {
    return next();
  }
  console.log('❌ Authentication required for:', req.path);
  res.status(401).json({ message: 'Your session has expired. Please log in again to continue.' });
}

export function isAdmin(req: any, res: any, next: any): void {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  console.log('❌ Admin access required for:', req.path);
  res.status(403).json({ message: 'Admin access required' });
}