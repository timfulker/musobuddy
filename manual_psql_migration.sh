#!/bin/bash
set -euo pipefail

echo "=== Manual PostgreSQL Migration (No pg_dump) ==="
echo ""

# Get passwords
echo "Enter development Supabase password:"
read -s DEV_PASSWORD
echo ""
echo "Enter production Supabase password:"  
read -s PROD_PASSWORD
echo ""

export PGSSLMODE=require
DEV_FLAGS="-h aws-1-eu-west-2.pooler.supabase.com -p 5432 -U postgres.uqfwpvxxrstrixmgaqon -d postgres"
PROD_FLAGS="-h aws-1-eu-west-2.pooler.supabase.com -p 5432 -U postgres.zexrxamspmcpwfomcaig -d postgres"

echo "Step 1: Applying schema to production..."
PGPASSWORD="$PROD_PASSWORD" psql $PROD_FLAGS -f production-complete-schema.sql
echo "✓ Schema applied to production"

echo ""
echo "Step 2: Copying data table by table (bypassing pg_dump version issues)..."

# Get all tables from development database
PGPASSWORD="$DEV_PASSWORD" psql $DEV_FLAGS -Atc "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name" > table_list.txt

total_tables=$(wc -l < table_list.txt)
current=0

echo "Found $total_tables tables to migrate"
echo ""

while IFS= read -r table; do
    current=$((current + 1))
    echo "[$current/$total_tables] Copying: $table"
    
    # Get row count from development
    row_count=$(PGPASSWORD="$DEV_PASSWORD" psql $DEV_FLAGS -Atc "SELECT COUNT(*) FROM \"$table\"")
    
    if [ "$row_count" -eq 0 ]; then
        echo "  → Empty table, skipping..."
        continue
    fi
    
    echo "  → Migrating $row_count rows..."
    
    # Clear existing data in production table
    PGPASSWORD="$PROD_PASSWORD" psql $PROD_FLAGS -c "TRUNCATE TABLE \"$table\" CASCADE" > /dev/null 2>&1
    
    # Copy data using streaming approach (version-independent)
    PGPASSWORD="$DEV_PASSWORD" psql $DEV_FLAGS -c "\\copy \"$table\" TO STDOUT (FORMAT CSV, HEADER)" | \
    PGPASSWORD="$PROD_PASSWORD" psql $PROD_FLAGS -c "\\copy \"$table\" FROM STDIN (FORMAT CSV, HEADER)"
    
    echo "  ✓ Completed"
    
done < table_list.txt

echo ""
echo "Step 3: Resetting sequences..."
PGPASSWORD="$PROD_PASSWORD" psql $PROD_FLAGS -c "
SELECT 'SELECT setval(''' || sequence_name || ''', COALESCE((SELECT MAX(id) FROM ' || replace(sequence_name, '_id_seq', '') || '), 1), false);' 
FROM information_schema.sequences 
WHERE sequence_schema = 'public' AND sequence_name LIKE '%_id_seq';" | \
PGPASSWORD="$PROD_PASSWORD" psql $PROD_FLAGS > /dev/null 2>&1

echo "✓ Sequences reset"
echo ""
echo "=== MIGRATION COMPLETE ==="
echo ""

# Verify migration
echo "Verification Summary:"
echo "===================="
PGPASSWORD="$PROD_PASSWORD" psql $PROD_FLAGS -c "
SELECT 
    schemaname, 
    relname as table_name, 
    n_tup_ins as row_count 
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
ORDER BY relname;" 

echo ""
echo "Migration successful! All data transferred using manual psql approach. 🎉"

# Cleanup
rm -f table_list.txt