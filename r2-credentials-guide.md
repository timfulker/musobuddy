# Get Correct R2 Credentials

## Current Issue
We're using a Workers API token, but R2 needs separate Access Key ID and Secret Access Key.

## Steps to Get Correct Credentials

1. **Go to Cloudflare Dashboard** → R2 Object Storage
2. **Click "Manage R2 API tokens"** 
3. **Create New Token**:
   - Type: **"R2 Token"** (NOT "Workers R2 Storage")
   - Permissions: **Object Read & Write**
   - Bucket: **musobuddy-documents** (or all buckets)
   - TTL: **No expiry**

4. **After creation, you'll see TWO values**:
   ```
   Access Key ID: [shorter value, like: abc123def456]
   Secret Access Key: [longer value, like: xyz789abc123def456ghi789]
   ```

5. **Provide both values** - I'll update the configuration immediately

The current Workers token `Hkmu_3Tbqq2DYHLo24b8oMAoV2vHbLcGTOOFHq` won't work for R2 object storage operations.

Ready for the correct credentials when you have them.