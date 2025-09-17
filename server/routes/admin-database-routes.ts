import type { Express, Request, Response } from 'express';
import { db } from '../core/database.js';
import { eq, sql, like, or } from 'drizzle-orm';
import { 
  bookings, 
  clients, 
  contracts, 
  invoices, 
  userSettings, 
  complianceDocuments,
  bookingConflicts,
  conflictResolutions,
  unparseableMessages,
  emailTemplates
} from '../../shared/schema.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';

// Define available tables and their schemas
const AVAILABLE_TABLES = {
  'bookings': bookings,
  'clients': clients,
  'contracts': contracts,
  'invoices': invoices,
  'userSettings': userSettings,
  'complianceDocuments': complianceDocuments,
  'bookingConflicts': bookingConflicts,
  'conflictResolutions': conflictResolutions,
  'unparseableMessages': unparseableMessages,
  'emailTemplates': emailTemplates
} as const;

// Map export names to actual database table names (for tables with naming mismatches)
const TABLE_NAME_MAPPING: Record<string, string> = {
  'complianceDocuments': 'compliance_documents',
  'userSettings': 'user_settings',
  'bookingConflicts': 'booking_conflicts',
  'conflictResolutions': 'conflict_resolutions',
  'unparseableMessages': 'unparseable_messages',
  'emailTemplates': 'email_templates',
};

type TableName = keyof typeof AVAILABLE_TABLES;

