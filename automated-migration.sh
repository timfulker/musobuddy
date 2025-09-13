#!/bin/bash

echo "🚀 Automated Supabase Data Migration"
echo "===================================="

# Export all missing tables from Neon
echo "📤 Exporting missing tables from Neon..."

psql $DATABASE_URL -c "\COPY (SELECT * FROM user_settings) TO 'user_settings.csv' WITH CSV HEADER;"
psql $DATABASE_URL -c "\COPY (SELECT * FROM invoices) TO 'invoices.csv' WITH CSV HEADER;"
psql $DATABASE_URL -c "\COPY (SELECT * FROM contracts) TO 'contracts.csv' WITH CSV HEADER;"
psql $DATABASE_URL -c "\COPY (SELECT * FROM email_templates) TO 'email_templates.csv' WITH CSV HEADER;"

echo "✅ Export complete. Files created:"
ls -lh user_settings.csv invoices.csv contracts.csv email_templates.csv

echo ""
echo "📥 Import Instructions:"
echo "Since direct psql connection to Supabase isn't working, use one of these methods:"
echo ""
echo "METHOD 1: Table Editor Import (Recommended)"
echo "1. Go to Supabase Dashboard > Table Editor"
echo "2. For each table (user_settings, invoices, contracts, email_templates):"
echo "   - Select the table"
echo "   - Click 'Import data'"
echo "   - Upload the corresponding CSV file"
echo "   - Click Import"
echo ""
echo "METHOD 2: Copy data via Supabase SQL Editor"
echo "Run this query in SQL Editor for each file:"
echo "  \\COPY table_name FROM 'file.csv' WITH CSV HEADER;"
echo ""
echo "Expected final counts:"
echo "- user_settings: 6"
echo "- invoices: 17"
echo "- contracts: 6"
echo "- email_templates: 861"
echo ""
echo "After import, verify with:"
echo "SELECT 'user_settings' as table_name, COUNT(*) as count FROM user_settings"
echo "UNION ALL SELECT 'invoices', COUNT(*) FROM invoices"
echo "UNION ALL SELECT 'contracts', COUNT(*) FROM contracts;"