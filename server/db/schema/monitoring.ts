import { pgTable, serial, text, timestamp, jsonb, integer, real, index } from 'drizzle-orm/pg-core';

// Front-end errors table
export const frontEndErrors = pgTable('front_end_errors', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id'),
  message: text('message').notNull(),
  stack: text('stack'),
  componentStack: text('component_stack'),
  url: text('url').notNull(),
  userAgent: text('user_agent').notNull(),
  errorType: text('error_type').notNull(), // 'react' | 'unhandled' | 'promise' | 'network'
  metadata: jsonb('metadata'),
  timestamp: text('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  sessionIdx: index('fe_session_idx').on(table.sessionId),
  userIdx: index('fe_user_idx').on(table.userId),
  timestampIdx: index('fe_timestamp_idx').on(table.timestamp),
  errorTypeIdx: index('fe_error_type_idx').on(table.errorType)
}));

// Performance metrics table
export const performanceMetrics = pgTable('performance_metrics', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id'),
  name: text('name').notNull(), // LCP, FID, CLS, TTFB, etc.
  value: real('value').notNull(),
  url: text('url').notNull(),
  metadata: jsonb('metadata'),
  timestamp: text('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  sessionIdx: index('pm_session_idx').on(table.sessionId),
  nameIdx: index('pm_name_idx').on(table.name),
  timestampIdx: index('pm_timestamp_idx').on(table.timestamp)
}));

// User interactions table
export const userInteractions = pgTable('user_interactions', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id'),
  type: text('type').notNull(), // 'click' | 'form_submit' | 'navigation' | 'scroll' | 'error_interaction'
  target: text('target'),
  url: text('url').notNull(),
  metadata: jsonb('metadata'),
  timestamp: text('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  sessionIdx: index('ui_session_idx').on(table.sessionId),
  userIdx: index('ui_user_idx').on(table.userId),
  typeIdx: index('ui_type_idx').on(table.type),
  timestampIdx: index('ui_timestamp_idx').on(table.timestamp)
}));

// Network requests table
export const networkRequests = pgTable('network_requests', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id'),
  url: text('url').notNull(),
  method: text('method').notNull(),
  status: integer('status'),
  duration: real('duration').notNull(),
  error: text('error'),
  timestamp: text('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  sessionIdx: index('nr_session_idx').on(table.sessionId),
  statusIdx: index('nr_status_idx').on(table.status),
  durationIdx: index('nr_duration_idx').on(table.duration),
  timestampIdx: index('nr_timestamp_idx').on(table.timestamp)
}));

// Aggregated monitoring summary (for quick dashboard access)
export const frontEndMonitoring = pgTable('front_end_monitoring', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD
  hour: integer('hour'), // 0-23
  errorCount: integer('error_count').default(0),
  uniqueSessions: integer('unique_sessions').default(0),
  uniqueUsers: integer('unique_users').default(0),
  avgLCP: real('avg_lcp'),
  avgFID: real('avg_fid'),
  avgCLS: real('avg_cls'),
  avgTTFB: real('avg_ttfb'),
  totalInteractions: integer('total_interactions').default(0),
  totalNetworkRequests: integer('total_network_requests').default(0),
  failedRequests: integer('failed_requests').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  dateIdx: index('fem_date_idx').on(table.date),
  dateHourIdx: index('fem_date_hour_idx').on(table.date, table.hour)
}));