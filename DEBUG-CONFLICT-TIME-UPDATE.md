# Debug: Conflict Resolution Time Update Issue

## Problem
When editing booking times in the conflict resolution dialog and clicking "Save", the `eventTime` and `eventEndTime` are not being saved to the database.

## What Should Happen

1. User clicks "Edit Time" on a booking in conflict dialog
2. Edits the time inputs
3. Clicks "Save"
4. Frontend sends PATCH request to `/api/bookings/:id` with:
   ```json
   {
     "eventTime": "14:00",
     "eventEndTime": "18:00"
   }
   ```
5. Backend receives and processes
6. Supabase storage converts camelCase to snake_case:
   - `eventTime` → `event_time`
   - `eventEndTime` → `event_end_time`
7. Database is updated
8. Frontend refetches and shows new times

## Debugging Steps

### Step 1: Check Frontend Request
Open browser DevTools > Network tab and watch for the PATCH request when you click "Save":

**Look for:**
- Request URL: `/api/bookings/108` (or whatever booking ID)
- Request Method: PATCH
- Request Payload:
  ```json
  {
    "eventTime": "14:00",
    "eventEndTime": "18:00"
  }
  ```

**Question:** Are `eventTime` and `eventEndTime` being sent correctly?

### Step 2: Check Backend Logs
In your server console/logs, look for:

```
🔍 Update booking 108 - Raw request body: {...}
🔄 [SUPABASE-UPDATE] Updating booking 108 with fields: [...]
🔄 [SUPABASE-UPDATE] Update values: {...}
```

**Questions:**
- Do you see `eventTime` and `eventEndTime` in the raw request body?
- Do you see `event_time` and `event_end_time` in the Supabase update fields?
- Do you see any errors?

### Step 3: Check Database Directly
Run this in Supabase SQL Editor:

```sql
-- Check current values
SELECT
  id,
  client_name,
  event_time,
  event_end_time,
  updated_at
FROM bookings
WHERE id = 108;

-- Check the history (if you have updated_at tracking)
SELECT
  id,
  event_time,
  event_end_time,
  updated_at
FROM bookings
WHERE id = 108
ORDER BY updated_at DESC
LIMIT 5;
```

**Question:** Are the values actually NULL/empty in the database, or are they just not displaying correctly?

## Possible Issues

### Issue 1: Frontend Not Sending Data
**Location:** `ConflictResolutionDialog.tsx` line 184-187

The mutation sends:
```typescript
body: {
  eventTime: times.eventTime,
  eventEndTime: times.eventEndTime
}
```

**Check:** Are `times.eventTime` and `times.eventEndTime` actually populated in the state?

**Fix if needed:** Add logging before the mutation:
```typescript
console.log('🕐 Saving times:', times);
```

### Issue 2: Backend Field Mapping
**Location:** `supabase-booking-storage.ts` line 516-518

The `camelToSnake` function converts:
- `eventTime` → `event_time`
- `eventEndTime` → `event_end_time`

**Check:** The mapping should work automatically. But verify in logs that the snake_case names appear.

**Fix if needed:** Add explicit mappings (line 310-320):
```typescript
const fieldMappings: { [key: string]: string } = {
  // ... existing mappings ...
  'eventTime': 'event_time',
  'eventEndTime': 'event_end_time',
};
```

### Issue 3: Values Being Filtered Out
**Location:** `supabase-booking-storage.ts` line 295-307

Empty values are skipped to prevent overwriting existing data:
```typescript
if (numericFields.includes(key) &&
    (updates[key] === '' || updates[key] === undefined || updates[key] === null)) {
  console.log(`⚠️ [SUPABASE] Skipping empty field '${key}' to preserve existing data`);
  return; // Skip empty numeric fields entirely
}
```

**Question:** Are `eventTime` and `eventEndTime` being treated as numeric fields and skipped?

**Answer:** No, they're not in the `numericFields` array, so this shouldn't affect them.

### Issue 4: Column Type Mismatch
**Location:** Database schema

Schema shows:
```typescript
eventTime: varchar("event_time"),
eventEndTime: varchar("event_end_time"),
```

**Question:** Is Supabase expecting a different format?

**Test:** Try setting values directly in SQL:
```sql
UPDATE bookings
SET event_time = '14:00',
    event_end_time = '18:00'
WHERE id = 108;

-- Then check if it worked
SELECT id, event_time, event_end_time FROM bookings WHERE id = 108;
```

If this works, the issue is in the application code.

### Issue 5: RLS Blocking Updates
**Unlikely but possible:** RLS policies might block the update.

**Check:** Your RLS policy for bookings:
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'bookings';
```

**Expected:** Should allow UPDATE for own bookings:
```sql
CREATE POLICY "bookings_update_own" ON bookings FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.supabase_uid = auth.uid()::text AND u.id = bookings.user_id)
  OR is_admin(auth.uid())
);
```

**Test:** Try the update with service role (should always work) vs user role.

## Quick Test in Production

1. Open conflict dialog
2. Click "Edit Time" on a booking
3. Change times
4. Open browser console and run:
   ```javascript
   // Before clicking Save, inspect the state
   console.log('Current edited times:', editedTimes)
   ```
5. Click "Save"
6. Watch Network tab for the PATCH request
7. Check server logs
8. Check database

## Most Likely Cause

Based on the code review, the most likely issues are:

1. **State not updating properly** - The `editedTimes` state might not be populated correctly
2. **Request not including the fields** - The API request might not include `eventTime`/`eventEndTime`
3. **Backend silently filtering** - The values might be empty strings and getting filtered out

## Recommended Fix

Add debugging to the frontend first:

```typescript
const saveInlineEdit = (bookingId: number) => {
  const times = editedTimes[bookingId];
  console.log('🕐 [CONFLICT] Saving times for booking', bookingId, times);

  if (!times) {
    console.error('❌ [CONFLICT] No times found in editedTimes state!');
    return;
  }

  if (!times.eventTime || !times.eventEndTime) {
    console.warn('⚠️ [CONFLICT] Empty times detected:', times);
  }

  saveInlineEditMutation.mutate({ bookingId, times });
};
```

Then check the logs to see where it's failing.