export function setupAdminDatabaseRoutes(app: Express) {
  // Get list of available tables with metadata
  app.get('/api/admin/database/tables', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tables = [];
      
      for (const [tableName, tableSchema] of Object.entries(AVAILABLE_TABLES)) {
        try {
          // Get row count for each table
          const countResult = await db.select({ count: sql<number>`count(*)` }).from(tableSchema);
          const rowCount = countResult[0]?.count || 0;
          
          // Get column names using SQL query instead of schema metadata
          const actualTableName = TABLE_NAME_MAPPING[tableName] || tableName;
          const columnQuery = await db.execute(sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = ${actualTableName} 
            AND table_schema = 'public'
            ORDER BY ordinal_position
          `);
          
          const columns = columnQuery.rows.map((row: any) => row.column_name);
          
          tables.push({
            name: tableName,
            rowCount,
            columns
          });
        } catch (error) {
          console.error(`Error getting metadata for table ${tableName}:`, error);
          // Add table with basic info even if column detection fails
          tables.push({
            name: tableName,
            rowCount: 0,
            columns: []
          });
        }
      }
      
      res.json(tables);
    } catch (error) {
      console.error('Error fetching database tables:', error);
      res.status(500).json({ error: 'Failed to fetch database tables' });
    }
  });

  // Get table data with pagination, search, and filtering
  app.get('/api/admin/database/data', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { table, page = '1', limit = '50', search, filterColumn } = req.query;
      console.log(`📊 Backend: Request received for table: ${table}, page: ${page}, search: ${search}`);
      
      if (!table || typeof table !== 'string' || !(table in AVAILABLE_TABLES)) {
        return res.status(400).json({ error: 'Invalid table name' });
      }
      
      const tableName = table as TableName;
      const tableSchema = AVAILABLE_TABLES[tableName];
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;
      
      let query = db.select().from(tableSchema);
      
      // Order results to show meaningful data first (applied after search filtering)
      const shouldOrderMeaningfulFirst = (tableName === 'contracts' || tableName === 'invoices');
      
      // Apply search filtering using raw SQL for better compatibility
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim();
        console.log(`🔍 Searching ${tableName} table for: "${searchTerm}"`);
        
        // Use raw SQL to search across multiple text columns
        // This is more reliable than trying to access schema metadata
        if (tableName === 'bookings') {
          query = query.where(sql`
            LOWER(COALESCE(client_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(event_type, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(venue, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(notes, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(title, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(client_email, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(client_phone, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'clients') {
          query = query.where(sql`
            LOWER(COALESCE(name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(email, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(phone, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(company, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'contracts') {
          query = query.where(sql`
            LOWER(COALESCE(client_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(venue, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(client_email, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(contract_number, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'invoices') {
          query = query.where(sql`
            LOWER(COALESCE(client_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(client_email, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(invoice_number, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'users') {
          query = query.where(sql`
            LOWER(COALESCE(email, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(first_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(last_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(email_prefix, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'complianceDocuments') {
          query = query.where(sql`
            LOWER(COALESCE(name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(type, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else {
          // For other tables, try a generic text search on common column names
          query = query.where(sql`
            LOWER(COALESCE(name::text, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(email::text, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(description::text, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(notes::text, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        }
      }
      
      // Get total count for pagination with same search conditions
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(tableSchema);
      
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim();
        
        // Apply the same search conditions to count query
        if (tableName === 'bookings') {
          countQuery = countQuery.where(sql`
            LOWER(COALESCE(client_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(event_type, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(venue, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(notes, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(title, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(client_email, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(client_phone, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'clients') {
          countQuery = countQuery.where(sql`
            LOWER(COALESCE(name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(email, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(phone, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(company, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'contracts') {
          countQuery = countQuery.where(sql`
            LOWER(COALESCE(client_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(venue, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(client_email, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(contract_number, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'invoices') {
          countQuery = countQuery.where(sql`
            LOWER(COALESCE(client_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(client_email, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(invoice_number, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'users') {
          countQuery = countQuery.where(sql`
            LOWER(COALESCE(email, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(first_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(last_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(email_prefix, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'complianceDocuments') {
          countQuery = countQuery.where(sql`
            LOWER(COALESCE(name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(type, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else {
          countQuery = countQuery.where(sql`
            LOWER(COALESCE(name::text, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(email::text, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(description::text, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(notes::text, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        }
      }
      
      // For contracts and invoices, use direct SQL query to ensure proper ordering
      let rows, countResult;
      
      if ((tableName === 'contracts' || tableName === 'invoices') && !search) {
        // Use direct SQL for contracts/invoices to ensure proper ordering
        const directQuery = sql`
          SELECT * FROM ${sql.identifier(tableName)}
          ORDER BY 
            CASE 
              WHEN client_name IS NOT NULL AND client_name != '' THEN 0
              ELSE 1
            END,
            id DESC
          LIMIT ${limitNum} OFFSET ${offset}
        `;
        
        [rows, countResult] = await Promise.all([
          db.execute(directQuery),
          countQuery
        ]);
        
        rows = rows.rows; // Extract rows from the result
      } else {
        // Apply standard ordering for other cases
        if (!search) {
          query = query.orderBy(sql`id DESC`);
        }
        
        [rows, countResult] = await Promise.all([
          query.limit(limitNum).offset(offset),
          countQuery
        ]);
      }
      
      const totalCount = countResult[0]?.count || 0;
      
      console.log(`📊 Query results for ${tableName}: ${rows.length} rows found, total count: ${totalCount}`);
      if (rows.length > 0) {
        console.log(`📊 Sample row keys:`, Object.keys(rows[0]));
        console.log(`📊 Sample row data:`, rows[0]);
      }
      
      res.json({
        rows,
        totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      });
      
    } catch (error) {
      console.error('Error fetching table data:', error);
      res.status(500).json({ error: 'Failed to fetch table data' });
    }
  });

  // Export table data as JSON (for CSV conversion on frontend)
  app.get('/api/admin/database/export/:table', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { table } = req.params;
      
      if (!table || !(table in AVAILABLE_TABLES)) {
        return res.status(400).json({ error: 'Invalid table name' });
      }
      
      const tableName = table as TableName;
      const tableSchema = AVAILABLE_TABLES[tableName];
      
      // Get all data (be careful with large tables)
      const rows = await db.select().from(tableSchema);
      
      res.json(rows);
      
    } catch (error) {
      console.error('Error exporting table data:', error);
      res.status(500).json({ error: 'Failed to export table data' });
    }
  });

  console.log('✅ Admin database routes configured');
}