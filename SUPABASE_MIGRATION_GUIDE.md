# Supabase Migration Guide

## Current State After Rollback

### What's Currently in Place:
- **Neon Database**: Using PostgreSQL with Drizzle ORM
- **Simple Configuration**: `server/db.ts` uses single `DATABASE_URL` environment variable
- **Schema**: Defined in `shared/schema.ts` using Drizzle
- **Authentication**: Firebase Auth (separate from database)

### Files That Were Rolled Back:
- ❌ `server/config/database.ts` (removed)
- ❌ `DATABASE_SETUP_GUIDE.md` (removed)
- ❌ `schema_only.sql` (removed)
- ✅ `.env` cleaned up to simple configuration

## Why Consider Supabase?

Supabase offers several advantages over Neon:

1. **Integrated Auth**: Built-in authentication (could replace Firebase)
2. **Real-time**: WebSocket subscriptions for live updates
3. **Storage**: Built-in file storage for images/documents
4. **Edge Functions**: Serverless functions
5. **Better Free Tier**: More generous limits
6. **Row Level Security**: Fine-grained access control

## Migration Strategy

### Option 1: Full Migration (Recommended)
Replace both Neon database and Firebase Auth with Supabase.

**Pros:**
- Single platform for database + auth
- Better integration
- Simpler architecture
- Real-time capabilities

**Cons:**
- Larger migration effort
- Need to migrate all user accounts
- Update all auth-related code

### Option 2: Database Only
Keep Firebase Auth, migrate only database to Supabase.

**Pros:**
- Smaller migration scope
- No auth code changes
- Users don't need to reset passwords

**Cons:**
- Still managing two services
- Missing out on integrated auth benefits

## Migration Steps

### Phase 1: Preparation

1. **Export Current Data**
```bash
# Export schema and data from Neon
pg_dump DATABASE_URL > neon_backup.sql

# Or use Drizzle to generate schema
npx drizzle-kit generate:pg
```

2. **Create Supabase Project**
- Sign up at https://supabase.com
- Create new project
- Note connection details

3. **Analyze Schema Compatibility**
- Review `shared/schema.ts`
- Check for Neon-specific features
- Plan type mappings

### Phase 2: Database Setup

1. **Update Dependencies**
```bash
# Remove Neon packages
npm uninstall @neondatabase/serverless

# Add Supabase packages
npm install @supabase/supabase-js
npm install drizzle-orm @supabase/postgres-js
```

2. **Update Database Connection** (`server/db.ts`)
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
```

3. **Import Data**
```bash
# Import to Supabase
psql SUPABASE_DATABASE_URL < neon_backup.sql
```

### Phase 3: Auth Migration (If Full Migration)

1. **Export Firebase Users**
- Use Firebase Admin SDK to export users
- Generate migration script

2. **Setup Supabase Auth**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)
```

3. **Update Auth Hooks**
- Replace Firebase auth calls
- Update `useAuth` hook
- Migrate session management

### Phase 4: Testing

1. **Database Operations**
- Test all CRUD operations
- Verify data integrity
- Check performance

2. **Authentication** (if migrated)
- Test login/logout
- Password reset
- Session persistence

3. **Features**
- Bookings system
- Settings management
- Invoice generation
- Contract handling

### Phase 5: Deployment

1. **Environment Variables**
```env
# Supabase Configuration
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

2. **Update CI/CD**
- Update deployment scripts
- Configure production environment

## Code Changes Required

### 1. Database Connection
- `server/db.ts` - Update connection method
- Remove WebSocket configuration

### 2. Schema Updates
- Keep Drizzle schema largely unchanged
- Add RLS policies if needed

### 3. Auth Updates (Full Migration)
- `hooks/useAuth.tsx` - Replace Firebase with Supabase
- `lib/firebase.ts` - Replace or remove
- All auth-related API routes

### 4. Real-time Features (Optional)
```typescript
// Example: Real-time booking updates
const { data, error } = supabase
  .from('bookings')
  .on('INSERT', payload => {
    console.log('New booking!', payload)
  })
  .subscribe()
```

## Migration Timeline

### Week 1: Planning & Setup
- Create Supabase project
- Export current data
- Set up development environment

### Week 2: Database Migration
- Import schema and data
- Update connection code
- Test database operations

### Week 3: Auth Migration (if applicable)
- Export Firebase users
- Implement Supabase auth
- Test authentication flow

### Week 4: Testing & Deployment
- Comprehensive testing
- Fix issues
- Deploy to production

## Rollback Plan

Keep Neon database running during migration:
1. Use feature flags to switch between databases
2. Maintain data sync during transition
3. Keep backups of both systems
4. Document rollback procedures

## Cost Comparison

### Current (Neon + Firebase)
- Neon: ~$19/month (Pro tier)
- Firebase: ~$0-25/month (Spark/Blaze)
- Total: ~$19-44/month

### Supabase
- Free tier: 500MB database, 2GB bandwidth
- Pro tier: $25/month (8GB database, 50GB bandwidth)
- Includes auth, storage, edge functions

## Decision Checklist

Before proceeding, confirm:

- [ ] All stakeholders informed
- [ ] Backup strategy in place
- [ ] Development environment ready
- [ ] Migration timeline acceptable
- [ ] Rollback plan documented
- [ ] Cost implications understood
- [ ] Team trained on Supabase

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Drizzle + Supabase](https://orm.drizzle.team/docs/quick-postgresql/supabase)
- [Migration Tools](https://github.com/supabase/migrate)
- [Firebase to Supabase](https://supabase.com/docs/guides/migrations/firebase-auth)

## Next Steps

1. **Immediate**: Review this guide with your team
2. **This Week**: Create Supabase account and test environment
3. **Next Week**: Begin Phase 1 preparation
4. **Decision Point**: Choose full or partial migration after testing