#!/bin/bash
set -euo pipefail

echo "Applying bands migration to Supabase DEV database..."

# Supabase DEV connection details (from environment)
SUPABASE_HOST="aws-1-eu-west-2.pooler.supabase.com"
SUPABASE_PORT="5432"
SUPABASE_USER="postgres.uqfwpvxxrstrixmgaqon"
SUPABASE_DB="postgres"

# Ask for password
echo "Enter Supabase DEV database password:"
read -s SUPABASE_PASSWORD
echo

# Export password for psql
export PGPASSWORD="$SUPABASE_PASSWORD"
export PGSSLMODE=require

# Connect and run migration
echo "Connecting to Supabase DEV database..."
psql -h "$SUPABASE_HOST" -p "$SUPABASE_PORT" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -f migrations/add-bands-feature.sql

echo "✅ Migration applied successfully!"