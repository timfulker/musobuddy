#!/bin/bash
echo "🏭 Starting MusoBuddy in Production Mode"
echo "Building application..."
npm run build
echo "Starting production server..."
NODE_ENV=production PORT=5000 node dist/index.js