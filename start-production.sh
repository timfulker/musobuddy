#!/bin/bash

# Production startup script - ensures proper environment and build
echo "🚀 Starting MusoBuddy production server..."

# Set production environment
export REPLIT_DEPLOYMENT=true
export NODE_ENV=production

# Build the application
echo "📦 Building application..."
npm run build

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo "❌ Build failed - cannot start production server"
    exit 1
fi

# Verify dist files exist
if [ ! -f "dist/index.js" ]; then
    echo "❌ Production build not found - dist/index.js missing"
    exit 1
fi

echo "✅ Build successful - starting production server"

# Start production server with proper environment
node dist/index.js