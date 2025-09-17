# AI Gig Suggestions Feature Documentation

## Overview
This feature was designed to provide musicians with AI-powered gig type suggestions based on their selected instruments, with a cost-optimization caching system to reduce API calls.

## Original Architecture

### Database Schema
Two tables were created in `shared/schema.ts`:

```typescript
// Instrument gig type mappings table - stores AI-generated mappings to avoid repeated calls
export const instrumentMappings = pgTable("instrument_mappings", {
  id: serial("id").primaryKey(),
  instrument: varchar("instrument").notNull().unique(), // lowercase instrument name
  gigTypes: text("gig_types").notNull(), // JSON array of gig types
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Global gig types table - stores user's selected gig types for dropdown population
export const globalGigTypes = pgTable("global_gig_types", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  gigTypes: text("gig_types").notNull(), // JSON array of gig types
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Frontend Implementation
Located in `client/src/pages/settings.tsx`:
- Instrument selection checkboxes
- AI-powered gig type generation button
- Custom gig type addition
- Database storage with JSON parsing

### Backend Logic
Located in `server/core/routes.ts`:
- Comprehensive instrument-to-gig-type mapping
- AI suggestions algorithm with 40+ gig categories
- Cost optimization through database caching

## Key Features Implemented
1. **12 AI Suggestions**: Generated contextual gig types based on instrument combinations
2. **40+ Gig Categories**: Comprehensive list including Wedding Ceremony, Jazz Club, Corporate Event, etc.
3. **Smart Combinations**: Piano + vocals = Piano Bar/Jazz Lounge suggestions
4. **Database Caching**: Stored mappings to reduce repeated AI API calls
5. **Custom Types**: Users could add their own gig types
6. **Persistent Storage**: JSON arrays stored in PostgreSQL

## Issues Encountered
1. **JSON Parsing Errors**: Database returned malformed JSON causing frontend crashes
2. **Authentication Problems**: Missing session data prevented API access
3. **API Endpoint Issues**: Missing endpoints caused 404 errors
4. **Database Connection**: Intermittent PostgreSQL connection issues
5. **Complex State Management**: Multiple moving parts caused instability

## Technical Implementation Details

### Instrument Categories Covered
- String instruments (violin, guitar, cello, etc.)
- Brass instruments (trumpet, trombone, etc.)
- Woodwinds (saxophone, clarinet, flute, etc.)
- Keyboard instruments (piano, organ, etc.)
- Percussion instruments
- Electronic/DJ equipment
- Folk/Traditional instruments

### AI Logic Algorithm
```javascript
function generateGigTypesForInstruments(instruments: string[]): string[] {
  const suggestions = new Set<string>();
  
  // Contextual combinations
  if (instrumentList.includes('piano') && instrumentList.includes('vocals')) {
    ['Piano Bar', 'Jazz Lounge', 'Hotel Lobby', 'Wine Bar'].forEach(gig => suggestions.add(gig));
  }
  
  // Returns up to 12 unique suggestions
  return Array.from(suggestions).slice(0, 12);
}
```

## Future Implementation Notes
When re-implementing this feature:

1. **Fix JSON Storage**: Ensure proper JSON array storage in PostgreSQL
2. **Simplify State Management**: Reduce complexity of form state handling
3. **Robust Error Handling**: Better fallbacks for malformed data
4. **Authentication Stability**: Ensure consistent session management
5. **Gradual Rollout**: Test with limited users first

## Files to Restore/Modify
- `shared/schema.ts` - Uncomment instrumentMappings and globalGigTypes tables
- `client/src/pages/settings.tsx` - Re-add instrument/gig type sections
- `server/core/routes.ts` - Re-add AI generation logic and caching endpoints
- `server/core/storage.ts` - Add methods for instrument/gig type management

## Cost Optimization Strategy
The caching system was designed to:
1. Store AI-generated mappings by instrument combinations
2. Serve cached results to users with same instruments
3. Only make new AI API calls for novel instrument combinations
4. Reduce API costs by 80-90% after initial user base establishment

## Status: REMOVED - 2025-07-30
Feature removed due to stability issues and JSON parsing problems. Complete architecture documented for future implementation when system is more stable.