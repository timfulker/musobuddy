#!/bin/bash

# Database Migration Script - Development to Production
# Replace the connection strings below with your actual URLs

echo "🚀 Starting Supabase database migration..."

# Set your connection URLs here (replace [PASSWORD] with actual passwords)
export SOURCE_DB_URL='postgresql://postgres.[DEV_PROJECT_ID]:[DEV_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
export TARGET_DB_URL='postgresql://postgres.[PROD_PROJECT_ID]:[PROD_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres'

echo "📤 Step 1: Creating dump from development database..."
pg_dump "$SOURCE_DB_URL" \
  --format=custom \
  --no-owner --no-privileges \
  --jobs=4 \
  --schema=public \
  --file=musobuddy_migration.dump

if [ $? -eq 0 ]; then
    echo "✅ Development database exported successfully"
else
    echo "❌ Failed to export development database"
    exit 1
fi

echo "📥 Step 2: Restoring to production database..."
pg_restore -d "$TARGET_DB_URL" \
  --no-owner --no-privileges \
  --jobs=4 \
  --clean \
  --if-exists \
  musobuddy_migration.dump

if [ $? -eq 0 ]; then
    echo "✅ Production database restored successfully"
    echo "🎉 Migration completed! Your 1100+ bookings are now in production"
else
    echo "❌ Failed to restore to production database"
    exit 1
fi

echo "🧹 Cleaning up dump file..."
rm musobuddy_migration.dump

echo "📊 Verifying migration..."
echo "Run these commands to verify:"
echo "psql \"$TARGET_DB_URL\" -c \"SELECT COUNT(*) FROM bookings;\""
echo "psql \"$TARGET_DB_URL\" -c \"SELECT COUNT(*) FROM clients;\""
echo "psql \"$TARGET_DB_URL\" -c \"SELECT COUNT(*) FROM contracts;\""
echo "psql \"$TARGET_DB_URL\" -c \"SELECT COUNT(*) FROM invoices;\""