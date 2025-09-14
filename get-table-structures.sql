-- Run this in your DEVELOPMENT Supabase SQL Editor
-- Copy the results and run in PRODUCTION Supabase SQL Editor

-- Get the exact table structures from development
DO $$
DECLARE
    table_name text;
    create_stmt text;
BEGIN
    -- Loop through each table we need
    FOR table_name IN SELECT unnest(ARRAY['bookings', 'clients', 'contracts', 'invoices'])
    LOOP
        -- Get the CREATE TABLE statement for each table
        SELECT INTO create_stmt
            'CREATE TABLE IF NOT EXISTS ' || schemaname || '.' || tablename || ' (' ||
            string_agg(
                column_name || ' ' ||
                CASE
                    WHEN data_type = 'character varying' THEN 'VARCHAR'
                    WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                    WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
                    WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
                    WHEN data_type = 'integer' THEN 'INTEGER'
                    WHEN data_type = 'boolean' THEN 'BOOLEAN'
                    WHEN data_type = 'text' THEN 'TEXT'
                    WHEN data_type = 'jsonb' THEN 'JSONB'
                    ELSE data_type
                END ||
                CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
                ', '
            ) || ');'
        FROM information_schema.columns
        WHERE tablename = table_name
          AND schemaname = 'public'
        GROUP BY schemaname, tablename;

        -- Print the CREATE statement
        RAISE NOTICE '%', create_stmt;

        -- Add indexes
        RAISE NOTICE 'CREATE INDEX IF NOT EXISTS idx_%_id ON % (id);', table_name, table_name;
        IF table_name != 'clients' THEN
            RAISE NOTICE 'CREATE INDEX IF NOT EXISTS idx_%_user_id ON % (user_id);', table_name, table_name;
        END IF;

        RAISE NOTICE '';
    END LOOP;

    RAISE NOTICE '-- Run the above statements in PRODUCTION, then use the JavaScript copy script';
END $$;