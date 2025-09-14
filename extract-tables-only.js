// Extract only CREATE TABLE statements for production
import { readFileSync, writeFileSync } from 'fs';

try {
  console.log('📋 Extracting CREATE TABLE statements from backup...');

  const backupContent = readFileSync('db_cluster-14-09-2025@00-49-58.backup 2', 'utf8');

  // Extract all CREATE TABLE public.* statements
  const tableMatches = backupContent.match(/CREATE TABLE public\.[^;]*;/gs);

  if (!tableMatches) {
    console.log('❌ No CREATE TABLE statements found');
    process.exit(1);
  }

  console.log(`✅ Found ${tableMatches.length} CREATE TABLE statements`);

  // Clean up and format the statements
  const cleanStatements = tableMatches.map(statement => {
    return statement
      .replace(/ALTER TABLE[^;]*;/g, '') // Remove ALTER statements
      .replace(/--[^\n]*/g, '') // Remove comments
      .replace(/\n\s*\n/g, '\n') // Remove extra newlines
      .trim();
  }).filter(statement => statement.length > 0);

  // Create the SQL file
  const sqlContent = `-- Complete table schema from backup
-- Created: ${new Date().toISOString()}
-- Tables: ${cleanStatements.length}

${cleanStatements.join('\n\n')}

-- Create sequences for auto-increment columns
CREATE SEQUENCE IF NOT EXISTS beta_invite_codes_id_seq;
CREATE SEQUENCE IF NOT EXISTS blocked_dates_id_seq;
CREATE SEQUENCE IF NOT EXISTS booking_conflicts_id_seq;
CREATE SEQUENCE IF NOT EXISTS booking_documents_id_seq;
CREATE SEQUENCE IF NOT EXISTS bookings_id_seq;
CREATE SEQUENCE IF NOT EXISTS clients_id_seq;
CREATE SEQUENCE IF NOT EXISTS compliance_documents_id_seq;
CREATE SEQUENCE IF NOT EXISTS conflict_resolutions_id_seq;
CREATE SEQUENCE IF NOT EXISTS contracts_id_seq;
CREATE SEQUENCE IF NOT EXISTS feedback_id_seq;
CREATE SEQUENCE IF NOT EXISTS imported_contracts_id_seq;
CREATE SEQUENCE IF NOT EXISTS invoices_id_seq;
CREATE SEQUENCE IF NOT EXISTS message_notifications_id_seq;
CREATE SEQUENCE IF NOT EXISTS support_tickets_id_seq;
CREATE SEQUENCE IF NOT EXISTS unparseable_messages_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_audit_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_login_history_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_messages_id_seq;

-- Set sequence ownership
ALTER SEQUENCE beta_invite_codes_id_seq OWNED BY beta_invite_codes.id;
ALTER SEQUENCE blocked_dates_id_seq OWNED BY blocked_dates.id;
ALTER SEQUENCE booking_conflicts_id_seq OWNED BY booking_conflicts.id;
ALTER SEQUENCE booking_documents_id_seq OWNED BY booking_documents.id;
ALTER SEQUENCE bookings_id_seq OWNED BY bookings.id;
ALTER SEQUENCE clients_id_seq OWNED BY clients.id;
ALTER SEQUENCE compliance_documents_id_seq OWNED BY compliance_documents.id;
ALTER SEQUENCE conflict_resolutions_id_seq OWNED BY conflict_resolutions.id;
ALTER SEQUENCE contracts_id_seq OWNED BY contracts.id;
ALTER SEQUENCE feedback_id_seq OWNED BY feedback.id;
ALTER SEQUENCE imported_contracts_id_seq OWNED BY imported_contracts.id;
ALTER SEQUENCE invoices_id_seq OWNED BY invoices.id;
ALTER SEQUENCE message_notifications_id_seq OWNED BY message_notifications.id;
ALTER SEQUENCE support_tickets_id_seq OWNED BY support_tickets.id;
ALTER SEQUENCE unparseable_messages_id_seq OWNED BY unparseable_messages.id;
ALTER SEQUENCE user_audit_logs_id_seq OWNED BY user_audit_logs.id;
ALTER SEQUENCE user_login_history_id_seq OWNED BY user_login_history.id;
ALTER SEQUENCE user_messages_id_seq OWNED BY user_messages.id;
`;

  writeFileSync('production-complete-schema.sql', sqlContent);

  console.log('\n✅ Created production-complete-schema.sql');
  console.log(`📊 Contains ${cleanStatements.length} CREATE TABLE statements`);
  console.log('🎯 Ready to run in Supabase Production SQL Editor');

  // Show table names
  console.log('\n📋 Tables to be created:');
  cleanStatements.forEach((statement, index) => {
    const tableName = statement.match(/CREATE TABLE public\.(\w+)/)?.[1];
    console.log(`${(index + 1).toString().padStart(2)}. ${tableName}`);
  });

} catch (error) {
  console.log('❌ Error:', error.message);
}