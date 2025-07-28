# MusoBuddy Conflict Detection Rules

## Overview
MusoBuddy automatically detects booking conflicts to help musicians avoid double-bookings and scheduling issues. The system uses a color-coded severity system to indicate different types of conflicts.

## Conflict Detection Logic

### Primary Rule: Same Day Detection
- **Trigger**: Any two bookings on the same date
- **Result**: Automatic conflict detection runs

### Time Overlap Analysis
The system then analyzes the specific times to determine conflict severity:

## Conflict Severity Levels

### 🔴 **HARD CONFLICTS (Red/Critical)**
- **When**: Two bookings have overlapping performance times
- **Example**: 
  - Booking A: 19:00 - 22:00
  - Booking B: 20:00 - 23:00
  - **Overlap**: 20:00 - 22:00 (2 hours)
- **Logic**: `startTime1 < endTime2 && endTime1 > startTime2`
- **Action Required**: One booking must be cancelled or rescheduled
- **UI Display**: Red "Conflict" badge, red dot indicator

### 🟡 **SOFT CONFLICTS (Amber/Warning)**  
- **When**: Two bookings on same day but no time overlap
- **Example**:
  - Booking A: 14:00 - 17:00
  - Booking B: 19:00 - 22:00
  - **Gap**: 2 hours between performances
- **Logic**: Same date but times don't overlap
- **Consideration**: Travel time, setup, breakdown between venues
- **UI Display**: Amber "Conflict" badge, yellow dot indicator

### ⚪ **NO CONFLICT (None)**
- **When**: Bookings on different dates
- **UI Display**: No conflict indicators shown

## Technical Implementation

### Database Fields
- `event_start_time`: Performance start time (e.g., "19:00")
- `event_finish_time`: Performance end time (e.g., "22:00")
- `event_date`: Date of performance

### Time Overlap Calculation
```javascript
// Simplified logic
const hasTimeOverlap = (booking1, booking2) => {
  const start1 = parseTime(booking1.eventStartTime);
  const end1 = parseTime(booking1.eventFinishTime);
  const start2 = parseTime(booking2.eventStartTime);
  const end2 = parseTime(booking2.eventFinishTime);
  
  return start1 < end2 && end1 > start2;
};
```

### Conflict Severity Assignment
```javascript
if (sameDate) {
  if (hasTimeOverlap) {
    severity = 'hard';  // Red conflict
  } else {
    severity = 'soft';  // Amber conflict  
  }
}
```

## Current Behavior Analysis - CONFIRMED BUG IDENTIFIED

Based on your screenshot showing Sarah Johnson (14:00-17:00) and Kelly Boyd (19:00-22:00):

### Expected Result: 🟡 SOFT CONFLICT
- ✅ Same date: 30/08/2025  
- ❌ No time overlap: 2-hour gap between bookings (17:00 finish to 19:00 start)
- **Should display**: Amber/yellow conflict indicators

### Actual Result After Fix: 🟡 SOFT CONFLICT ✅
- ✅ System now correctly showing amber/orange "Conflict" badges  
- ✅ Properly detecting same-day non-overlapping bookings as soft conflicts

### Manual Time Overlap Verification
```
Sarah Johnson: 14:00-17:00 (840-1020 minutes)
Kelly Boyd: 19:00-22:00 (1140-1320 minutes)
Gap: 19:00 - 17:00 = 2 hours (no overlap)
Overlap formula: 840 < 1320 && 1020 > 1140 = true && false = FALSE
Expected severity: SOFT (amber)
Actual severity: HARD (red) ← BUG
```

### Root Cause Identified & FIXED ✅
The conflict detection system had a bug in the frontend where:
1. Frontend defaulted to `severity = 'hard'` and `hasTimeOverlap = true` 
2. Used incorrect string comparison logic for time overlaps
3. Backend was working correctly but frontend overrode the proper logic

**BUG FIX APPLIED**: Updated frontend conflict detection to:
- Default to `severity = 'soft'` and `hasTimeOverlap = false`
- Use proper time parsing and overlap detection logic matching backend
- Parse time format correctly with ' - ' separator instead of '-'

## Conflict Resolution Options

### For Hard Conflicts (Red)
- **Cancel one booking**: Remove conflicting appointment
- **Reschedule**: Move one booking to different date/time
- **Negotiate times**: Adjust performance duration to eliminate overlap

### For Soft Conflicts (Amber)
- **Check travel time**: Ensure realistic travel between venues
- **Confirm logistics**: Setup/breakdown time requirements
- **Accept risk**: Proceed if confident in timing
- **Add buffer time**: Adjust times to create larger gaps

## Visual Indicators

### Dashboard/List View
- **Conflict Badge**: Text badge showing "⚠️ Conflict" 
- **Conflict Dot**: Colored dot in top-right corner of booking card
- **Status Colors**: 
  - Red dot/badge = Hard conflict (time overlap)
  - Yellow dot/badge = Soft conflict (same day, no overlap)

### Conflict Resolution Dialog
- **Severity indicator**: Color-coded header
- **Time comparison**: Side-by-side time display
- **Overlap details**: Specific overlap duration for hard conflicts
- **Resolution buttons**: Edit, reschedule, or resolve options

## Settings & Customization

### Future Enhancements
- **Buffer time settings**: Configure minimum gap between bookings
- **Travel time consideration**: Factor in venue-to-venue travel
- **Venue-specific rules**: Different rules for home studio vs external venues
- **Client priority levels**: VIP clients override conflict warnings

## Troubleshooting

### If Conflicts Aren't Detected
1. Check booking dates are properly set
2. Verify time formats (HH:MM)
3. Confirm both start and finish times are populated
4. Check database schema for correct field names

### If Wrong Conflict Severity
1. Verify time overlap calculation logic
2. Check soft conflict detection implementation  
3. Ensure UI displays correct severity colors
4. Test with various time combinations

## Test Scenarios

### Hard Conflict Test Cases
- 19:00-22:00 vs 20:00-23:00 (1 hour overlap)
- 14:00-18:00 vs 16:00-20:00 (2 hour overlap)
- 10:00-12:00 vs 11:30-13:30 (30 min overlap)

### Soft Conflict Test Cases  
- 14:00-17:00 vs 19:00-22:00 (2 hour gap)
- 10:00-12:00 vs 15:00-18:00 (3 hour gap)
- 09:00-11:00 vs 13:00-16:00 (2 hour gap)

### No Conflict Test Cases
- Different dates entirely
- Same date but one booking cancelled/completed

---

**Last Updated**: July 28, 2025  
**Status**: Active conflict detection system with field name improvements (eventStartTime/eventFinishTime)