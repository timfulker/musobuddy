#!/bin/bash
set -e

echo "Enter production Supabase password:"
read -s PROD_PASS

export PGSSLMODE=require
export PGPASSWORD="$PROD_PASS"

echo "Fixing primary key on production users table..."

psql -h aws-1-eu-west-2.pooler.supabase.com -p 5432 -U postgres.zexrxamspmcpwfomcaig -d postgres <<EOF
-- Check if primary key already exists
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY';

-- If it doesn't exist, add it
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- Verify it worked
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY';
EOF

echo "Done! You should now be able to delete users in the Supabase table editor."