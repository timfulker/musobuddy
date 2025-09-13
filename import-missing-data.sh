#!/bin/bash

echo "🔄 Importing Missing Data to Supabase"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
set -a
source .env
set +a

# Check current data counts
echo "📊 Current data in Supabase:"
psql "$SUPABASE_DB_URL_DEV" -t -c "
    SELECT 'User Settings: ' || COUNT(*) FROM user_settings
    UNION ALL SELECT 'Invoices: ' || COUNT(*) FROM invoices
    UNION ALL SELECT 'Contracts: ' || COUNT(*) FROM contracts
    UNION ALL SELECT 'Email Templates: ' || COUNT(*) FROM email_templates;"

echo ""
echo "📤 Exporting missing data from Neon..."

# Export user_settings
echo "Exporting user_settings..."
psql "$DATABASE_URL" -c "\COPY user_settings TO '/tmp/user_settings_export.csv' WITH CSV HEADER;"

# Export invoices
echo "Exporting invoices..."
psql "$DATABASE_URL" -c "\COPY invoices TO '/tmp/invoices_export.csv' WITH CSV HEADER;"

# Export contracts
echo "Exporting contracts..."
psql "$DATABASE_URL" -c "\COPY contracts TO '/tmp/contracts_export.csv' WITH CSV HEADER;"

# Export email_templates
echo "Exporting email_templates..."
psql "$DATABASE_URL" -c "\COPY email_templates TO '/tmp/email_templates_export.csv' WITH CSV HEADER;"

echo ""
echo "📥 Importing data to Supabase..."

# Import user_settings
echo "Importing user_settings..."
psql "$SUPABASE_DB_URL_DEV" -c "\COPY user_settings FROM '/tmp/user_settings_export.csv' WITH CSV HEADER;"

# Import invoices
echo "Importing invoices..."
psql "$SUPABASE_DB_URL_DEV" -c "\COPY invoices FROM '/tmp/invoices_export.csv' WITH CSV HEADER;"

# Import contracts
echo "Importing contracts..."
psql "$SUPABASE_DB_URL_DEV" -c "\COPY contracts FROM '/tmp/contracts_export.csv' WITH CSV HEADER;"

# Import email_templates
echo "Importing email_templates..."
psql "$SUPABASE_DB_URL_DEV" -c "\COPY email_templates FROM '/tmp/email_templates_export.csv' WITH CSV HEADER;"

echo ""
echo "✅ Verifying import results..."
echo ""
echo "📊 Final data counts in Supabase:"
psql "$SUPABASE_DB_URL_DEV" -t -c "
    SELECT 'User Settings: ' || COUNT(*) FROM user_settings
    UNION ALL SELECT 'Invoices: ' || COUNT(*) FROM invoices
    UNION ALL SELECT 'Contracts: ' || COUNT(*) FROM contracts
    UNION ALL SELECT 'Email Templates: ' || COUNT(*) FROM email_templates;"

echo ""
echo -e "${GREEN}✅ Missing data import complete!${NC}"