# Improved Conflict Detection System

## Current Problems
1. **Date-only detection**: Doesn't consider actual time overlaps
2. **No prevention**: Just shows warnings, doesn't prevent conflicts
3. **Static detection**: Conflicts not updated when bookings change
4. **Poor time parsing**: "3-5pm" vs "15:00" vs "3:00pm - 5:00pm" inconsistencies

## Better Approach: Time-Based Conflict Prevention

### 1. Standardized Time Format
```typescript
interface TimeSlot {
  startTime: string; // "14:00" format
  endTime: string;   // "16:00" format
  date: Date;        // Full date
}

interface Event {
  id: number;
  type: 'enquiry' | 'booking';
  timeSlot: TimeSlot;
  status: 'pending' | 'confirmed' | 'cancelled';
  priority: number; // 1=booking, 2=confirmed enquiry, 3=pending enquiry
}
```

### 2. Real-Time Conflict Detection
```typescript
function detectTimeConflicts(newEvent: Event, existingEvents: Event[]): ConflictResult {
  const conflicts = existingEvents.filter(event => {
    // Same date check
    if (!isSameDay(newEvent.timeSlot.date, event.timeSlot.date)) return false;
    
    // Time overlap check
    return isTimeOverlap(newEvent.timeSlot, event.timeSlot);
  });
  
  return {
    hasConflicts: conflicts.length > 0,
    conflictLevel: getConflictLevel(conflicts),
    canOverride: canOverrideConflict(newEvent, conflicts),
    recommendations: getRecommendations(newEvent, conflicts)
  };
}

function isTimeOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  const start1 = parseTime(slot1.startTime);
  const end1 = parseTime(slot1.endTime);
  const start2 = parseTime(slot2.startTime);
  const end2 = parseTime(slot2.endTime);
  
  return start1 < end2 && end1 > start2;
}
```

### 3. Conflict Prevention Levels

#### Level 1: Hard Conflicts (Prevent)
- Confirmed booking vs new confirmed booking
- **Action**: Block creation, force user to reschedule

#### Level 2: Soft Conflicts (Warn)
- Confirmed booking vs new enquiry
- **Action**: Show warning, allow with confirmation

#### Level 3: Potential Conflicts (Notice)
- Enquiry vs enquiry on same date
- **Action**: Show notice, allow normally

### 4. Calendar Integration
```typescript
// Calendar view shows time slots
const calendarDayView = {
  timeSlots: [
    { time: "09:00", event: null, available: true },
    { time: "10:00", event: null, available: true },
    { time: "11:00", event: null, available: true },
    { time: "12:00", event: null, available: true },
    { time: "13:00", event: booking88, available: false }, // Solo booking
    { time: "14:00", event: booking88, available: false }, // Solo booking continues
    { time: "15:00", event: enquiry402, available: false, conflict: true }, // Tim enquiry
    { time: "16:00", event: enquiry402, available: false, conflict: true },
    { time: "17:00", event: null, available: true },
  ]
};
```

### 5. Smart Suggestions
```typescript
function suggestAlternatives(conflictingEvent: Event, conflicts: Event[]): Suggestion[] {
  return [
    {
      type: 'reschedule',
      message: 'Move to next available slot',
      newTimeSlot: findNextAvailableSlot(conflictingEvent.timeSlot),
      confidence: 'high'
    },
    {
      type: 'negotiate',
      message: 'Ask client for alternative times',
      alternatives: getAvailableSlots(conflictingEvent.timeSlot.date),
      confidence: 'medium'
    },
    {
      type: 'decline',
      message: 'Politely decline this enquiry',
      template: 'Sorry, I already have a booking at that time...',
      confidence: 'low'
    }
  ];
}
```

## Implementation Strategy

### Phase 1: Time Standardization
1. Add `startTime` and `endTime` fields to enquiries/bookings
2. Create time parsing utility for various formats
3. Migrate existing data to standardized format

### Phase 2: Real-Time Detection
1. Implement time overlap detection
2. Add conflict prevention at creation time
3. Update calendar to show time slots

### Phase 3: Smart Calendar
1. Visual time slot calendar
2. Drag-and-drop rescheduling
3. Available time suggestions

### Phase 4: AI-Powered Suggestions
1. Smart conflict resolution recommendations
2. Automated client communication
3. Predictive conflict prevention

## Benefits
- **Prevents actual double-bookings**: Time-based, not just date-based
- **Real-time validation**: Conflicts detected at creation time
- **Better user experience**: Clear visual feedback and suggestions
- **Professional reliability**: Never accidentally double-book clients
- **Automated conflict resolution**: AI suggestions for handling conflicts

## Database Changes Required
```sql
-- Add time fields to enquiries
ALTER TABLE enquiries ADD COLUMN start_time TIME;
ALTER TABLE enquiries ADD COLUMN end_time TIME;

-- Add time fields to bookings
ALTER TABLE bookings ADD COLUMN start_time TIME;
ALTER TABLE bookings ADD COLUMN end_time TIME;

-- Create conflicts tracking table
CREATE TABLE booking_conflicts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  event_id INTEGER NOT NULL,
  event_type VARCHAR NOT NULL, -- 'enquiry' or 'booking'
  conflict_with_id INTEGER NOT NULL,
  conflict_with_type VARCHAR NOT NULL,
  severity VARCHAR NOT NULL, -- 'high', 'medium', 'low'
  status VARCHAR NOT NULL DEFAULT 'active', -- 'active', 'resolved', 'ignored'
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```