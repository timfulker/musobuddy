# Inbound Email Logging

## Overview
All emails received via SendGrid Inbound Parse webhooks are now logged to a dedicated database table for monitoring and debugging.

## Database Table: `inbound_email_log`

### Schema
```sql
CREATE TABLE inbound_email_log (
  id SERIAL PRIMARY KEY,
  webhook_type VARCHAR NOT NULL,           -- 'enquiries' or 'replies'
  from_email VARCHAR NOT NULL,
  from_name VARCHAR,
  to_email VARCHAR NOT NULL,
  subject TEXT,
  text_content TEXT,
  html_content TEXT,
  user_id VARCHAR REFERENCES users(id),    -- Extracted from email address
  booking_id INTEGER,                      -- Extracted from email address
  attachment_count INTEGER DEFAULT 0,
  attachment_names JSONB,                  -- Array of filenames
  raw_headers JSONB,
  spam_score DECIMAL(5, 2),
  processing_status VARCHAR DEFAULT 'received',  -- 'received', 'processed', 'failed'
  error_message TEXT,
  received_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);
```

### Indexes
- `from_email` - Find all emails from a specific sender
- `to_email` - Find all emails to a specific recipient
- `user_id` - Find all emails for a specific user
- `booking_id` - Find all emails for a specific booking
- `received_at` - Sort by date
- `webhook_type` - Filter by enquiries vs replies

## Logged Data

### For Enquiries (`/api/webhook/sendgrid-enquiries`)
- Full email content (text and HTML)
- Sender information
- Recipient (e.g., `tim@enquiries.musobuddy.com`)
- Subject line
- Attachments (count and filenames)
- Spam score
- Raw headers

### For Replies (`/api/webhook/sendgrid-replies`)
- Everything above, PLUS:
- Extracted `userId` from email address
- Extracted `bookingId` from email address
- Example: `user123-booking456@mg.musobuddy.com` → userId=123, bookingId=456

## Querying the Log

### Recent inbound emails
```sql
SELECT
  webhook_type,
  from_email,
  subject,
  received_at
FROM inbound_email_log
ORDER BY received_at DESC
LIMIT 50;
```

### Emails for a specific booking
```sql
SELECT *
FROM inbound_email_log
WHERE booking_id = 123
ORDER BY received_at DESC;
```

### Emails from a specific client
```sql
SELECT *
FROM inbound_email_log
WHERE from_email = 'client@example.com'
ORDER BY received_at DESC;
```

### Failed processing
```sql
SELECT *
FROM inbound_email_log
WHERE processing_status = 'failed'
ORDER BY received_at DESC;
```

## Migration

Run the migration:
```bash
psql $DATABASE_URL < server/migrations/add-inbound-email-log.sql
```

## Benefits

1. **Visibility** - See all emails coming into the system
2. **Debugging** - Track down missing or failed emails
3. **Audit Trail** - Complete record of all client communications
4. **Analytics** - Analyze response times, volumes, etc.
5. **Spam Detection** - Monitor spam scores

## Notes

- Logging is non-blocking - webhook will succeed even if logging fails
- Full email content is stored (text and HTML)
- Attachments are logged by name only (files are stored separately)
- Processing status can be updated as emails are processed by the system
