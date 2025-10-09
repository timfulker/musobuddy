-- Step 9: Verification

-- Check which tables now have RLS enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'beta_invite_codes', 'beta_invites', 'clients', 'contract_extractions',
    'email_templates', 'contract_extraction_patterns', 'feedback',
    'fraud_prevention_log', 'event_sync_mapping', 'google_calendar_integration',
    'instrument_mappings', 'phone_verifications', 'sessions',
    'message_notifications', 'sms_verifications', 'trial_usage_tracking',
    'unparseable_messages', 'support_tickets', 'user_login_history',
    'user_messages', 'user_security_status', 'user_activity',
    'booking_conflicts', 'conflict_resolutions', 'imported_contracts',
    'beta_email_templates', 'api_usage_tracking', 'api_usage_stats'
  )
ORDER BY tablename;

-- All tables should show rowsecurity = true
