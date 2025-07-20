import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Check if password is in bcrypt format (starts with $2b$)
    if (stored.startsWith('$2b$')) {
      return await bcrypt.compare(supplied, stored);
    }
    
    // Handle scrypt format (with salt)
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error('❌ Invalid password format in database');
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
}

export async function setupAuth(app: Express) {
  console.log('🔐 Setting up authentication...');
  
  try {
    // PostgreSQL session store for stability
    const PostgresSessionStore = connectPg(session);
    const sessionStore = new PostgresSessionStore({
      pool: pool,
      createTableIfMissing: true,
      tableName: 'sessions'
    });
    
    // Test session store connection
    sessionStore.on('error', (error) => {
      console.error('❌ Session store error:', error);
    });
    
    console.log('✅ Session store configured');

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'musobuddy-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          } else {
            return done(null, user);
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        email,
        password: await hashPassword(password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

    // Comprehensive logout handling
    const handleLogout = (req: any, res: any, isApiCall = false) => {
      console.log(`🚪 ${isApiCall ? 'API' : 'Browser'} logout initiated`);
      
      const cleanup = () => {
        // Clear all possible cookie variations
        const cookieOptions = [
          { path: '/' },
          { path: '/', domain: req.get('host') },
          { path: '/', domain: `.${req.get('host')}` }
        ];
        
        cookieOptions.forEach(options => {
          res.clearCookie('connect.sid', options);
          res.clearCookie('session', options);
        });
        
        console.log('✅ Logout completed successfully');
      };

      req.logout((err: any) => {
        if (err) {
          console.error('❌ Logout error:', err);
          if (isApiCall) {
            return res.status(500).json({ message: "Logout failed", error: err.message });
          } else {
            return res.redirect("/login?error=logout_failed");
          }
        }
        
        if (req.session) {
          req.session.destroy((err: any) => {
            if (err) {
              console.error('❌ Session destroy error:', err);
            }
            cleanup();
            
            if (isApiCall) {
              res.json({ success: true, message: "Logged out successfully", redirectTo: "/login" });
            } else {
              res.redirect("/login?message=logged_out");
            }
          });
        } else {
          cleanup();
          
          if (isApiCall) {
            res.json({ success: true, message: "Logged out successfully", redirectTo: "/login" });
          } else {
            res.redirect("/login?message=logged_out");
          }
        }
      });
    };

    // GET /logout for direct browser navigation
    app.get("/logout", (req, res) => handleLogout(req, res, false));
    
    // POST /api/logout for AJAX calls
    app.post("/api/logout", (req, res) => handleLogout(req, res, true));
    
    // Additional logout routes to catch any variations
    app.get("/api/logout", (req, res) => handleLogout(req, res, true));
    app.delete("/api/logout", (req, res) => handleLogout(req, res, true));

    // Enhanced auth check endpoint
    app.get("/api/auth/user", (req, res) => {
      console.log('🔍 Auth check - isAuthenticated:', req.isAuthenticated(), 'user:', !!req.user);
      
      if (!req.isAuthenticated() || !req.user) {
        console.log('❌ User not authenticated');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      console.log('✅ User authenticated:', req.user.email);
      res.json(req.user);
    });

    // Auth status endpoint for debugging
    app.get("/api/auth/status", (req, res) => {
      res.json({
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        sessionID: req.sessionID,
        user: req.user ? { id: req.user.id, email: req.user.email } : null
      });
    });

  console.log('✅ Authentication setup completed successfully');
  
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    console.log('⚠️ Authentication may not work properly');
    throw error;
  }
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

export async function isAdmin(req: any, res: any, next: any) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = await storage.getUser(req.user.id);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    return next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ message: "Admin check failed" });
  }
}