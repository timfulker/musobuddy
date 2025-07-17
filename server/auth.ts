import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  // Use memory store for now to avoid PostgreSQL connection issues
  const memoryStore = MemoryStore(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false, // Keep false to prevent unnecessary session creation
    rolling: false, // Don't reset session expiry on each request
    store: new memoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    }),
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // Add sameSite policy for better session handling
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email', // Use email as username
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log('🔥 Serializing user:', user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('🔥 Deserializing user with ID:', id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log('🔥 User not found in database for ID:', id);
        return done(null, false);
      }
      console.log('🔥 User deserialized successfully:', user.email);
      done(null, user);
    } catch (error) {
      console.error('🔥 Deserialization error:', error);
      done(null, false);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    console.log('🔥 Login attempt for:', req.body.email);
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('🔥 Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('🔥 Login failed:', info);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('🔥 Login session error:', err);
          return next(err);
        }
        console.log('🔥 Login successful for:', user.email);
        console.log('🔥 Session ID after login:', req.sessionID);
        res.status(200).json({ 
          message: "Login successful",
          user: user 
        });
      });
    })(req, res, next);
  });

  // Logout endpoints (both GET and POST for flexibility)
  const logoutHandler = (req: any, res: any, next: any) => {
    req.logout((err: any) => {
      if (err) return next(err);
      
      // Destroy the session completely
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Session destruction error:', err);
          return next(err);
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        
        // For GET requests, redirect to login page
        if (req.method === 'GET') {
          res.redirect('/login');
        } else {
          // For POST requests, send JSON response
          res.status(200).json({ message: "Logout successful" });
        }
      });
    });
  };

  app.get("/api/logout", logoutHandler);
  app.post("/api/logout", logoutHandler);

  // Get current user endpoint
  app.get("/api/auth/user", (req, res) => {
    console.log('🔥 Auth check - Session ID:', req.sessionID);
    console.log('🔥 Auth check - Session data:', req.session);
    console.log('🔥 Auth check - User:', req.user);
    console.log('🔥 Auth check - isAuthenticated():', req.isAuthenticated());
    console.log('🔥 Auth check - Passport session:', req.session?.passport);
    
    if (!req.isAuthenticated()) {
      console.log('🔥 Auth FAILED - User not authenticated');
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    console.log('🔥 Auth SUCCESS - Returning user:', req.user);
    res.json(req.user);
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export const isAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
};