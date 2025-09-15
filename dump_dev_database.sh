#!/bin/bash

# Script to dump development database to production
echo "Enter development Supabase password:"
read -s DEV_PASSWORD

echo "Dumping development database..."
export PGSSLMODE=require
export PGPASSWORD="$DEV_PASSWORD"

pg_dump \
  -h aws-1-eu-west-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.uqfwpvxxrstrixmgaqon \
  -d postgres \
  --no-owner --no-privileges \
  > working_complete_dump.sql

echo "Dump created: working_complete_dump.sql"
echo ""

echo "Enter production Supabase password:"
read -s PROD_PASSWORD
export PGPASSWORD="$PROD_PASSWORD"

echo "Importing to production database..."
psql \
  -h aws-1-eu-west-2.pooler.supabase.com \
  -p 5432 \
  -U postgres.zexrxamspmcpwfomcaig \
  -d postgres \
  -f working_complete_dump.sql

echo "Import complete!"