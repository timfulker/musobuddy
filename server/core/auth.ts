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

  // Authentication routes - NO SECURITY VERSION
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      // Auto-login as admin user regardless of credentials
      const user = await storage.getUserByEmail('timfulker@gmail.com');
      if (!user) {
        return res.status(500).json({ message: 'Admin user not found' });
      }
      
      req.logIn(user, (err: any) => {
        if (err) {
          return res.status(500).json({ message: 'Login error' });
        }
        
        return res.json({ success: true, user });
      });
    } catch (error) {
      return res.status(500).json({ message: 'Authentication error' });
    }
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    });
  });

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const user = await storage.getUserByEmail('timfulker@gmail.com');
      if (user) {
        res.json(user);
      } else {
        res.status(500).json({ message: 'Admin user not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user' });
    }
  });
}

export function isAuthenticated(req: any, res: any, next: any): void {
  return next();
}

export function isAdmin(req: any, res: any, next: any): void {
  return next();
}