#!/bin/bash

# Batch Migration Script: Firebase → Supabase Authentication
# Migrates all remaining route files to use Supabase authentication

echo "🚀 Starting batch migration of remaining routes to Supabase auth..."

# List of files to migrate (excluding already migrated critical ones)
FILES=(
    "/home/runner/workspace/server/routes/compliance-routes.ts"
    "/home/runner/workspace/server/routes/client-routes.ts"
    "/home/runner/workspace/server/routes/unparseable-routes.ts"
    "/home/runner/workspace/server/routes/admin-database-routes.ts"
    "/home/runner/workspace/server/routes/maps-routes.ts"
    "/home/runner/workspace/server/routes/what3words-routes.ts"
    "/home/runner/workspace/server/routes/blocked-dates-routes.ts"
    "/home/runner/workspace/server/routes/regenerate-portal.ts"
    "/home/runner/workspace/server/routes/feedback-routes.ts"
    "/home/runner/workspace/server/routes/notification-routes.ts"
    "/home/runner/workspace/server/routes/document-routes.ts"
    "/home/runner/workspace/server/routes/google-calendar-routes.ts"
    "/home/runner/workspace/server/routes/calendar-import-routes.ts"
    "/home/runner/workspace/server/routes/isolated-routes.ts"
    "/home/runner/workspace/server/routes/message-notification-routes.ts"
    "/home/runner/workspace/server/routes/onboarding-routes.ts"
    "/home/runner/workspace/server/routes/communication-routes.ts"
    "/home/runner/workspace/server/routes/collaborative-form-routes.ts"
    "/home/runner/workspace/server/routes/support-chat-routes.ts"
)

# Counters
TOTAL=${#FILES[@]}
SUCCESS=0
SKIPPED=0

echo "📋 Found $TOTAL route files to migrate"
echo ""

for FILE in "${FILES[@]}"; do
    BASENAME=$(basename "$FILE")
    echo "🔄 Processing: $BASENAME"

    # Check if file exists
    if [[ ! -f "$FILE" ]]; then
        echo "  ⚠️  File not found, skipping..."
        ((SKIPPED++))
        continue
    fi

    # Check if file still uses Firebase auth
    if ! grep -q "authenticateWithFirebase" "$FILE"; then
        echo "  ✅ Already migrated, skipping..."
        ((SKIPPED++))
        continue
    fi

    # Step 1: Update import statement
    sed -i 's/import { authenticateWithFirebase, type AuthenticatedRequest }/import { authenticateWithSupabase, type SupabaseAuthenticatedRequest }/g' "$FILE"

    # Step 2: Update all middleware references
    sed -i 's/authenticateWithFirebase, async (req: AuthenticatedRequest,/authenticateWithSupabase, async (req: SupabaseAuthenticatedRequest,/g' "$FILE"

    # Verify migration was successful
    if ! grep -q "authenticateWithFirebase" "$FILE"; then
        echo "  ✅ Successfully migrated!"
        ((SUCCESS++))
    else
        echo "  ❌ Migration may be incomplete"
    fi

    echo ""
done

# Final report
echo "🎯 Migration Summary:"
echo "  📊 Total files: $TOTAL"
echo "  ✅ Successfully migrated: $SUCCESS"
echo "  ⏭️  Already migrated/skipped: $SKIPPED"

if [[ $SUCCESS -gt 0 ]]; then
    echo ""
    echo "🎉 Batch migration completed! All route files now use Supabase authentication."
    echo "🔧 Remember to restart your development server to apply changes."
else
    echo ""
    echo "ℹ️  No files needed migration - they may already be using Supabase auth."
fi