#!/bin/bash

# Restore complete backup to production database
echo "🚀 RESTORING COMPLETE BACKUP TO PRODUCTION"
echo "=========================================="

# Production connection details
PROD_HOST="aws-0-us-east-1.pooler.supabase.com"
PROD_PORT="5432"
PROD_USER="postgres.[PROD_PROJECT_ID]"
PROD_DB="postgres"
PROD_PASSWORD="[PROD_PASSWORD]"

# Backup file
BACKUP_FILE="db_cluster-14-09-2025@00-49-58.backup 2"

echo "📋 Backup file: $BACKUP_FILE"
echo "🎯 Target: $PROD_HOST:$PROD_PORT/$PROD_DB"
echo "👤 User: $PROD_USER"
echo ""

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found!"
    exit 1
fi

echo "📊 Backup file size: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"
echo ""

# Set password environment variable
export PGPASSWORD="$PROD_PASSWORD"

echo "🔄 Starting restore process..."
echo "⚠️  This will overwrite existing data in production!"
echo ""

# Restore using psql
psql -h "$PROD_HOST" -p "$PROD_PORT" -U "$PROD_USER" -d "$PROD_DB" -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backup restore completed successfully!"
    echo "🎉 Production database now has complete schema with all 37 tables!"
else
    echo ""
    echo "❌ Backup restore failed!"
    echo "Check the error messages above for details."
fi

# Clean up
unset PGPASSWORD

echo ""
echo "=========================================="
echo "🏁 Restore process finished"