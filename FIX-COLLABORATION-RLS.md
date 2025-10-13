# Fix: Booking Collaboration with RLS

## The Problem

The booking collaboration feature allows clients to edit booking details via a shareable link with a token. This feature is broken because:

1. **Backend uses Supabase** with service role
2. **Service role should bypass RLS** automatically
3. **But it's failing with 403** on production

## Root Cause Analysis

The 403 error occurs at this endpoint:
```
/api/booking-collaboration/108/verify?token=6b95aebc...
```

This could be caused by:

### Scenario A: Token Mismatch (Most Likely)
- The token in the URL doesn't match the `collaboration_token` in the database
- The booking exists but token validation fails
- Returns 403 with "Invalid collaboration link"

### Scenario B: Booking Doesn't Exist
- Booking ID 108 doesn't exist in production database
- Returns 403

### Scenario C: Service Role Not Configured
- Backend isn't using service role key properly
- RLS blocks the query
- Returns 403

## Solution 1: Debug the Actual Issue

Run this in **PRODUCTION** Supabase SQL Editor:

```sql
-- Check if booking 108 exists and has a token
SELECT
  id,
  client_name,
  collaboration_token IS NOT NULL as has_token,
  LEFT(collaboration_token, 16) as token_preview,
  user_id
FROM bookings
WHERE id = 108;
```

**Expected Results:**
- If booking doesn't exist → Need to investigate why
- If `has_token = false` → Token was never generated
- If token preview doesn't match URL → Token mismatch

## Solution 2: Verify Service Role is Being Used

Check your production environment variables:

```bash
# In production, verify these are set:
SUPABASE_URL_PROD=https://your-project.supabase.co
SUPABASE_SERVICE_KEY_PROD=eyJ... (service_role key, NOT anon key)
NODE_ENV=production
```

The service role key should:
- Start with `eyJ`
- Be labeled "service_role" in Supabase Dashboard > Settings > API
- **NOT** be the "anon" key

## Solution 3: Add Explicit RLS Bypass Policy for Collaboration

If the backend IS using service role correctly, RLS should already be bypassed. But as a safeguard, we can add a special RLS policy that allows access via valid collaboration tokens:

```sql
-- Add to your RLS policies for bookings table

-- Allow access to bookings via valid collaboration token
-- This is a fallback in case service role isn't working properly
CREATE POLICY "bookings_collaboration_token_access" ON bookings FOR SELECT
USING (
  -- Allow if the request includes a valid collaboration token
  -- Note: This requires passing the token via RPC or app metadata
  collaboration_token IS NOT NULL
  AND collaboration_token = current_setting('request.jwt.claims.collaboration_token', true)
);
```

**However**, this approach has limitations because you'd need to pass the token through the JWT claims, which isn't how your current setup works.

## Solution 4: Use RPC Function for Token-Based Access

Create a PostgreSQL function that bypasses RLS for collaboration access:

```sql
-- Create a function that validates collaboration token and returns booking data
CREATE OR REPLACE FUNCTION get_booking_by_collaboration_token(
  p_booking_id integer,
  p_token text
)
RETURNS TABLE (
  id integer,
  client_name text,
  event_date date,
  venue text,
  event_type text
)
SECURITY DEFINER  -- This runs with the function owner's privileges (bypasses RLS)
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.client_name,
    b.event_date,
    b.venue,
    b.event_type
  FROM bookings b
  WHERE b.id = p_booking_id
    AND b.collaboration_token = p_token;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_booking_by_collaboration_token(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_by_collaboration_token(integer, text) TO anon;
```

Then update your backend code to use this function:

```typescript
// In booking-collaboration-routes.ts
app.get('/api/booking-collaboration/:bookingId/verify', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ error: 'Collaboration token required' });
    }

    // Use the RPC function instead of direct query
    const { data: booking, error } = await supabase
      .rpc('get_booking_by_collaboration_token', {
        p_booking_id: parseInt(bookingId),
        p_token: token
      });

    if (error || !booking || booking.length === 0) {
      console.log(`❌ [COLLABORATION] Invalid token or booking not found for booking ${bookingId}`);
      return res.status(403).json({ error: 'Invalid collaboration link' });
    }

    const validBooking = booking[0];
    console.log(`✅ [COLLABORATION] Valid collaboration access for booking ${bookingId}`);

    res.json({
      bookingId: validBooking.id,
      clientName: validBooking.client_name,
      eventDate: validBooking.event_date,
      venue: validBooking.venue,
      eventType: validBooking.event_type,
      isCollaborationAccess: true
    });

  } catch (error: any) {
    console.error('❌ [COLLABORATION] Token verification failed:', error);
    res.status(500).json({ error: 'Failed to verify collaboration access' });
  }
});
```

## Recommended Approach

### Step 1: Identify the Real Issue
Run the debug query in production to see:
1. Does booking 108 exist?
2. Does it have a collaboration_token?
3. Does the token match?

### Step 2: Verify Service Role
Check that `SUPABASE_SERVICE_KEY_PROD` in production environment is the **service_role** key, not anon key.

The service role should already bypass RLS. If it's not working, there's a configuration issue.

### Step 3: If Service Role is Correct
The issue is likely a **token mismatch** or **booking doesn't exist**, not an RLS problem. Check application logs for the actual error.

### Step 4: Implement RPC Function (Optional)
If you want extra security and explicit token validation, implement the RPC function approach above. This provides a dedicated, RLS-bypassing pathway for collaboration access.

## Quick Test

To test if this is an RLS issue or something else, temporarily disable RLS on bookings in production:

```sql
-- TEMPORARY: Disable RLS to test
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Test the collaboration link
-- Does it work now?

-- IMPORTANT: Re-enable RLS after testing!
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
```

**If the collaboration link works with RLS disabled:**
→ The service role isn't being used correctly
→ Implement the RPC function solution above

**If the collaboration link still fails with RLS disabled:**
→ Not an RLS issue at all
→ Token mismatch or booking doesn't exist
→ Check application logs and database data

## Production Rollback Plan

If RLS is causing issues in production and you need immediate relief:

```sql
-- Temporarily disable RLS on bookings only
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
```

Then investigate and implement the proper fix (RPC function or service role configuration).

## Long-Term Solution

The RPC function approach (Solution 4) is the most robust because:
- ✅ Explicitly handles collaboration token validation
- ✅ Bypasses RLS with SECURITY DEFINER
- ✅ Works regardless of service role configuration
- ✅ Provides a clear, auditable access path
- ✅ Can be extended with rate limiting, logging, etc.
