# Booking Lifecycle Migration Strategy

## Overview
This document outlines the safe migration from the current complex booking status system to a simplified 4-5 status system with optional progress tags.

## Current Status System (Complex)
- `new` - Initial enquiry
- `booking_in_progress` - Being worked on
- `contract_sent` - Contract has been sent
- `confirmed` - Booking is confirmed
- `completed` - Booking is finished
- `rejected` - Booking was declined

## New Status System (Simplified)
1. **Enquiry** - Not yet handled
2. **Quoted** - You've responded or sent a contract
3. **Confirmed** - Agreement made, booked
4. **Completed** - Event finished
5. **Cancelled** - Rejected or cancelled

## Progress Tags (Optional)
- 📤 Contract Sent
- 🖋️ Contract Signed
- 💸 Invoice Sent
- 💳 Deposit Paid
- 💰 Paid in Full

## Migration Strategy

### Phase 1: Database Schema (✅ COMPLETED)
- Added new boolean fields to track progress states:
  - `contractSent` - Contract has been sent
  - `contractSigned` - Contract has been signed
  - `invoiceSent` - Invoice has been sent
  - `paidInFull` - Payment received in full
  - `depositPaid` - Deposit has been paid
- Added financial tracking fields:
  - `quotedAmount` - Amount quoted to client
  - `depositAmount` - Deposit amount if required
  - `finalAmount` - Final agreed amount
- **Preserved existing status field** to maintain backward compatibility

### Phase 2: Status Mapping System (✅ COMPLETED)
- Created `booking-status-mapper.ts` utility
- Maps old statuses to new simplified statuses
- Extracts progress tags from both old status and new boolean fields
- Maintains backward compatibility with existing code

### Phase 3: Gradual UI Updates (IN PROGRESS)
- Update CTA buttons to use new mapping system
- Add progress tags component for visual indicators
- Gradually update booking pages to show new status structure
- Keep existing functionality intact

### Phase 4: Data Migration (PLANNED)
- Script to analyze existing bookings
- Set appropriate progress tags based on current status
- Migrate old statuses to new simplified ones
- Verify all functionality works with new system

### Phase 5: Code Cleanup (PLANNED)
- Remove old status handling code
- Update all UI components to use new system
- Remove backward compatibility code
- Update documentation

## Benefits of New System

### Pros
- **Cleaner Flow**: Clear progression from Enquiry → Quoted → Confirmed → Completed
- **Flexible Progress Tracking**: Tags show exactly what's been done
- **Better Analytics**: Easier to track conversion rates and bottlenecks
- **Improved UX**: Visual progress indicators for each booking
- **Simplified Logic**: Fewer status combinations to handle

### Cons
- **Migration Complexity**: Requires careful planning to avoid breaking changes
- **Data Integrity**: Need to ensure all existing data is properly migrated
- **Testing Required**: All existing functionality must be thoroughly tested

## Implementation Notes

### Status Mapping
```typescript
// Old status → New status + tags
'new' → 'enquiry' + {}
'booking_in_progress' → 'quoted' + {}
'contract_sent' → 'quoted' + { contractSent: true }
'confirmed' → 'confirmed' + { contractSigned: true }
'completed' → 'completed' + { contractSigned: true, paidInFull: true }
'rejected' → 'cancelled' + {}
```

### Progress Tags Logic
Tags are determined by:
1. Explicit boolean fields in database (preferred)
2. Inferred from old status values (fallback)
3. Related contract/invoice records (validation)

## Testing Strategy
1. **Unit Tests**: Test status mapping functions
2. **Integration Tests**: Verify CTA buttons work with new system
3. **E2E Tests**: Test complete booking lifecycle
4. **Data Validation**: Ensure no bookings are lost or corrupted
5. **User Acceptance**: Verify UI improvements meet user needs

## Rollback Plan
If issues arise:
1. Revert to old status system
2. Keep new database fields for future migration
3. Remove new UI components
4. Document lessons learned

## Timeline
- **Phase 1**: ✅ Completed (Database schema)
- **Phase 2**: ✅ Completed (Status mapping)
- **Phase 3**: 🔄 In Progress (UI updates)
- **Phase 4**: 📅 Planned (Data migration)
- **Phase 5**: 📅 Planned (Code cleanup)