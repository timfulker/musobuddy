import { type Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "./storage";

export async function setupAuthentication(app: Express): Promise<void> {
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
        const user = await storage.getUserByEmail(email);
        if (!user || !user.password) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        // Update last login
        await storage.updateUserInfo(user.id, {
          lastLoginAt: new Date(),
          loginAttempts: 0
        });

        return done(null, user);
      } catch (error) {
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
      done(error);
    }
  });

  // Authentication routes - updated to match client expectations
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login error' });
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post('/api/logout', (req: any, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    });
  });

  app.get('/api/auth/user', (req: any, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
}

export function isAuthenticated(req: any, res: any, next: any): void {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
}

export function isAdmin(req: any, res: any, next: any): void {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
}