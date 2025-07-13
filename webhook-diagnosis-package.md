# Webhook Diagnosis Package for External Review

## Problem Summary
- `timfulker@gmail.com` emails create proper enquiries with full client information
- `timfulkermusic@gmail.com` emails create "Unknown" enquiries with no client data
- Both emails reach webhook with 200 OK responses (confirmed by Mailgun logs)
- Issue is in field extraction logic within the webhook handler

## Key Files for Analysis

### 1. Current Webhook Handler
**File**: `server/index.ts` (lines 24-123)
- Contains the diagnostic webhook implementation
- Extracts email fields using regex patterns
- Creates enquiry records in database

### 2. Database Schema
**File**: `shared/schema.ts`
- Defines enquiry table structure and validation
- Shows required fields and constraints

### 3. Storage Layer
**File**: `server/storage.ts`
- Contains `createEnquiry()` function
- Handles database insertion logic

### 4. Database Evidence
**Working Email** (timfulker@gmail.com):
```sql
id: 333
client_name: "Tim Fulker"
client_email: "timfulker@gmail.com"
title: "1411 test 1"
notes: "Full message content with proper formatting"
created_at: 2025-07-13 13:12:20.957022
```

**Failing Email** (timfulkermusic@gmail.com):
```sql
id: 334
client_name: "Unknown"
client_email: null
title: "Email from Unknown"
notes: "Email enquiry with no body content"
created_at: 2025-07-13 13:12:28.4546
```

## Mailgun Evidence
- Both emails delivered successfully (200 OK responses)
- Timestamps show both emails processed within 8 seconds
- No delivery failures reported

## Current Extraction Logic (Lines 42-56 in server/index.ts)
```javascript
// Email extraction
const emailMatch = from.match(/[\w.-]+@[\w.-]+\.\w+/);
const clientEmail = emailMatch ? emailMatch[0] : from;

// Name extraction
let clientName = 'Unknown';
if (from.includes('<')) {
  const nameMatch = from.match(/^([^<]+)/);
  if (nameMatch) {
    clientName = nameMatch[1].trim();
  }
} else if (clientEmail && clientEmail !== 'NO_FROM_FIELD') {
  clientName = clientEmail.split('@')[0];
}
```

## Fields Expected from Mailgun
- `req.body.From` or `req.body.from` or `req.body.sender`
- `req.body.Subject` or `req.body.subject`
- `req.body['body-plain']` or `req.body['stripped-text']` or `req.body.text`

## Hypothesis
The `timfulkermusic@gmail.com` email is being sent by Mailgun in a format that:
1. Doesn't match the email regex pattern
2. Doesn't contain expected field names
3. Has malformed From header that extraction logic can't parse

## Next Steps for External Developer
1. Review the webhook extraction logic for edge cases
2. Test with different email formats to identify the specific failure pattern
3. Check if Mailgun sends different field names for certain email providers
4. Implement more robust extraction logic with better fallbacks

## Debug Log Location
- Enhanced logging writes to `/tmp/webhook-debug-{requestId}.json`
- Contains complete webhook payload for analysis
- File logging added but no recent webhook calls to capture data

## Replication Steps
1. Send email from `timfulker@gmail.com` to `leads@musobuddy.com` → Works
2. Send email from `timfulkermusic@gmail.com` to `leads@musobuddy.com` → Fails extraction
3. Check database for "Unknown" entries vs proper client data
4. Review Mailgun logs for 200 OK responses from both emails

## Contact Information
User experiencing this issue can be reached for additional testing and validation.