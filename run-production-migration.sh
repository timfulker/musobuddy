#!/bin/bash

# Script to add the missing 'title' column to production database
# This fixes the critical issue where bookings are being rejected

echo "🚀 Adding 'title' column to production bookings table..."
echo ""
echo "⚠️  IMPORTANT: This will modify the PRODUCTION database!"
echo "Database: dknmckqaraedpimxdsqq (PRODUCTION)"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep SUPABASE_URL_PROD | xargs)
    export $(cat .env | grep SUPABASE_SERVICE_KEY_PROD | xargs)
fi

if [ -z "$SUPABASE_URL_PROD" ] || [ -z "$SUPABASE_SERVICE_KEY_PROD" ]; then
    echo "❌ Error: Missing SUPABASE_URL_PROD or SUPABASE_SERVICE_KEY_PROD in .env"
    exit 1
fi

# Extract the project ID from the URL
PROJECT_ID=$(echo $SUPABASE_URL_PROD | sed 's|https://||' | sed 's|\.supabase\.co||')

echo ""
echo "📊 Running migration on project: $PROJECT_ID"
echo ""

# You'll need to run this SQL directly in Supabase dashboard
echo "Please run the following SQL in your Supabase dashboard:"
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_ID/sql"
echo "2. Copy and paste the SQL from add-title-column-production.sql"
echo "3. Click 'Run' to execute the migration"
echo ""
echo "Or use the Supabase CLI:"
echo "npx supabase db push --db-url \"$SUPABASE_URL_PROD\""
echo ""
cat add-title-column-production.sql