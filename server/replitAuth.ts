import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Extend session on each request
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax', // Helps with session persistence
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  const claims = tokens.claims();
  user.id = claims.sub; // Store user ID in session
  user.claims = claims;
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Apply auth middleware only to non-webhook routes
  app.use((req, res, next) => {
    // Skip auth for webhook endpoints
    if (req.path.includes('/webhook/') || req.path.includes('/parse')) {
      return next();
    }
    
    // Apply session middleware for other routes
    return getSession()(req, res, (err) => {
      if (err) return next(err);
      
      passport.initialize()(req, res, (err) => {
        if (err) return next(err);
        
        passport.session()(req, res, next);
      });
    });
  });

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    const user = { id: claims.sub }; // Initialize with user ID
    updateUserSession(user, tokens);
    await upsertUser(claims);
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || req.hostname;
    console.log(`🔍 Login attempt - req.hostname: ${req.hostname}, using domain: ${domain}`);
    console.log(`🔍 Available domains: ${process.env.REPLIT_DOMAINS}`);
    console.log(`🔍 Request headers host: ${req.headers.host}`);
    
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || req.hostname;
    console.log(`Callback attempt - req.hostname: ${req.hostname}, using domain: ${domain}`);
    passport.authenticate(`replitauth:${domain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  // Get current user endpoint
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as any;
    console.log('Auth check - isAuthenticated():', req.isAuthenticated(), 'user exists:', !!user, 'expires_at:', user?.expires_at);

    if (!req.isAuthenticated() || !user?.expires_at) {
      console.log('AUTH FAILED - not authenticated or no expires_at');
      return res.status(401).json({ message: "User authentication failed - please log in again" });
    }

    // Add user ID to request for easy access
    (req as any).userId = user.id;

    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }

    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      console.log('NO REFRESH TOKEN - returning 401');
      return res.status(401).json({ message: "Your session has expired. Please log in again to continue." });
    }

    try {
      console.log('REFRESHING TOKEN...');
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      console.log('TOKEN REFRESHED - proceeding');
      return next();
    } catch (error) {
      console.log('TOKEN REFRESH FAILED:', error);
      return res.status(401).json({ message: "Your session has expired. Please log in again to continue." });
    }
  } catch (error) {
    console.log('AUTHENTICATION ERROR:', error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

// Admin check function
export const isAdmin: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as any;
    
    if (!req.isAuthenticated() || !user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Get user from database to check admin status
    const dbUser = await storage.getUser(user.id);
    if (!dbUser?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    return next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ message: "Admin check failed" });
  }
};
