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
  emailTemplates,
  globalGigTypes
} from '../../shared/schema.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

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
  'emailTemplates': emailTemplates,
  'globalGigTypes': globalGigTypes
} as const;

type TableName = keyof typeof AVAILABLE_TABLES;

export function setupAdminDatabaseRoutes(app: Express) {
  // Get list of available tables with metadata
  app.get('/api/admin/database/tables', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const tables = [];
      
      for (const [tableName, tableSchema] of Object.entries(AVAILABLE_TABLES)) {
        try {
          // Get row count for each table
          const countResult = await db.select({ count: sql<number>`count(*)` }).from(tableSchema);
          const rowCount = countResult[0]?.count || 0;
          
          // Get column names from schema - use a more reliable method
          const schemaColumns = (tableSchema as any)._.columns;
          const columns = schemaColumns ? Object.keys(schemaColumns) : [];
          
          tables.push({
            name: tableName,
            rowCount,
            columns
          });
        } catch (error) {
          console.error(`Error getting metadata for table ${tableName}:`, error);
          // Continue with other tables
        }
      }
      
      res.json(tables);
    } catch (error) {
      console.error('Error fetching database tables:', error);
      res.status(500).json({ error: 'Failed to fetch database tables' });
    }
  });

  // Get table data with pagination, search, and filtering
  app.get('/api/admin/database/data', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { table, page = '1', limit = '50', search, filterColumn } = req.query;
      
      if (!table || typeof table !== 'string' || !(table in AVAILABLE_TABLES)) {
        return res.status(400).json({ error: 'Invalid table name' });
      }
      
      const tableName = table as TableName;
      const tableSchema = AVAILABLE_TABLES[tableName];
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;
      
      let query = db.select().from(tableSchema);
      
      // Apply search filtering using raw SQL for better compatibility
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim();
        
        // Use raw SQL to search across multiple text columns
        // This is more reliable than trying to access schema metadata
        if (tableName === 'bookings') {
          query = query.where(sql`
            LOWER(COALESCE(client_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(event_type, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(venue_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(notes, '')) LIKE LOWER(${`%${searchTerm}%`})
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
            LOWER(COALESCE(event_type, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(title, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'invoices') {
          query = query.where(sql`
            LOWER(COALESCE(client_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(description, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
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
            LOWER(COALESCE(venue_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(notes, '')) LIKE LOWER(${`%${searchTerm}%`})
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
            LOWER(COALESCE(event_type, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(status, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(title, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        } else if (tableName === 'invoices') {
          countQuery = countQuery.where(sql`
            LOWER(COALESCE(client_name, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(description, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
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
        } else {
          countQuery = countQuery.where(sql`
            LOWER(COALESCE(name::text, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(email::text, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(description::text, '')) LIKE LOWER(${`%${searchTerm}%`}) OR
            LOWER(COALESCE(notes::text, '')) LIKE LOWER(${`%${searchTerm}%`})
          `);
        }
      }
      
      const [rows, countResult] = await Promise.all([
        query.limit(limitNum).offset(offset),
        countQuery
      ]);
      
      const totalCount = countResult[0]?.count || 0;
      
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
  app.get('/api/admin/database/export/:table', requireAuth, requireAdmin, async (req: Request, res: Response) => {
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