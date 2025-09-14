// Deep scan for ALL tables in wkhrzcpvghdlhnxzhrde development database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Development database - wkhrzcpvghdlhnxzhrde
const supabaseDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function deepTableScan() {
  console.log('🔍 DEEP SCAN FOR ALL TABLES IN DEVELOPMENT DATABASE');
  console.log('Project ID: wkhrzcpvghdlhnxzhrde');
  console.log('URL:', process.env.SUPABASE_URL_DEV);
  console.log('='.repeat(70));

  // Comprehensive list of possible table names based on common business applications
  const possibleTableNames = [
    // Core business tables
    'users', 'user_settings', 'bookings', 'clients', 'contracts', 'invoices',
    'sessions', 'email_templates', 'sms_templates', 'notifications', 'settings',

    // Logging and audit tables
    'email_logs', 'sms_logs', 'admin_logs', 'audit_logs', 'activity_logs',
    'error_logs', 'payment_logs', 'login_logs', 'api_logs',

    // Authentication and security
    'verification_codes', 'password_resets', 'login_attempts', 'oauth_tokens',
    'refresh_tokens', 'api_keys', 'permissions', 'roles', 'user_roles',

    // File and media management
    'file_uploads', 'documents', 'images', 'attachments', 'media_files',

    // Communication and messaging
    'messages', 'conversations', 'email_campaigns', 'sms_campaigns',
    'chat_messages', 'notifications_settings',

    // Business entities
    'venues', 'equipment', 'packages', 'pricing', 'services', 'staff',
    'suppliers', 'vendors', 'partners',

    // Scheduling and availability
    'availability', 'calendar_events', 'time_slots', 'schedules',
    'appointments', 'bookings_calendar',

    // Forms and templates
    'forms', 'form_submissions', 'templates', 'contract_templates',
    'invoice_templates', 'email_templates_backup',

    // Feedback and reviews
    'booking_feedback', 'client_feedback', 'reviews', 'ratings',
    'testimonials', 'surveys',

    // Financial and payment
    'payments', 'refunds', 'discounts', 'coupons', 'tax_rates',
    'payment_methods', 'billing_history', 'invoices_items',
    'subscription_plans', 'subscriptions',

    // Integration and webhooks
    'webhooks', 'integrations', 'api_integrations', 'third_party_auth',
    'external_services',

    // Analytics and reporting
    'reports', 'analytics', 'metrics', 'statistics', 'usage_stats',
    'performance_metrics', 'conversion_tracking',

    // System and maintenance
    'migrations', 'backups', 'system_settings', 'feature_flags',
    'experiments', 'maintenance_logs',

    // Compliance and legal
    'compliance_data', 'gdpr_requests', 'legal_documents',
    'terms_acceptance', 'privacy_settings',

    // Additional business tables
    'locations', 'addresses', 'contacts', 'phone_numbers',
    'social_media', 'marketing_campaigns', 'lead_sources',
    'customer_segments', 'tags', 'categories',

    // Event-specific tables
    'event_types', 'event_packages', 'event_equipment',
    'event_staff', 'event_venues', 'event_timeline',

    // Communication preferences
    'communication_preferences', 'unsubscribes', 'email_bounces',
    'sms_opt_outs', 'marketing_consents'
  ];

  console.log(`🔍 Scanning ${possibleTableNames.length} possible table names...`);

  const foundTables = [];
  const batchSize = 10;

  for (let i = 0; i < possibleTableNames.length; i += batchSize) {
    const batch = possibleTableNames.slice(i, i + batchSize);

    // Process batch in parallel
    const batchPromises = batch.map(async (tableName) => {
      try {
        const { data, error } = await supabaseDev
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error) {
          // Table exists - get count
          const { count } = await supabaseDev
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          return {
            name: tableName,
            recordCount: count || 0,
            hasData: count > 0
          };
        }
        return null;
      } catch (err) {
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    const validTables = batchResults.filter(result => result !== null);

    if (validTables.length > 0) {
      foundTables.push(...validTables);
      validTables.forEach(table => {
        console.log(`✅ ${table.name}: ${table.recordCount} records`);
      });
    }

    // Progress indicator
    const progress = Math.min(i + batchSize, possibleTableNames.length);
    process.stdout.write(`\r🔍 Scanned ${progress}/${possibleTableNames.length} table names...`);
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('📊 FINAL RESULTS:');
  console.log('='.repeat(70));
  console.log(`🎯 TOTAL TABLES FOUND: ${foundTables.length}`);

  if (foundTables.length > 0) {
    console.log('\n📋 ALL TABLES IN DEVELOPMENT DATABASE:');
    foundTables
      .sort((a, b) => b.recordCount - a.recordCount)
      .forEach((table, index) => {
        const dataStatus = table.hasData ? `${table.recordCount} records` : 'EMPTY';
        console.log(`${(index + 1).toString().padStart(2)}. ${table.name.padEnd(25)} - ${dataStatus}`);
      });
  }

  console.log('\n' + '='.repeat(70));

  return foundTables;
}

// Run the deep scan
deepTableScan().catch(console.error);