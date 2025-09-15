#!/bin/bash
set -euo pipefail

echo "=== MusoBuddy Data Migration (Replit Version) ==="
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

echo "Step 1: Creating schema dump from development..."
PGPASSWORD="$DEV_PASSWORD" pg_dump $DEV_FLAGS --schema-only --no-owner --no-privileges > dev_schema.sql
if [ ! -s dev_schema.sql ]; then
    echo "ERROR: Schema dump failed or is empty"
    exit 1
fi
echo "✓ Schema dump created"

echo ""
echo "Step 2: Applying schema to production..."
PGPASSWORD="$PROD_PASSWORD" psql $PROD_FLAGS -f dev_schema.sql
echo "✓ Schema applied to production"

echo ""
echo "Step 3: Copying data table by table..."
PGPASSWORD="$DEV_PASSWORD" psql $DEV_FLAGS -Atc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename" > table_list.txt

total_tables=$(wc -l < table_list.txt)
current=0

while IFS= read -r table; do
    current=$((current + 1))
    echo "[$current/$total_tables] Copying table: $table"
    
    # Copy data using CSV format
    PGPASSWORD="$DEV_PASSWORD" psql $DEV_FLAGS -c "\\copy \"$table\" TO STDOUT (FORMAT CSV, HEADER)" | \
    PGPASSWORD="$PROD_PASSWORD" psql $PROD_FLAGS -c "TRUNCATE TABLE \"$table\" CASCADE; \\copy \"$table\" FROM STDIN (FORMAT CSV, HEADER)"
done < table_list.txt

echo ""
echo "Step 4: Resetting sequences..."
PGPASSWORD="$PROD_PASSWORD" psql $PROD_FLAGS -c "
DO \$\$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'SELECT setval(''' || seq_record.sequence_name || ''', COALESCE((SELECT MAX(id) FROM ' || replace(seq_record.sequence_name, '_id_seq', '') || '), 1), false)';
    END LOOP;
END \$\$;
"

echo "✓ Sequences reset"
echo ""
echo "=== MIGRATION COMPLETE ==="
echo "Verifying user count..."
PGPASSWORD="$PROD_PASSWORD" psql $PROD_FLAGS -c "SELECT COUNT(*) as user_count FROM users;"

# Cleanup
rm -f dev_schema.sql table_list.txt