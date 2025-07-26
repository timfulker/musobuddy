# MusoBuddy Database Commands Reference

## User Management

### View Users
```sql
-- View all users
SELECT * FROM users ORDER BY created_at DESC;

-- View specific user by email
SELECT * FROM users WHERE email = 'user@example.com';

-- View user subscription status
SELECT email, is_subscribed, plan, stripe_customer_id, created_at 
FROM users WHERE email = 'user@example.com';

-- Count total users
SELECT COUNT(*) as total_users FROM users;

-- View subscribed users only
SELECT email, plan, stripe_customer_id FROM users WHERE is_subscribed = true;
```

### Delete Users
```sql
-- Delete user by email
DELETE FROM users WHERE email = 'user@example.com';

-- Delete user by ID
DELETE FROM users WHERE id = 'user_id_here';

-- Delete all non-subscribed users (CAREFUL!)
DELETE FROM users WHERE is_subscribed = false;
```

### Update User Subscription
```sql
-- Manually activate subscription
UPDATE users SET 
    is_subscribed = true, 
    plan = 'core', 
    stripe_customer_id = 'cus_StripeCustomerId' 
WHERE email = 'user@example.com';

-- Cancel subscription
UPDATE users SET 
    is_subscribed = false, 
    plan = 'demo' 
WHERE email = 'user@example.com';

-- Make user admin
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

## Booking Management

### View Bookings
```sql
-- View all bookings
SELECT * FROM bookings ORDER BY event_date DESC;

-- View bookings for specific user
SELECT * FROM bookings WHERE user_id = 'user_id_here' ORDER BY event_date DESC;

-- View upcoming bookings
SELECT client_name, event_date, venue, status 
FROM bookings 
WHERE event_date >= CURRENT_DATE 
ORDER BY event_date ASC;

-- Count bookings by status
SELECT status, COUNT(*) as count FROM bookings GROUP BY status;
```

### Delete Bookings
```sql
-- Delete specific booking
DELETE FROM bookings WHERE id = 'booking_id_here';

-- Delete all bookings for a user
DELETE FROM bookings WHERE user_id = 'user_id_here';

-- Delete old completed bookings (older than 1 year)
DELETE FROM bookings 
WHERE status = 'completed' 
AND event_date < (CURRENT_DATE - INTERVAL '1 year');
```

## Contract Management

### View Contracts
```sql
-- View all contracts
SELECT * FROM contracts ORDER BY created_at DESC;

-- View contracts with signing status
SELECT contract_number, client_name, status, signed_at, created_at 
FROM contracts ORDER BY created_at DESC;

-- View unsigned contracts
SELECT contract_number, client_name, created_at 
FROM contracts 
WHERE status != 'signed' 
ORDER BY created_at DESC;
```

### Delete Contracts
```sql
-- Delete specific contract
DELETE FROM contracts WHERE id = 'contract_id_here';

-- Delete contracts for specific booking
DELETE FROM contracts WHERE enquiry_id = 'booking_id_here';
```

## Invoice Management

### View Invoices
```sql
-- View all invoices
SELECT * FROM invoices ORDER BY created_at DESC;

-- View unpaid invoices
SELECT invoice_number, client_name, total_amount, due_date 
FROM invoices 
WHERE status != 'paid' 
ORDER BY due_date ASC;

-- View overdue invoices
SELECT invoice_number, client_name, total_amount, due_date 
FROM invoices 
WHERE status != 'paid' 
AND due_date < CURRENT_DATE 
ORDER BY due_date ASC;
```

### Update Invoice Status
```sql
-- Mark invoice as paid
UPDATE invoices SET 
    status = 'paid', 
    paid_at = CURRENT_TIMESTAMP 
WHERE invoice_number = 'INV-001';

-- Mark invoice as sent
UPDATE invoices SET status = 'sent' WHERE invoice_number = 'INV-001';
```

## Compliance Documents

### View Compliance
```sql
-- View all compliance documents
SELECT * FROM compliance_documents ORDER BY expiry_date ASC;

-- View expiring documents (next 30 days)
SELECT document_type, expiry_date, user_id 
FROM compliance_documents 
WHERE expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days') 
ORDER BY expiry_date ASC;
```

## Address Book

### View Clients
```sql
-- View all clients
SELECT * FROM address_book ORDER BY created_at DESC;

-- View clients with contact counts
SELECT email, name, contact_count FROM address_book ORDER BY contact_count DESC;

-- Find client by email
SELECT * FROM address_book WHERE email ILIKE '%client@example.com%';
```

## Database Maintenance

### Clean Up Old Data
```sql
-- Delete old sessions (older than 7 days)
DELETE FROM sessions WHERE expire < (NOW() - INTERVAL '7 days');

-- View database table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public';
```

### Database Statistics
```sql
-- Count records in all main tables
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL  
SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'compliance_documents', COUNT(*) FROM compliance_documents
UNION ALL
SELECT 'address_book', COUNT(*) FROM address_book;
```

## Emergency Commands

### Reset Demo User Limits
```sql
-- Reset all users to demo status (CAREFUL!)
UPDATE users SET 
    is_subscribed = false, 
    plan = 'demo' 
WHERE is_admin = false;
```

### Backup Important Data
```sql
-- Export user emails and subscription status
SELECT email, is_subscribed, plan, stripe_customer_id 
FROM users 
WHERE is_subscribed = true;
```

## Warning: Destructive Commands
These commands permanently delete data. Use with extreme caution:

```sql
-- DANGER: Delete all user data
-- DELETE FROM users;

-- DANGER: Delete all bookings  
-- DELETE FROM bookings;

-- DANGER: Reset entire database
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
```

## Quick Reference
- Always backup before running DELETE commands
- Use `WHERE` clauses to limit deletions
- Test with `SELECT` before running `DELETE`
- Check row counts with `SELECT COUNT(*) FROM table_name`
- Use `LIMIT` when testing queries on large datasets