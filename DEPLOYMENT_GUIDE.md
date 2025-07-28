# MusoBuddy Deployment Guide

## Preventing Production Issues

### The Problem
Production deployments can fail when environment detection doesn't match the deployment environment. This causes 500 errors because the server expects production configuration but gets development settings.

### The Solution - Automatic Validation

1. **Environment Validation**: Server now validates that production deployments have correct environment variables set
2. **Health Check Endpoint**: `/health` shows current environment detection for debugging
3. **Production Script**: `start-production.sh` ensures proper environment setup

### Deployment Process

1. **Development Testing**: 
   - Run `npm run dev` - should show `isProduction: false`
   - Test all features work correctly

2. **Build Verification**:
   - Run `npm run build` - should complete without errors
   - Run `./start-production.sh` locally to test production mode

3. **Deployment**:
   - Click deploy button in Replit
   - Check `/health` endpoint shows `environment: "production"`
   - Verify site loads correctly

### Troubleshooting

If production deployment fails:

1. Check `/health` endpoint for environment detection
2. Verify `REPLIT_DEPLOYMENT=true` is set in production
3. Ensure build completed successfully
4. Check server logs for validation errors

### Key Files

- `server/core/environment.ts` - Single source of environment detection
- `start-production.sh` - Production startup script with validation
- `server/index.ts` - Contains production deployment validation

### Environment Variables Required

- `DATABASE_URL` - PostgreSQL connection
- `SESSION_SECRET` - Session encryption key
- `REPLIT_DEPLOYMENT=true` - For production detection (set by Replit automatically)

This system prevents the "works in development, breaks in production" issue by validating environment consistency at startup.