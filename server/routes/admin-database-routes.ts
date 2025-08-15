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
          
          // Get column names from schema
          const columns = Object.keys((tableSchema as any)._.columns);
          
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
      
      // Apply search filtering
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        const columns = Object.entries((tableSchema as any)._.columns);
        
        // Create search conditions for text/varchar columns only
        const searchConditions = columns
          .filter(([_, column]) => {
            const columnType = (column as any).dataType;
            return columnType === 'string' || columnType === 'text';
          })
          .map(([columnName, column]) => {
            return like((column as any), searchTerm);
          });
        
        if (searchConditions.length > 0) {
          query = query.where(or(...searchConditions));
        }
      }
      
      // Apply column-specific filtering
      if (filterColumn && typeof filterColumn === 'string' && filterColumn !== 'all') {
        const columns = (tableSchema as any)._.columns;
        if (filterColumn in columns && search) {
          const column = columns[filterColumn];
          const searchTerm = `%${search}%`;
          query = query.where(like(column, searchTerm));
        }
      }
      
      // Get total count for pagination
      const countQuery = db.select({ count: sql<number>`count(*)` }).from(tableSchema);
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        const columns = Object.entries((tableSchema as any)._.columns);
        const searchConditions = columns
          .filter(([_, column]) => {
            const columnType = (column as any).dataType;
            return columnType === 'string' || columnType === 'text';
          })
          .map(([columnName, column]) => {
            return like((column as any), searchTerm);
          });
        
        if (searchConditions.length > 0) {
          countQuery.where(or(...searchConditions));
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