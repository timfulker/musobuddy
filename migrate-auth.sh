#!/bin/bash

echo "🔄 Migrating all routes to unified Supabase authentication..."

# Find all TypeScript files in server/routes
for file in server/routes/*.ts; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Replace import statements
    sed -i "s/import { authenticateUser.* } from '..\/middleware\/firebase-auth';/import { authenticate, type AuthenticatedRequest } from '..\/middleware\/auth';/g" "$file"
    sed -i "s/import { authenticateWithSupabase.* } from '..\/middleware\/supabase-auth';/import { authenticate, type AuthenticatedRequest } from '..\/middleware\/auth';/g" "$file"
    sed -i "s/import { verifyToken.* } from '..\/middleware\/auth';/import { authenticate, type AuthenticatedRequest } from '..\/middleware\/auth';/g" "$file"

    # Replace middleware usage
    sed -i 's/authenticateUser/authenticate/g' "$file"
    sed -i 's/authenticateWithSupabase/authenticate/g' "$file"
    sed -i 's/verifyToken/authenticate/g' "$file"

    # Replace request types
    sed -i 's/SupabaseAuthenticatedRequest/AuthenticatedRequest/g' "$file"
    sed -i 's/FirebaseAuthenticatedRequest/AuthenticatedRequest/g' "$file"
  fi
done

# Also update server/index.ts
if [ -f "server/index.ts" ]; then
  echo "Processing: server/index.ts"
  sed -i "s/import { authenticateUser.* } from '.\/middleware\/firebase-auth';/import { authenticate } from '.\/middleware\/auth';/g" "server/index.ts"
  sed -i "s/import { authenticateWithSupabase.* } from '.\/middleware\/supabase-auth';/import { authenticate } from '.\/middleware\/auth';/g" "server/index.ts"
fi

echo "✅ Migration complete!"