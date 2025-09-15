#!/bin/bash
set -e

echo "Simple data copy - just the important tables"
echo ""

echo "Enter development password:"
read -s DEV_PASS
echo "Enter production password:"
read -s PROD_PASS

export PGSSLMODE=require
DEV="-h aws-1-eu-west-2.pooler.supabase.com -p 5432 -U postgres.uqfwpvxxrstrixmgaqon -d postgres"
PROD="-h aws-1-eu-west-2.pooler.supabase.com -p 5432 -U postgres.zexrxamspmcpwfomcaig -d postgres"

# Core tables that matter
tables="users clients bookings invoices user_settings contracts"

for table in $tables; do
    echo "Copying $table..."
    PGPASSWORD="$DEV_PASS" psql $DEV -c "\\copy $table to stdout" | PGPASSWORD="$PROD_PASS" psql $PROD -c "\\copy $table from stdin"
    echo "✓ $table done"
done

echo ""
echo "Done! Check if your data is there."