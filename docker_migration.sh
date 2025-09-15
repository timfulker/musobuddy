#!/bin/bash
set -euo pipefail

echo "=== MusoBuddy Docker Migration (PostgreSQL 17) ==="
echo ""

# Get passwords
echo "Enter development Supabase password:"
read -s DEV_PASSWORD
echo ""
echo "Enter production Supabase password:"  
read -s PROD_PASSWORD
echo ""

echo "Step 1: Creating complete dump from development using PostgreSQL 17..."
docker run --rm \
  -e PGPASSWORD="$DEV_PASSWORD" \
  -e PGSSLMODE=require \
  -v "$PWD:/dump" \
  postgres:17 \
  pg_dump \
  -h aws-1-eu-west-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.uqfwpvxxrstrixmgaqon \
  -d postgres \
  --no-owner --no-privileges \
  -F c \
  -f /dump/complete_migration.dump

if [ ! -f complete_migration.dump ]; then
    echo "ERROR: Dump file was not created"
    exit 1
fi

echo "✓ Complete dump created: complete_migration.dump"
echo ""

echo "Step 2: Restoring to production using PostgreSQL 17..."
docker run --rm \
  -e PGPASSWORD="$PROD_PASSWORD" \
  -e PGSSLMODE=require \
  -v "$PWD:/dump" \
  postgres:17 \
  pg_restore \
  -h aws-1-eu-west-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.zexrxamspmcpwfomcaig \
  -d postgres \
  --no-owner --no-privileges \
  --disable-triggers \
  --clean \
  /dump/complete_migration.dump

echo "✓ Restore completed"
echo ""
echo "=== MIGRATION COMPLETE ==="
echo "Verifying user count in production..."
docker run --rm \
  -e PGPASSWORD="$PROD_PASSWORD" \
  -e PGSSLMODE=require \
  postgres:17 \
  psql \
  -h aws-1-eu-west-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.zexrxamspmcpwfomcaig \
  -d postgres \
  -c "SELECT COUNT(*) as user_count FROM users;"

echo ""
echo "Migration successful! 🎉"