# Database Field Mapping Analysis
**Generated:** 2025-01-31

## PROBLEM IDENTIFIED: Time Field Inconsistency

### Root Cause
Some bookings store combined time ranges (e.g., "18:00-20:00") in the `event_time` field, while the form expects separate `eventTime` and `eventEndTime` values.

### Database Schema (shared/schema.ts)
```typescript
eventTime: varchar("event_time"),        // Database column: event_time
eventEndTime: varchar("event_end_time"), // Database column: event_end_time
```

### Form Fields (BookingDetailsDialog.tsx)
```typescript
eventTime: "",      // Expects start time only: "18:00"
eventEndTime: "",   // Expects end time only: "20:00"
```

## Current Database State Analysis

### Consistent Bookings (Working Correctly)
```
ID 7188: eventTime="16:00", eventEndTime="18:00" ✅
ID 7187: eventTime="13:00", eventEndTime=null    ✅
ID 7186: eventTime="15:00", eventEndTime="17:00" ✅
ID 7185: eventTime="10:00", eventEndTime="12:00" ✅
ID 7184: eventTime="18:30", eventEndTime="22:00" ✅
ID 7183: eventTime="14:00", eventEndTime="17:00" ✅
```

### Inconsistent Bookings (Causing "--:--" Display)
```
ID 7180: eventTime="18:00-20:00", eventEndTime=null ❌
ID 7159: eventTime="16:00-20:00", eventEndTime=null ❌
ID 7158: eventTime="19:00-23:00", eventEndTime=null ❌
ID 7153: eventTime="19:00 - 23:00", eventEndTime=null ❌
```

## Technical Solution Applied

### Updated booking-formatter.ts
Added intelligent time range parsing that:
1. Detects combined time ranges (contains "-")
2. Splits "18:00-20:00" into eventTime="18:00" and eventEndTime="20:00"
3. Handles variations like "18:00 - 20:00" (with spaces)
4. Maintains backward compatibility with separate fields

### Code Logic
```javascript
// Check if time contains range
if (rawTimeValue && rawTimeValue.includes('-')) {
  const timeRange = rawTimeValue.split('-').map(t => t.trim());
  if (timeRange.length === 2) {
    startTime = timeRange[0];  // "18:00"
    endTime = timeRange[1];    // "20:00"
  }
}
```

## Expected Result
- Booking ID 7180: eventTime="18:00", eventEndTime="20:00"
- Form will now display "18:00" and "20:00" instead of "--:--"
- Booking list display remains unchanged (still shows "18:00-20:00")

## Files Modified
1. `server/core/booking-formatter.ts` - Added time range parsing
2. `client/src/components/BookingDetailsDialog.tsx` - Added debugging logs
3. `booking-database-export.csv` - Raw database export for Excel review

## Test Case
- Open booking #7180 (Tim Fulker, Dorchester hotel)
- Times should now display correctly in form fields
- Check console for debug output showing parsed time values